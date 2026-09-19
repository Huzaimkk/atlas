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

export type VerificationLevel = 'verified' | 'pattern' | 'conflicting'

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

export interface EligibilityRules {
  citizenship_allowed?: string[]
  citizenship_excluded?: string[]
  degree_level?: string[]
  age_cap?: number
  language_test?: { test: 'IELTS' | 'TOEFL'; min_score: number }
  gre_required?: boolean
  gender_restriction?: string
  region_restriction?: string
  notes?: string
}

export type RequirementType =
  | 'sop'
  | 'lor'
  | 'transcript'
  | 'research_proposal'
  | 'writing_sample'
  | 'gre'
  | 'language_test'
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
  institution: string
  country?: string
  region?: string
  supervisor?: Supervisor
  field_tags: string[]
  funding?: FundingDetails
  eligibility: EligibilityRules
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
  reason?: string // required narrative for BLOCKED (spec §5.1)
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
  }
  credentials: {
    degrees: { name: string; institution: string; date: string; cgpa?: string }[]
    language_test?: { test: 'IELTS' | 'TOEFL'; score: number; status: 'taken' | 'registered' | 'not_started' }
    gre?: { status: 'taken' | 'registered' | 'not_started'; verbal?: number; quant?: number; awa?: number }
    certifications: string[]
  }
  research_fingerprint: string[] // 5-8 subfields, spec §3
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
}

// ---- Archive ---------------------------------------------------------------

export interface ArchiveEntry {
  opportunity: Opportunity
  verdict: Verdict
  archived_reason: 'expired' | 't1_cap_displaced' | 'withdrawn'
  archived_at: string
}
