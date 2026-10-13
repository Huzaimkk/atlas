// Channel B target registry (atlas-v2-spec1.md §9b). Static config, not
// data — see 0004_channel_b_crawl_state.sql's header for why this isn't a
// database table.
//
// Every `kind` here was confirmed live before being wired in, not assumed
// from the target's name or category:
//   - wp_rest: confirmed via GET <base>/wp-json/wp/v2/posts returning real
//     post JSON (opportunitiesforyouth, opportunitydesk, scholars4dev,
//     opportunitiescorners).
//   - html: confirmed the listing page server-renders real item links in
//     the initial HTML (no JS execution needed) — scholarshipscentral.com
//     is a Next.js SSR site whose own wp-json/feed both 403/404; jobrxiv.org
//     IS WordPress but its `job_listing` CPT isn't exposed over REST or its
//     feed (that feed is the empty default post feed, not jobs) — its
//     homepage/listing HTML does carry direct /job/<slug> links, so it's
//     scraped the same way.
//   - unresolved: every path tried (wp-json, /feed/, a guessed RSS path,
//     the guessed job-board subdomain) either 403'd, 404'd, or didn't
//     resolve, even with a browser User-Agent. Rather than wire a URL that
//     was never actually confirmed to work — which would silently return
//     zero items indistinguishable from "no new posts" — these are left
//     unresolved and reported as such by the ingest run. Needs manual
//     research into the real endpoint before they can be wired.
export type ChannelBSourceKind = 'wp_rest' | 'rss' | 'html' | 'unresolved'

export interface ChannelBSource {
  key: string
  name: string
  baseUrl: string
  kind: ChannelBSourceKind
  /** For 'html': the page to scrape for item links. For 'rss': the feed URL. */
  listingUrl?: string
  /**
   * For 'html': confirmed-against-live-markup selectors for one repeating
   * listing card. Required in practice — without these, scraping falls
   * back to using an anchor's own text as the title, which is wrong on
   * both current html sources (jobrxiv's card anchor wraps the whole
   * card; scholarshipscentral's card link text is just "View
   * scholarship", with the real title in a sibling heading).
   */
  cardSelector?: string
  titleSelector?: string
  linkSelector?: string
  notes?: string
}

export const CHANNEL_B_SOURCES: ChannelBSource[] = [
  { key: 'opportunitiesforyouth', name: 'Opportunities For Youth', baseUrl: 'https://opportunitiesforyouth.org', kind: 'wp_rest' },
  { key: 'opportunitydesk', name: 'Opportunity Desk', baseUrl: 'https://opportunitydesk.org', kind: 'wp_rest' },
  { key: 'scholars4dev', name: 'Scholars4Dev', baseUrl: 'https://www.scholars4dev.com', kind: 'wp_rest' },
  { key: 'opportunitiescorners', name: 'Opportunities Corners', baseUrl: 'https://opportunitiescorners.com', kind: 'wp_rest' },
  {
    key: 'scholarshipscentral',
    name: 'Scholarships Central',
    baseUrl: 'https://www.scholarshipscentral.com',
    kind: 'html',
    listingUrl: 'https://www.scholarshipscentral.com/',
    cardSelector: 'article.sc-directory-card',
    titleSelector: 'h3.sc-heading',
    linkSelector: 'a.sc-button-primary',
    notes: 'Not WordPress despite the name — Next.js SSR site. wp-json 403s (Vercel bot mitigation), /feed/ 404s. Scraped from server-rendered homepage HTML; selectors confirmed against live markup.',
  },
  {
    key: 'jobrxiv',
    name: 'jobRxiv',
    baseUrl: 'https://jobrxiv.org',
    kind: 'html',
    listingUrl: 'https://jobrxiv.org/',
    cardSelector: 'li.job_listing',
    titleSelector: 'h4',
    linkSelector: 'a',
    notes: "Is WordPress, but the job_listing CPT isn't REST-exposed (404) and /feed/ is the empty default post feed, not jobs. Built on WP Job Manager — each li.job_listing wraps the whole card in one <a>, with the real title in a nested <h4> (plus a trailing 'Full-time'/'NEW' badge span that must be stripped, not the whole card's text). Selectors confirmed against live markup.",
  },
  {
    key: 'euraxess',
    name: 'EURAXESS',
    baseUrl: 'https://euraxess.ec.europa.eu',
    kind: 'unresolved',
    notes: 'Job search is a client-rendered app at /jobs/search; no public feed/API endpoint confirmed by probing. Needs manual research.',
  },
  {
    key: 'findaphd',
    name: 'FindAPhD',
    baseUrl: 'https://www.findaphd.com',
    kind: 'unresolved',
    notes: 'Default UA gets 403 on the homepage; a browser UA gets through on the homepage but the RSS search endpoint (/search/PhDs.aspx?Rss=1 -> /phds/PhDs.aspx?Rss=1) still 403s — looks session/anti-bot gated. Needs manual research.',
  },
  {
    key: 'academicjobsonline',
    name: 'AcademicJobsOnline',
    baseUrl: 'https://academicjobsonline.org',
    kind: 'unresolved',
    notes: 'Legacy ASP-style app; no feed/API found by probing. Needs manual research.',
  },
  {
    key: 'naturecareers',
    name: 'Nature Careers',
    baseUrl: 'https://www.nature.com',
    kind: 'unresolved',
    notes: "nature.com/subjects/careers is an editorial RSS feed (career-topic articles), not the job board. The actual job-board subdomain guessed (naturecareers.nature.com) doesn't resolve. Needs the real job-board URL before this can be wired.",
  },
]
