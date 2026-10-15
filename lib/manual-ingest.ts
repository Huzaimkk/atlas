import 'server-only'
import * as cheerio from 'cheerio'
import { diagnoseOne, loadProfileFacts, type DiagnosisResult } from '@/lib/diagnostic-engine'
import { supabaseAdmin } from '@/lib/supabase'
import type { EligibilityRule, Opportunity, Requirement } from '@/types/atlas'

// Manual add (Phase B / spec §9e): paste an opportunity's text or a URL,
// extract it into the §4 schema, classify each eligibility rule mechanical
// vs discretionary with a quote + source, diagnose it against the current
// profile, and only then let the user confirm the save. This is the one
// place in the app that does free-form extraction from arbitrary prose —
// everywhere else either reads structured DB rows or (Channel B) scrapes
// known, fixed markup. That makes it the one place a hallucinated rule or
// invented figure could slip in silently, so every claim here is checked
// against the source text mechanically, not just asked of the model nicely.

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36'

const EXTRACT_SYSTEM_PROMPT = `You extract a funded-opportunity listing into a structured schema from raw text a user pasted.

Hard rules:
- Only include a field when the given text explicitly states it. Omit anything you'd otherwise have to guess or infer from general knowledge — never fill in a plausible-sounding deadline, funding figure, or institution.
- For eligibility_rules, source_quote MUST be an exact, verbatim substring copied from the provided text — never paraphrased, never summarized. If you cannot find a literal quote supporting a rule, do not include that rule at all.
- rule_type: 'mechanical' only for a binary, checkable condition (citizenship, a specific degree held, an enrollment status). Anything softer — "normally requires", "preferred", "typically", "usually" — is 'discretionary'.
- If the text doesn't look like a funded opportunity listing at all, still call the tool, but only with whatever title/institution you can find — never fabricate a whole listing from nothing.`

const EXTRACT_TOOL = {
  name: 'extract_opportunity',
  description: "Extract a funded-opportunity listing into Atlas's schema. Omit any field with no explicit textual support.",
  input_schema: {
    type: 'object' as const,
    properties: {
      title: { type: 'string' },
      institution: { type: 'string' },
      track: { type: 'string', enum: ['phd_funded', 'gta', 'ra', 'postdoc', 'scholarship', 'fellowship', 'conference', 'internship', 'accelerator'] },
      category: { type: 'number', description: '1-9, per the nine canonical categories' },
      degree_levels_accepted: { type: 'array', items: { type: 'string' } },
      field_tags: { type: 'array', items: { type: 'string' } },
      stipend_amount: { type: 'number' },
      stipend_currency: { type: 'string' },
      stipend_period: { type: 'string', enum: ['year', 'month'] },
      tuition: { type: 'string', enum: ['covered', 'partial', 'not_covered'] },
      opens: { type: 'string', description: 'YYYY-MM-DD, only if explicitly stated' },
      deadline: { type: 'string', description: 'YYYY-MM-DD, only if explicitly stated' },
      rolling: { type: 'boolean' },
      requirements: { type: 'array', items: { type: 'object', properties: { label: { type: 'string' } }, required: ['label'] } },
      eligibility_rules: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            rule_text: { type: 'string', description: 'Plain-English restatement of the condition' },
            rule_type: { type: 'string', enum: ['mechanical', 'discretionary'] },
            source_quote: { type: 'string', description: 'Exact verbatim substring copied from the provided text' },
          },
          required: ['rule_text', 'rule_type', 'source_quote'],
        },
      },
    },
    required: ['title', 'institution'],
  },
}

export interface ExtractResult {
  extracted?: Partial<Opportunity>
  error?: string
}

function stripHtml(html: string): string {
  const $ = cheerio.load(html)
  $('script, style, nav, footer, header').remove()
  return $('body').text().replace(/\s+/g, ' ').trim()
}

/** Fetches a pasted URL and reduces it to plain text — same purpose as Channel B's fetchItemPage, duplicated rather than shared since this one also needs to strip tags into text, not just hand back raw HTML. */
export async function fetchRawText(url: string): Promise<string> {
  const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT }, signal: AbortSignal.timeout(15_000) })
  if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${url}`)
  return stripHtml(await res.text())
}

export async function extractFromText(rawText: string, sourceUrl: string | null): Promise<ExtractResult> {
  const apiKey = process.env.COMET_API_KEY
  const apiUrl = process.env.COMET_API_URL || 'https://api.cometapi.com/v1/messages'
  if (!apiKey) return { error: 'COMET_API_KEY not configured' }

  let res: Response
  try {
    res = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        system: EXTRACT_SYSTEM_PROMPT,
        messages: [{ role: 'user', content: rawText.slice(0, 12_000) }],
        tools: [EXTRACT_TOOL],
        tool_choice: { type: 'tool', name: 'extract_opportunity' },
      }),
    })
  } catch (err) {
    return { error: `Extraction request failed: ${String(err)}` }
  }
  if (!res.ok) return { error: `CometAPI error ${res.status}: ${await res.text()}` }

  const data = await res.json()
  const toolUse = (data.content ?? []).find((b: { type: string }) => b.type === 'tool_use') as { input?: Record<string, unknown> } | undefined
  if (!toolUse?.input) return { error: 'Model did not return structured output' }

  const raw = toolUse.input
  const lowerText = rawText.toLowerCase()

  // Defense in depth, not just a prompt instruction: a rule whose quote
  // isn't actually found in the source text is dropped outright, never
  // trusted on the model's word alone (spec §5.6's standard of proof,
  // applied one step earlier — before the rule ever reaches a pool row).
  const eligibilityRules: EligibilityRule[] = ((raw.eligibility_rules as Array<{ rule_text?: string; rule_type?: string; source_quote?: string }>) ?? [])
    .filter((r) => r.source_quote && r.rule_text && (r.rule_type === 'mechanical' || r.rule_type === 'discretionary') && lowerText.includes(r.source_quote.toLowerCase()))
    .map((r) => ({ rule_text: r.rule_text!, rule_type: r.rule_type as 'mechanical' | 'discretionary', source_quote: r.source_quote!, source_url: sourceUrl ?? '' }))

  const requirements: Requirement[] = ((raw.requirements as Array<{ label?: string }>) ?? [])
    .filter((r) => r.label)
    .map((r) => ({ type: 'other', label: r.label!, satisfied: false }))

  const extracted: Partial<Opportunity> = {
    title: String(raw.title ?? '').trim(),
    institution: String(raw.institution ?? '').trim(),
    degree_levels_accepted: (raw.degree_levels_accepted as string[])?.filter(Boolean) ?? [],
    field_tags: (raw.field_tags as string[])?.filter(Boolean) ?? [],
    rolling: Boolean(raw.rolling),
    requirements,
    eligibility_rules: eligibilityRules,
  }
  if (raw.track) extracted.track = raw.track as Opportunity['track']
  if (raw.category) extracted.category = raw.category as Opportunity['category']
  if (raw.opens) extracted.opens = String(raw.opens)
  if (raw.deadline) extracted.deadline = String(raw.deadline)
  if (raw.stipend_amount) {
    extracted.funding = {
      stipend: { amount: Number(raw.stipend_amount), currency: String(raw.stipend_currency ?? 'USD'), period: (raw.stipend_period as 'year' | 'month') ?? 'year' },
      ...(raw.tuition ? { tuition: raw.tuition as 'covered' | 'partial' | 'not_covered' } : {}),
    }
  }

  return { extracted }
}

function normalizeUrl(url: string): string {
  return url.replace(/\/$/, '').split('?')[0]
}

/** Same dedupe shape as Channel B (lib/channel-b/ingest.ts) — exact source_url match, then a title fallback — reused rather than re-derived since it's the same question asked by a different entry point. */
export async function findDedupeMatch(title: string, sourceUrl: string | null): Promise<string | null> {
  if (sourceUrl) {
    const { data } = await supabaseAdmin.from('opportunities').select('id').eq('source_url', normalizeUrl(sourceUrl)).maybeSingle()
    if (data) return data.id
  }
  if (title) {
    const { data } = await supabaseAdmin.from('opportunities').select('id').ilike('title', title).maybeSingle()
    if (data) return data.id
  }
  return null
}

/** Fills in the same defaults Channel B's ingest uses for fields a lightweight extraction can't responsibly guess, so diagnoseOne() has a complete Opportunity to evaluate. Preview-only — never persisted as-is. */
export async function previewDiagnosis(partial: Partial<Opportunity>, sourceUrl: string | null): Promise<DiagnosisResult> {
  const { data: snapshot, error } = await supabaseAdmin.from('profile_snapshots').select('*').eq('is_current', true).single()
  if (error || !snapshot) throw new Error(`No current profile snapshot: ${error?.message}`)
  const facts = await loadProfileFacts(snapshot)

  const full: Opportunity = {
    id: 'preview',
    title: partial.title ?? '',
    track: partial.track ?? 'scholarship',
    category: partial.category ?? 2,
    integrated_phd_fast_track: false,
    institution: partial.institution ?? '',
    field_tags: partial.field_tags ?? [],
    degree_levels_accepted: partial.degree_levels_accepted ?? [],
    eligibility_rules: partial.eligibility_rules ?? [],
    requirements: partial.requirements ?? [],
    opens: partial.opens,
    deadline: partial.deadline,
    rolling: partial.rolling ?? false,
    status: partial.deadline && new Date(partial.deadline) < new Date() ? 'expired' : partial.rolling ? 'rolling' : 'open',
    tier: 'T3',
    source_url: sourceUrl ?? '',
    source_type: 'manual',
    verification_level: 'unverified',
    origin: sourceUrl ? 'manual' : 'txt',
    funding: partial.funding,
  }

  return diagnoseOne(full, facts)
}
