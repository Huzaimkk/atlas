import 'server-only'
import { supabaseAdmin } from '@/lib/supabase'
import { CHANNEL_B_SOURCES, type ChannelBSource } from './sources'
import { fetchWpRest, scrapeHtmlListing, fetchItemPage, resolveOfficialLink, type RawItem } from './extract'
import { extractFingerprintKeywords, isRelevant, type FingerprintKeywords } from './fingerprint-filter'
import { diagnoseOpportunity } from '@/lib/diagnostic-engine'

const SEEN_ID_CAP = 300
// Resolving an official link costs a second live fetch per relevant item
// (confirmed this takes several seconds per item against jobrxiv.org,
// which has no secondary-fetch-free resolution path). Capping bounds one
// slow source's worst case rather than letting a single run balloon —
// measured ~8.5 minutes for all 10 sources before this cap existed.
const MAX_RESOLVE_ATTEMPTS_PER_SOURCE = 15

interface CrawlStateRow {
  source_key: string
  last_seen_at: string | null
  seen_external_ids: string[]
}

async function loadCrawlState(sourceKey: string): Promise<CrawlStateRow> {
  const { data } = await supabaseAdmin.from('crawl_state').select('source_key, last_seen_at, seen_external_ids').eq('source_key', sourceKey).maybeSingle()
  return data ?? { source_key: sourceKey, last_seen_at: null, seen_external_ids: [] }
}

export interface SourceRunResult {
  sourceKey: string
  status: 'ok' | 'error' | 'unresolved'
  itemsFound: number
  itemsInserted: number
  itemsSkippedIrrelevant: number
  itemsSkippedDuplicate: number
  itemsSkippedNoOfficialLink: number
  insertedTitles: string[]
  error?: string
}

/** Classifies a raw item's title into the opportunities schema's fixed `track`/`category` enums — best-effort keyword sniff, same convention as the command bar's add_opportunity_from_search. Never invents eligibility, funding, or institution details beyond this. */
function classify(title: string): { track: string; category: number } {
  const t = title.toLowerCase()
  if (/\bpostdoc/.test(t)) return { track: 'postdoc', category: 3 }
  if (/\bphd\b|\bdoctoral\b/.test(t)) return { track: 'phd_funded', category: 3 }
  if (/\binternship\b/.test(t)) return { track: 'internship', category: 5 }
  if (/\bfellowship\b/.test(t)) return { track: 'fellowship', category: 2 }
  return { track: 'scholarship', category: 2 }
}

// Opportunities are always inserted with this same normalization applied
// to source_url (see processItems below) — dedupeKeyExists compares
// against that normalized form, never the raw resolved URL, so a
// trailing-slash or query-string difference between two resolutions of
// the same official page can't produce two rows for one programme.
function normalizeUrl(url: string): string {
  return url.replace(/\/$/, '').split('?')[0]
}

async function dedupeKeyExists(normalizedOfficialUrl: string, title: string): Promise<boolean> {
  const { data: byUrl } = await supabaseAdmin.from('opportunities').select('id').eq('source_url', normalizedOfficialUrl).maybeSingle()
  if (byUrl) return true
  const { data: byTitle } = await supabaseAdmin.from('opportunities').select('id').ilike('title', title).maybeSingle()
  return !!byTitle
}

async function processItems(source: ChannelBSource, items: RawItem[], keywords: FingerprintKeywords, state: CrawlStateRow) {
  const seenSet = new Set(state.seen_external_ids)
  const result: SourceRunResult = {
    sourceKey: source.key, status: 'ok', itemsFound: items.length, itemsInserted: 0,
    itemsSkippedIrrelevant: 0, itemsSkippedDuplicate: 0, itemsSkippedNoOfficialLink: 0,
    insertedTitles: [],
  }
  const newSeenIds: string[] = []
  let resolveAttempts = 0

  for (const item of items) {
    if (seenSet.has(item.externalId)) continue
    newSeenIds.push(item.externalId)

    if (!isRelevant(`${item.title} ${item.excerptText}`, keywords)) {
      result.itemsSkippedIrrelevant++
      continue
    }

    if (resolveAttempts >= MAX_RESOLVE_ATTEMPTS_PER_SOURCE) continue
    resolveAttempts++

    let contentHtml = item.contentHtml
    if (!contentHtml) {
      try {
        contentHtml = await fetchItemPage(item.aggregatorUrl)
      } catch {
        result.itemsSkippedNoOfficialLink++
        continue
      }
    }

    const aggregatorHost = new URL(item.aggregatorUrl).hostname
    const resolvedUrl = resolveOfficialLink(contentHtml, aggregatorHost)
    if (!resolvedUrl) {
      result.itemsSkippedNoOfficialLink++
      continue
    }
    const officialUrl = normalizeUrl(resolvedUrl)

    if (await dedupeKeyExists(officialUrl, item.title)) {
      result.itemsSkippedDuplicate++
      continue
    }

    const { track, category } = classify(item.title)
    const { data: row, error } = await supabaseAdmin
      .from('opportunities')
      .insert({
        title: item.title,
        track,
        category,
        integrated_phd_fast_track: false,
        institution: new URL(officialUrl).hostname,
        field_tags: [],
        degree_levels_accepted: [],
        eligibility_rules: [],
        requirements: [{ label: 'Resolve against official programme page', satisfied: false }],
        rolling: false,
        status: 'open',
        tier: 'T3',
        apply_url: officialUrl,
        source_url: officialUrl,
        source_type: 'aggregator',
        verification_level: 'unverified',
        scam_risk: false,
        origin: 'search',
      })
      .select('id, title')
      .single()

    if (error) {
      result.status = 'error'
      result.error = error.message
      continue
    }
    result.itemsInserted++
    result.insertedTitles.push(row.title)
    await diagnoseOpportunity(row.id)
  }

  const mergedSeen = [...newSeenIds, ...state.seen_external_ids].slice(0, SEEN_ID_CAP)
  await supabaseAdmin
    .from('crawl_state')
    .upsert({
      source_key: source.key,
      seen_external_ids: mergedSeen,
      last_seen_at: new Date().toISOString(),
      last_run_at: new Date().toISOString(),
      last_run_status: result.status,
      last_run_error: result.error ?? null,
      last_run_items_found: result.itemsFound,
      last_run_items_inserted: result.itemsInserted,
      last_run_items_skipped_irrelevant: result.itemsSkippedIrrelevant,
      last_run_items_skipped_duplicate: result.itemsSkippedDuplicate,
      last_run_items_skipped_no_official_link: result.itemsSkippedNoOfficialLink,
      updated_at: new Date().toISOString(),
    })

  return result
}

export async function runChannelBSource(source: ChannelBSource, keywords: FingerprintKeywords): Promise<SourceRunResult> {
  if (source.kind === 'unresolved') {
    await supabaseAdmin.from('crawl_state').upsert({
      source_key: source.key, last_run_at: new Date().toISOString(), last_run_status: 'unresolved',
      last_run_error: source.notes ?? 'No confirmed fetch method', updated_at: new Date().toISOString(),
    })
    return {
      sourceKey: source.key, status: 'unresolved', itemsFound: 0, itemsInserted: 0,
      itemsSkippedIrrelevant: 0, itemsSkippedDuplicate: 0, itemsSkippedNoOfficialLink: 0,
      insertedTitles: [], error: source.notes,
    }
  }

  const state = await loadCrawlState(source.key)
  try {
    const items = source.kind === 'wp_rest' ? await fetchWpRest(source) : await scrapeHtmlListing(source)
    return await processItems(source, items, keywords, state)
  } catch (err) {
    await supabaseAdmin.from('crawl_state').upsert({
      source_key: source.key, last_run_at: new Date().toISOString(), last_run_status: 'error',
      last_run_error: String(err), updated_at: new Date().toISOString(),
    })
    return {
      sourceKey: source.key, status: 'error', itemsFound: 0, itemsInserted: 0,
      itemsSkippedIrrelevant: 0, itemsSkippedDuplicate: 0, itemsSkippedNoOfficialLink: 0,
      insertedTitles: [], error: String(err),
    }
  }
}

/** Runs every registered Channel B source (sequentially — polite to the aggregators, and these are low-volume per run) against the current profile's research fingerprint. */
export async function runChannelBIngest(): Promise<SourceRunResult[]> {
  const { data: snapshot, error } = await supabaseAdmin.from('profile_snapshots').select('research_fingerprint').eq('is_current', true).single()
  if (error || !snapshot) throw new Error(`No current profile snapshot: ${error?.message}`)
  const keywords = extractFingerprintKeywords(snapshot.research_fingerprint)

  const results: SourceRunResult[] = []
  for (const source of CHANNEL_B_SOURCES) {
    results.push(await runChannelBSource(source, keywords))
  }
  return results
}
