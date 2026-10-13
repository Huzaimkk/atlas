import 'server-only'
import * as cheerio from 'cheerio'
import type { AnyNode } from 'domhandler'
import type { ChannelBSource } from './sources'

// Fetched items are normalized to this shape regardless of source kind.
// `contentHtml` is only populated when the fetch already returned full
// post body (WP REST) — for 'html' sources it stays undefined until
// resolveOfficialLink's caller fetches the item's own page.
export interface RawItem {
  externalId: string
  title: string
  aggregatorUrl: string
  publishedAt: string | null
  excerptText: string
  contentHtml?: string
}

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36'

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
}

async function fetchText(url: string, timeoutMs = 15_000): Promise<string> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT }, signal: controller.signal })
    if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${url}`)
    return await res.text()
  } finally {
    clearTimeout(timer)
  }
}

/** WP REST: GET <base>/wp-json/wp/v2/posts, newest first, with full content so the official link can be resolved from the body without a second fetch. */
export async function fetchWpRest(source: ChannelBSource, perPage = 20): Promise<RawItem[]> {
  const url = `${source.baseUrl}/wp-json/wp/v2/posts?per_page=${perPage}&orderby=date&order=desc&_fields=id,date,link,title,excerpt,content`
  const text = await fetchText(url)
  const posts = JSON.parse(text) as Array<{
    id: number
    date: string
    link: string
    title?: { rendered?: string }
    excerpt?: { rendered?: string }
    content?: { rendered?: string }
  }>
  return posts.map((p) => ({
    externalId: String(p.id),
    title: stripHtml(p.title?.rendered ?? ''),
    aggregatorUrl: p.link,
    publishedAt: p.date ? new Date(p.date).toISOString() : null,
    excerptText: stripHtml(p.excerpt?.rendered ?? ''),
    contentHtml: p.content?.rendered,
  }))
}

/** Cheerio's own .text() on a heading also pulls in nested elements' text (e.g. jobrxiv's <h4>Title <span>Full-time</span></h4> would return "Title Full-time") — this takes only the heading's own direct text nodes. */
function directText(el: cheerio.Cheerio<AnyNode>): string {
  return el
    .clone()
    .children()
    .remove()
    .end()
    .text()
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * HTML listing scrape (scholarshipscentral.com, jobrxiv.org) — no working
 * WP REST or feed on either (see sources.ts notes), so this reads whatever
 * the server-rendered listing page actually contains, using selectors
 * confirmed against each site's live markup: one repeating card
 * (`cardSelector`), its title (`titleSelector`, direct text only — both
 * sites nest badges/spans inside the heading that must not bleed into the
 * title), and its link (`linkSelector`).
 */
export async function scrapeHtmlListing(source: ChannelBSource): Promise<RawItem[]> {
  if (!source.listingUrl || !source.cardSelector || !source.titleSelector || !source.linkSelector) {
    throw new Error(`${source.key}: kind 'html' requires listingUrl, cardSelector, titleSelector and linkSelector`)
  }
  const html = await fetchText(source.listingUrl)
  const $ = cheerio.load(html)
  const seen = new Set<string>()
  const items: RawItem[] = []

  $(source.cardSelector).each((_, cardEl) => {
    const card = $(cardEl)
    const href = card.find(source.linkSelector!).first().attr('href')
    const title = directText(card.find(source.titleSelector!).first())
    if (!href || !title) return

    let abs: URL
    try {
      abs = new URL(href, source.baseUrl)
    } catch {
      return
    }
    const key = abs.toString()
    if (seen.has(key)) return
    seen.add(key)

    items.push({ externalId: key, title, aggregatorUrl: key, publishedAt: null, excerptText: title })
  })

  return items
}

/** Second fetch for 'html'-kind items that passed the relevance filter — fetches the item's own page so resolveOfficialLink has a body to search. */
export async function fetchItemPage(url: string): Promise<string> {
  return fetchText(url)
}

const LINK_DENYLIST_HOSTS = [
  'facebook.com', 'www.facebook.com', 'twitter.com', 'x.com', 'linkedin.com', 'www.linkedin.com',
  'pinterest.com', 'wa.me', 'api.whatsapp.com', 't.me', 'reddit.com', 'www.reddit.com',
  'telegram.me', 'instagram.com', 'youtube.com', 'feedburner.com', 'google.com', 'googletagmanager.com',
  'googlesyndication.com', 'doubleclick.net', 'gravatar.com', 'wordpress.com', 'wp.com', 'jetpack.com',
]

/**
 * The actual "resolve to the official programme page" step (§9d step 4) —
 * finds the first outbound link in a post body that isn't the aggregator's
 * own domain and isn't a share/social/ad/CMS-asset link. First-in-document
 * order, since in practice the real apply/programme link tends to appear
 * before internal "see also" / category footer links (verified against a
 * live sample: an "apply here" link came first, an internal category link
 * came last). Returns null — never a guess — if nothing qualifies, which
 * means the item gets skipped rather than inserted with the aggregator
 * itself as source_url (spec §4: "source_url must be primary... never
 * citation").
 */
export function resolveOfficialLink(html: string, aggregatorHost: string): string | null {
  const $ = cheerio.load(html)
  let found: string | null = null
  $('a[href]').each((_, el) => {
    if (found) return
    const href = $(el).attr('href')
    if (!href) return
    let abs: URL
    try {
      abs = new URL(href, `https://${aggregatorHost}`)
    } catch {
      return
    }
    if (abs.protocol !== 'http:' && abs.protocol !== 'https:') return
    if (abs.hostname === aggregatorHost) return
    if (LINK_DENYLIST_HOSTS.some((h) => abs.hostname === h || abs.hostname.endsWith(`.${h}`))) return
    found = abs.toString()
  })
  return found
}
