// Atlas v2 domain schema — atlas-v2-spec1.md §3, §4, §5, §7, §9b, §9e.
// This supersedes the pre-v2 shapes in types/index.ts for every new view;
// those stay only until Phase 7 re-points the 8 agent tools (spec §9).

export type Track =
  | 'phd_funded'
  | 'gta'
  | 'ra'
  | 'postdoc'
  | 'scholarship'
  | 'fellowship'
  | 'conference'
  | 'internship'
  | 'accelerator'

/** §4b — the nine canonical categories. A tenth, "Notes & Inspiration", sits outside the pool. */
export type Category = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9

export const CATEGORY_LABELS: Record<Category, string> = {
  1: 'AI safety / AI research fellowships',
  2: "Fully funded master's & PhD scholarships",
  3: 'Fully funded PhD programs & industry PhD fellowships',
  4: 'Professor-led funded positions',
  5: 'Research internships',
  6: 'Founder, builder & startup programs',
  7: 'Conferences & CFPs',
  8: 'Postdoctoral fellowships',
  9: 'Pattern-based annual cycles',
}

export type Status = 'not_yet_open' | 'open' | 'closing_soon' | 'expired' | 'rolling'

export type Tier = 'T1' | 'T2' | 'T3'

export type SourceType = 'official' | 'aggregator' | 'social' | 'manual'

// 'unverified' added by migration 0003 (command bar's add_opportunity_from_search
// and Channel B both insert rows at this level) — the DB CHECK constraint
// was updated there; this type previously wasn't, so inserts using it
// outside of untyped object literals silently escaped the type checker.
export type VerificationLevel = 'verified' | 'pattern' | 'conflicting' | 'unverified'

export type Origin = 'screenshot' | 'pdf' | 'txt' | 'search' | 'manual'

export interface Supervisor {
  name: string
  email?: string
  lab_url?: string
}

export interface FundingDetails {
  stipend?: { amount: number; currency: string; period: 'year' | 'month' }
  tuition?: 'covered' | 'partial' | 'not_covered'
  insurance?: boolean
  travel?: boolean
  notes?: string
}

export type RuleType = 'mechanical' | 'discretionary'

/**
 * One structured eligibility rule, independently classified (profile v5
 * §5.7). Only a 'mechanical' rule may ever justify a BLOCKED verdict — a
 * 'discretionary' one ("normally requires...", "preferred...") can at
 * most produce GAP. source_quote + source_url are required whenever this
 * rule is the basis for BLOCKED (v5 §5.6's standard of proof).
 */
export interface EligibilityRule {
  rule_text: string
  rule_type: RuleType
  source_quote: string
  source_url: string
}

export type RequirementType =
  | 'sop'
  | 'lor'
  | 'transcript'
  | 'research_proposal'
  | 'writing_sample'
  | 'gre'
  | 'language_test'
  | 'aptitude_test' // e.g. HEC's HAT — distinct from language_test/gre, a specific national exam
  | 'cv'
  | 'portfolio'
  | 'other'

export interface Requirement {
  type: RequirementType
  label: string
  count?: number
  satisfied: boolean
}

export interface Opportunity {
  id: string
  title: string
  track: Track
  category: Category
  // Cross-cutting tag independent of `category` — UK CDTs, Max Planck
  // Schools, IMPRS, OIST's 5-year integrated PhD, Canadian direct-entry
  // (profile v5 §7): funded doctoral routes built for bachelor's holders.
  integrated_phd_fast_track: boolean
  institution: string
  country?: string
  region?: string
  supervisor?: Supervisor
  field_tags: string[]
  funding?: FundingDetails
  // Per-row, never per-country (profile v5 §5.1 correction). Empty array
  // means unstated/ambiguous on the programme's own page — the engine
  // must treat that as GAP (verify entry route), never BLOCKED.
  degree_levels_accepted: string[]
  eligibility_rules: EligibilityRule[]
  requirements: Requirement[]
  opens?: string
  deadline?: string
  rolling?: boolean
  status: Status
  tier: Tier
  apply_url?: string
  source_url: string
  verified_on?: string
  source_type: SourceType
  verification_level: VerificationLevel
  scam_risk?: boolean
  origin: Origin
}

export type VerdictType =
  | 'READY'
  | 'GAP'
  | 'BLOCKED'
  | 'IRRELEVANT'
  | 'LATE_WINDOW'
  | 'EXPIRED'
  | 'NOT_YET_OPEN'

export type GapType = 'credential' | 'document' | 'endorsement' | 'record' | 'experience' | 'contact'

export const GAP_TYPE_LABELS: Record<GapType, string> = {
  credential: 'Credential',
  document: 'Document',
  endorsement: 'Endorsement',
  record: 'Record',
  experience: 'Experience',
  contact: 'Contact',
}

/** A single missing item scoped to one opportunity's verdict (spec §5.2). */
export interface OpportunityGap {
  type: GapType
  label: string
  time_estimate?: string
  cost_estimate?: string
}

export interface Verdict {
  opportunity_id: string
  type: VerdictType
  snapshot_version: number
  rule_type?: RuleType // profile v5 §5.7 — only 'mechanical' may ever justify BLOCKED
  reason?: string // narrative, any verdict type
  // Required together whenever type === 'BLOCKED' (profile v5 §5.6 standard
  // of proof) — enforced at the DB level too, not just here.
  blocking_rule_quote?: string
  blocking_rule_source_url?: string
  gaps?: OpportunityGap[] // populated when type === 'GAP'
  fit_score?: number // 0-100, only meaningful once eligibility passes (spec §5.4)
  computed_at: string
}

/** Aggregated row for the Gap Queue (spec §5.3) — one per distinct gap across the whole pool. */
export interface AggregatedGap {
  id: string
  type: GapType
  label: string
  unblock_count: number
  opportunity_ids: string[]
  time_estimate: string
  cost_estimate: string
  priority: 'start_now' | 'agent_assisted' | 'low_priority'
}

// ---- Layer 1 — Profile Engine (spec §3) ----------------------------------

/** A paper, credential or record in progress — not an achievement until it completes (profile v5 §4). */
export interface PendingItem {
  item: string
  type: GapType
  status: 'in_progress' | 'not_started'
  expected_completion: string | null // null when no date is known yet — never fabricated
  note?: string
}

export interface ProfileSnapshot {
  version: number
  created_at: string
  identity: {
    citizenship: string
    current_degree_level: string
    current_institution: string
    funding_requirement: 'fully_funded_only' | 'flexible'
    term_flexibility: string
    geography: string
    // Master's and PhD tracks run in parallel and both must surface
    // (profile v5 §1) — never collapsed to a single target.
    target_degree_levels: string[]
    // Explicit, self-attested fact (not derived from current_degree_level
    // by guessing) — HEC's own PhD-scholarship gate is stated in these
    // terms directly ("17/18 years Masters/MS/MPhil"), so the engine needs
    // the real number rather than inferring it from a free-text label.
    years_of_education: number
  }
  credentials: {
    degrees: { name: string; institution: string; date: string; cgpa?: string }[]
    certifications: string[]
    // No language_test / gre fields here by design — v5 §4 requires these
    // modeled as pending_items (below) until actually achieved, not as
    // credentials with a score that reads like an accomplished fact.
  }
  research_fingerprint: string[]
  evidence: {
    publications: { title: string; venue: string; authorship: string; date: string }[]
    preprints: string[]
    patents: string[]
    open_source: { name: string; stars?: number; usage?: string }[]
    venture_work: { name: string; role: string; metrics?: string }[]
  }
  teaching_service: { ta_history: string[]; mentoring: string[]; review_work: string[] }
  document_inventory: Record<
    'sop' | 'research_statement' | 'cv' | 'transcripts' | 'lor_commitments' | 'writing_sample' | 'portfolio',
    'ready' | 'draft' | 'missing'
  >
  network: { professor: string; institution: string; date: string; outcome: string }[]
  pending_items: PendingItem[]
  // Backing fields for the post_degree_hours() SQL function — computed at
  // query time against current_date, never stored as a number (v5 §5.5).
  degree_completed_on: string | null
  full_time_hours_per_month: number
}

// ---- Channel C — lab watchlist (spec §7, §9b) -----------------------------

export type WatchlistStatus = 'watching' | 'change_detected' | 'stale'

export interface WatchlistLab {
  id: string
  supervisor: Supervisor
  institution: string
  field_tags: string[]
  page_url: string
  status: WatchlistStatus
  last_fetched_at?: string
  last_change_detected_at?: string
  change_summary?: string
}

// ---- Manual ingest — Inbox (spec §9e) -------------------------------------

export type LeadConfidence = 'unverified' | 'resolving' | 'conflicting' | 'resolved'

export interface InboxLead {
  id: string
  origin: Origin
  raw_excerpt?: string
  extracted: Partial<Opportunity>
  confidence: LeadConfidence
  dropped_at: string
  dedupe_match_id?: string
  source_url?: string
  extraction_error?: string
  /** The verdict computed against the profile at extraction time — shown before the user confirms, and kept as-is afterward rather than silently recomputed. */
  verdict_preview?: { type: VerdictType; reason?: string; fit_score?: number | null; gaps?: OpportunityGap[] }
}

// ---- Archive ---------------------------------------------------------------

export interface ArchiveEntry {
  opportunity: Opportunity
  verdict: Verdict
  archived_reason: 'expired' | 't1_cap_displaced' | 'withdrawn'
  archived_at: string
}
