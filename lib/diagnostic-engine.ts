import 'server-only'
import { supabaseAdmin } from '@/lib/supabase'
import { extractFingerprintKeywords, overlapScore, type FingerprintKeywords } from '@/lib/fingerprint'
import { INVENTORY_KEY } from '@/lib/application-documents'
import type { EligibilityRule, GapClosureCause, GapType, Opportunity, ProfileSnapshot, RequirementType, VerdictType } from '@/types/atlas'

// Same engine Phase 4's one-off script used, promoted to a reusable module
// so both single-opportunity diagnosis (manual entry, item C) and full-pool
// re-diagnosis (profile edits firing spec §5.5's trigger) call one real
// implementation instead of two copies drifting apart.
//
// Only machine-checkable rules produce BLOCKED, and only when rule_type is
// 'mechanical' (v5 §5.7) — age caps and gender-restricted rules stay
// un-evaluated, informational only, because the profile carries no
// birthdate or gender to check them against. Guessing either to manufacture
// a verdict would violate the exact standard §5.6 sets for everything else.

export type EligibilityCheck =
  | { kind: 'post_degree_hours_min'; value: number }
  | { kind: 'enrollment_status_required'; value: 'undergraduate_enrolled' }
  | { kind: 'no_completed_degree_required'; value: true }
  | { kind: 'current_phd_student_required'; value: true }
  | { kind: 'work_auth_countries'; value: string[] }
  | { kind: 'years_of_education_min'; value: number }

const GAP_TYPE_DEFAULTS: Record<GapType, { time_estimate: string; cost_estimate: string }> = {
  credential: { time_estimate: 'weeks to months', cost_estimate: 'costs money' },
  document: { time_estimate: 'hours to days', cost_estimate: 'free — agent-assisted' },
  endorsement: { time_estimate: 'weeks, depends on others', cost_estimate: 'free' },
  record: { time_estimate: 'months, sometimes not closable before deadline', cost_estimate: 'varies' },
  experience: { time_estimate: 'months', cost_estimate: 'varies' },
  contact: { time_estimate: 'days — highest leverage per hour spent', cost_estimate: 'free' },
}

// An unsatisfied requirement's own .type decides what kind of gap it
// becomes — a letter of recommendation depends on someone else's time
// (endorsement), an exam score is a credential, a document an agent can
// draft is... a document. Previously every requirement produced type:
// 'document' regardless, which is how a HAT score (an exam, unblock-count
// aggregated under the wrong bucket) would've landed in the Gap Queue
// mislabeled and mis-prioritized next to things an agent can draft.
const REQUIREMENT_GAP_TYPE: Partial<Record<RequirementType, GapType>> = {
  lor: 'endorsement',
  gre: 'credential',
  language_test: 'credential',
  aptitude_test: 'credential',
}

/**
 * ready_since (migration 0010): first-became-READY timestamp, carried
 * forward across the delete+insert cycle both diagnose paths use. Set
 * fresh (now()) the moment a row starts a new READY streak, held steady
 * while it stays READY — and, once it stops being READY, FROZEN rather
 * than cleared: a row that goes READY -> EXPIRED keeps its last ready_since
 * forever, which is exactly the fact the "deadlines passed while READY"
 * counter (item 3) needs ("how many days did this sit READY before it
 * expired"). This never shows up in the Today "aging READY rows" block by
 * accident — that block already filters to verdict.type === 'READY' first,
 * so a frozen value on a non-READY row is simply never read there.
 */
function computeReadySince(prev: { type: VerdictType; ready_since: string | null } | undefined, newType: VerdictType): string | null {
  if (newType === 'READY') {
    return prev?.type === 'READY' && prev.ready_since ? prev.ready_since : new Date().toISOString()
  }
  return prev?.ready_since ?? null
}

/**
 * Why a gap stopped appearing, for one closed gap — 'satisfied' only when
 * the same requirement/rule still exists and is now marked resolved;
 * 'rule_changed' when it no longer exists under this label at all (edited
 * or corrected since the last run); 'opportunity_expired' when the row
 * itself expired (the gap didn't close, it stopped mattering);
 * 'opportunity_declined' is set by the decline action itself (item 4), not
 * detected here. Never defaults to 'satisfied' — an ambiguous case (the
 * requirement still exists, still unsatisfied, yet the gap vanished
 * anyway — logically shouldn't happen) falls to 'unknown' instead of a
 * guess.
 */
function classifyGapClosureCause(gap: { type: GapType; label: string }, opp: Opportunity, result: DiagnosisResult): GapClosureCause {
  if (result.type === 'EXPIRED' || result.type === 'LATE_WINDOW') return 'opportunity_expired'
  const req = (opp.requirements ?? []).find((r) => r.label === gap.label)
  if (req) return req.satisfied ? 'satisfied' : 'unknown'
  const stillDiscretionary = (opp.eligibility_rules ?? []).some((r) => r.rule_type === 'discretionary' && r.rule_text === gap.label)
  if (stillDiscretionary) return 'unknown'
  return 'rule_changed'
}

/**
 * Diffs a gap list against the previous run's to find what closed. Guard:
 * a GAP verdict with zero persisted gaps is a contradiction under
 * diagnoseOne's own definition (its type is LITERALLY derived from
 * gaps.length > 0) — the only way to reach it is a bug upstream (e.g. a
 * partial write), not real closures, so this skips and warns instead of
 * logging every previously-open gap as "closed". (The literal reading of
 * "zero gaps while not READY" would also fire on every ordinary EXPIRED/
 * BLOCKED/NOT_YET_OPEN row, which legitimately has zero gaps by design —
 * that would make 'opportunity_expired' impossible to ever record, so the
 * guard is scoped to the one combination that's actually impossible.)
 */
function diffClosedGaps(
  prevGaps: { type: GapType; label: string }[],
  newGaps: { type: GapType; label: string }[],
  opp: Opportunity,
  result: DiagnosisResult
): { opportunity_id: string; gap_type: GapType; label: string; cause: GapClosureCause }[] {
  if (prevGaps.length === 0) return []
  if (result.type === 'GAP' && newGaps.length === 0) {
    console.warn(`[gap-closures] opportunity ${opp.id}: verdict type GAP but zero gaps persisted — skipping closure diff (likely a partial write, not real closures)`)
    return []
  }
  const newKeys = new Set(newGaps.map((g) => `${g.type}:${g.label}`))
  return prevGaps
    .filter((g) => !newKeys.has(`${g.type}:${g.label}`))
    .map((g) => ({ opportunity_id: opp.id, gap_type: g.type, label: g.label, cause: classifyGapClosureCause(g, opp, result) }))
}

// Schema doesn't (yet) carry a "late applications accepted" flag on
// opportunities — narrow, documented special case rather than a generic
// mechanism. Follow-up: opportunities.late_applications_accepted.
const LATE_WINDOW_TITLES = new Set(['MATS (ML Alignment & Theory Scholars) — Winter 2027, late window'])

export interface ProfileFacts {
  citizenship: string
  hasCompletedDegree: boolean
  isCurrentlyUndergradEnrolled: boolean
  isCurrentPhdStudent: boolean
  postDegreeHours: number
  yearsOfEducation: number
  fingerprintKeywords: FingerprintKeywords
  /** Resolves a document-type Requirement live at diagnosis time (below) instead of trusting its frozen per-row `satisfied` flag. */
  documentInventory: ProfileSnapshot['document_inventory'] | null
  /** ISO date, computed once per diagnosis run — what Requirement.valid_until is checked against, same "compute against today" pattern as postDegreeHours. */
  today: string
}

export async function loadProfileFacts(snapshot: ProfileSnapshot & { id: string }, userId: string): Promise<ProfileFacts> {
  const { data: postDegreeHours } = await supabaseAdmin.rpc('post_degree_hours', { p_user_id: userId })
  return {
    citizenship: snapshot.identity.citizenship,
    hasCompletedDegree: /completed/i.test(snapshot.identity.current_degree_level),
    isCurrentlyUndergradEnrolled: false, // no field in the schema for "currently enrolled" distinct from "highest degree" yet
    isCurrentPhdStudent: false,
    postDegreeHours: postDegreeHours ?? 0,
    yearsOfEducation: snapshot.identity.years_of_education,
    fingerprintKeywords: extractFingerprintKeywords(snapshot.research_fingerprint),
    documentInventory: snapshot.document_inventory ?? null,
    today: new Date().toISOString().slice(0, 10),
  }
}

function evalMechanicalCheck(check: EligibilityCheck | undefined, facts: ProfileFacts): { pass: boolean; detail?: string } | null {
  if (!check) return null
  switch (check.kind) {
    case 'post_degree_hours_min':
      return facts.postDegreeHours >= check.value
        ? { pass: true }
        : { pass: false, detail: `has ${facts.postDegreeHours}h, needs ${check.value}h` }
    case 'enrollment_status_required':
      return facts.isCurrentlyUndergradEnrolled ? { pass: true } : { pass: false, detail: 'not currently enrolled as an undergraduate' }
    case 'no_completed_degree_required':
      return !facts.hasCompletedDegree ? { pass: true } : { pass: false, detail: 'already holds a completed degree' }
    case 'current_phd_student_required':
      return facts.isCurrentPhdStudent ? { pass: true } : { pass: false, detail: 'not currently enrolled in a PhD program' }
    case 'work_auth_countries':
      return check.value.includes(facts.citizenship)
        ? { pass: true }
        : { pass: false, detail: `citizenship is ${facts.citizenship}, not in [${check.value.join(', ')}], and no work authorization recorded` }
    case 'years_of_education_min':
      return facts.yearsOfEducation >= check.value
        ? { pass: true }
        : { pass: false, detail: `has ${facts.yearsOfEducation} years of education, needs ${check.value}` }
  }
}

// Word/bigram overlap against the fingerprint (lib/fingerprint), not whole-
// phrase substring containment. The old version checked whether a tag like
// "AI safety" was a substring of (or contained) a fingerprint phrase —
// which never matches multi-concept phrases like "LLMs and agentic AI
// automation (...)", so it silently returned 0 for every tag, including
// genuinely overlapping ones, while never distinguishing a real match from
// an irrelevant one. overlapScore() scores what fraction of the tag text's
// own meaningful words the fingerprint actually recognizes.
function fitScore(fieldTags: string[] | undefined, keywords: FingerprintKeywords): number | null {
  if (!fieldTags?.length) return null
  return overlapScore(fieldTags.join(' '), keywords)
}

export interface DiagnosisResult {
  type: VerdictType
  rule_type?: 'mechanical' | 'discretionary'
  reason?: string
  blocking_rule_quote?: string
  blocking_rule_source_url?: string
  fit_score: number | null
  gaps: { type: GapType; label: string; action_label: string }[]
  /** See Verdict.verification_required (types/atlas.ts) — orthogonal to `type`, never promoted to READY. */
  verification_required: boolean
}

// IRRELEVANT is a real VerdictType (migration 0001) and the UI already
// renders it (lib/atlas-format.ts), but nothing below ever returns it —
// there is no producing code path. A row that's genuinely out of
// contention (wrong hemisphere, wrong season, deselected track) has no
// way to land there; it just sits as GAP/READY forever. Known hole,
// logged here rather than fixed — picking how a row gets marked
// IRRELEVANT (a flag? a fifth bucket alongside verification_required?)
// is a real design decision, not a one-line patch.

export function diagnoseOne(opp: Opportunity, facts: ProfileFacts): DiagnosisResult {
  for (const rule of (opp.eligibility_rules ?? []) as (EligibilityRule & { check?: EligibilityCheck })[]) {
    if (rule.rule_type !== 'mechanical' || !rule.check) continue
    const result = evalMechanicalCheck(rule.check, facts)
    if (result && !result.pass) {
      return {
        type: 'BLOCKED',
        rule_type: 'mechanical',
        reason: `${rule.rule_text} (${result.detail})`,
        blocking_rule_quote: rule.source_quote,
        blocking_rule_source_url: rule.source_url,
        fit_score: null,
        gaps: [],
        verification_required: false,
      }
    }
  }

  if (opp.status === 'expired' || opp.status === 'paused') {
    if (LATE_WINDOW_TITLES.has(opp.title)) {
      return { type: 'LATE_WINDOW', reason: 'Late applications accepted — see the programme\'s own late-application route.', fit_score: null, gaps: [], verification_required: false }
    }
    return { type: 'EXPIRED', fit_score: null, gaps: [], verification_required: false }
  }

  if (opp.status === 'not_yet_open') {
    return { type: 'NOT_YET_OPEN', fit_score: fitScore(opp.field_tags, facts.fingerprintKeywords), gaps: [], verification_required: false }
  }

  const gaps: { type: GapType; label: string; action_label: string }[] = []
  let verification_required = false

  for (const req of opp.requirements ?? []) {
    // Document-shaped requirements (CV, SOP, transcripts, ...) resolve
    // live against document_inventory instead of the frozen per-row
    // `satisfied` flag — a document marked 'ready' in the profile now
    // actually closes the gap everywhere it appears, instead of needing
    // every opportunity's own row hand-edited. Everything else (gre,
    // language_test, aptitude_test, other) has no document_inventory
    // field to check against and keeps using its own stored flag — except
    // that a stored `satisfied: true` stops counting once valid_until has
    // passed (same "check against today" treatment as postDegreeHours),
    // for credentials that expire: Duolingo/IELTS/TOEFL/GRE/HAT.
    const invKey = INVENTORY_KEY[req.type]
    const expired = !!req.valid_until && req.valid_until < facts.today
    const satisfied = invKey ? facts.documentInventory?.[invKey] === 'ready' : req.satisfied && !expired
    if (!satisfied) gaps.push({ type: REQUIREMENT_GAP_TYPE[req.type] ?? 'document', label: req.label, action_label: req.satisfying_action ?? req.label })
  }
  const acceptsBachelor = (opp.degree_levels_accepted ?? []).length === 0 || opp.degree_levels_accepted.includes('undergraduate')
  if (!acceptsBachelor) {
    // Ambiguity, not a confirmed rejection (v5 §5.1) — never BLOCKED, and
    // never surfaced with the spec citation that justifies that rule;
    // the user just needs a plain action. This is page silence, not a
    // real missing credential — always verification_required.
    const label = "Confirm this programme accepts bachelor's-only applicants — not stated on the official page"
    gaps.push({ type: 'record', label, action_label: label })
    verification_required = true
  }
  for (const rule of opp.eligibility_rules ?? []) {
    // rule_text is already written as a plain-English condition (e.g.
    // "Typically requires a 2:1 undergraduate degree; IELTS typically
    // 6.0.") — it IS the action item, no internal framing needed on top.
    if (rule.rule_type !== 'discretionary') continue
    gaps.push({ type: 'record', label: rule.rule_text, action_label: rule.satisfying_action ?? rule.rule_text })
    // Only a rule explicitly curated as page-silence (see
    // EligibilityRule.verification_only) sets the flag — a rule that
    // states an actual soft preference ("typically requires...") is a
    // real GAP per §5.7, not something to merely go verify.
    if (rule.verification_only) verification_required = true
  }

  return {
    type: gaps.length > 0 ? 'GAP' : 'READY',
    fit_score: fitScore(opp.field_tags, facts.fingerprintKeywords),
    gaps,
    verification_required,
  }
}

/**
 * Diagnoses one opportunity against the current profile snapshot, writes
 * the verdict (+ gaps), replacing any prior verdict for this opportunity
 * at this snapshot version. Returns the new verdict row.
 *
 * Insert-before-delete, not delete-before-insert: the new verdict+gap rows
 * are written FIRST (coexisting briefly with the old ones, harmless — they
 * don't collide since the old row keeps its own id), and the prior row is
 * only deleted by that exact id once the new rows are confirmed durably
 * persisted. A crash or failed insert partway through leaves the old
 * verdict+gaps completely untouched, so nothing gets misread as "closed"
 * that was never really replaced. Gap-closure provenance (gap_closures,
 * migration 0011) is likewise only computed and written after the new gaps
 * are confirmed inserted.
 */
export async function diagnoseOpportunity(opportunityId: string, userId: string) {
  const { data: opp, error: oppErr } = await supabaseAdmin.from('opportunities').select('*').eq('id', opportunityId).single()
  if (oppErr || !opp) throw new Error(`Opportunity not found: ${oppErr?.message ?? opportunityId}`)

  const { data: snapshot, error: snapErr } = await supabaseAdmin.from('profile_snapshots').select('*').eq('is_current', true).eq('user_id', userId).single()
  if (snapErr || !snapshot) throw new Error(`No current profile snapshot: ${snapErr?.message}`)

  const facts = await loadProfileFacts(snapshot, userId)
  const result = diagnoseOne(opp as Opportunity, facts)

  const [{ data: prevVerdict }, { data: prevGaps }] = await Promise.all([
    supabaseAdmin
      .from('verdicts')
      .select('id, type, ready_since')
      .eq('opportunity_id', opportunityId)
      .eq('snapshot_version', snapshot.version)
      .eq('user_id', userId)
      .maybeSingle(),
    supabaseAdmin.from('gaps').select('type, label').eq('opportunity_id', opportunityId).eq('user_id', userId),
  ])
  const ready_since = computeReadySince(prevVerdict ?? undefined, result.type)

  const { data: verdict, error: verdictErr } = await supabaseAdmin
    .from('verdicts')
    .insert({
      user_id: userId,
      opportunity_id: opportunityId,
      snapshot_version: snapshot.version,
      type: result.type,
      rule_type: result.rule_type,
      reason: result.reason,
      blocking_rule_quote: result.blocking_rule_quote,
      blocking_rule_source_url: result.blocking_rule_source_url,
      fit_score: result.fit_score,
      ready_since,
      verification_required: result.verification_required,
    })
    .select('*')
    .single()
  if (verdictErr) throw new Error(`Verdict insert failed: ${verdictErr.message}`)

  if (result.gaps.length > 0) {
    const gapRows = result.gaps.map((g) => ({ ...g, ...GAP_TYPE_DEFAULTS[g.type], user_id: userId, opportunity_id: opportunityId, verdict_id: verdict.id }))
    const { error: gapErr } = await supabaseAdmin.from('gaps').insert(gapRows)
    if (gapErr) throw new Error(`Gap insert failed: ${gapErr.message}`)
  }

  const closures = diffClosedGaps(prevGaps ?? [], result.gaps, opp as Opportunity, result).map((c) => ({ ...c, user_id: userId }))
  if (closures.length > 0) {
    const { error: closureErr } = await supabaseAdmin.from('gap_closures').insert(closures)
    if (closureErr) console.error(`[gap-closures] insert failed for opportunity ${opportunityId}:`, closureErr.message)
  }

  if (prevVerdict) {
    await supabaseAdmin.from('verdicts').delete().eq('id', prevVerdict.id)
  }

  return verdict
}

/**
 * Re-diagnoses every opportunity against the current profile snapshot —
 * spec §5.5's re-diagnosis trigger. Call after any write that creates a
 * new profile_snapshots version.
 *
 * Batched, not a loop of diagnoseOpportunity() calls: that per-row path
 * re-fetches the profile snapshot and re-calls the post_degree_hours RPC
 * on every single opportunity — harmless for one row, ~450 redundant
 * round-trips for the whole pool (measured: >90s for 77 rows). This
 * fetches the profile and computes facts once, diagnoses every row
 * in-memory, then does one bulk verdict insert + one bulk gap insert +
 * one bulk gap_closures insert, and only then one bulk delete of the old
 * verdict rows by exact id (same insert-before-delete reasoning as
 * diagnoseOpportunity — see its doc comment).
 */
export async function diagnosePool(userId: string) {
  const { data: snapshot, error: snapErr } = await supabaseAdmin.from('profile_snapshots').select('*').eq('is_current', true).eq('user_id', userId).single()
  if (snapErr || !snapshot) throw new Error(`No current profile snapshot: ${snapErr?.message}`)
  const facts = await loadProfileFacts(snapshot, userId)

  const { data: opportunities, error: oppErr } = await supabaseAdmin.from('opportunities').select('*')
  if (oppErr) throw new Error(`Could not load opportunities: ${oppErr.message}`)

  const diagnoses = (opportunities ?? []).map((opp) => ({ opp, result: diagnoseOne(opp as Opportunity, facts) }))

  const [{ data: prevVerdicts }, { data: prevGapsRows }] = await Promise.all([
    supabaseAdmin.from('verdicts').select('id, opportunity_id, type, ready_since').eq('snapshot_version', snapshot.version).eq('user_id', userId),
    supabaseAdmin.from('gaps').select('opportunity_id, type, label').eq('user_id', userId),
  ])
  const prevVerdictByOpp = new Map((prevVerdicts ?? []).map((v) => [v.opportunity_id, v]))
  const prevGapsByOpp = new Map<string, { type: GapType; label: string }[]>()
  for (const g of prevGapsRows ?? []) {
    const list = prevGapsByOpp.get(g.opportunity_id) ?? []
    list.push({ type: g.type as GapType, label: g.label })
    prevGapsByOpp.set(g.opportunity_id, list)
  }

  const verdictRows = diagnoses.map(({ opp, result }) => ({
    user_id: userId,
    opportunity_id: opp.id,
    snapshot_version: snapshot.version,
    type: result.type,
    rule_type: result.rule_type,
    reason: result.reason,
    blocking_rule_quote: result.blocking_rule_quote,
    blocking_rule_source_url: result.blocking_rule_source_url,
    fit_score: result.fit_score,
    ready_since: computeReadySince(prevVerdictByOpp.get(opp.id), result.type),
    verification_required: result.verification_required,
  }))
  const { data: insertedVerdicts, error: verdictErr } = await supabaseAdmin.from('verdicts').insert(verdictRows).select('id, opportunity_id')
  if (verdictErr) throw new Error(`Verdict batch insert failed: ${verdictErr.message}`)

  const verdictIdByOpp = new Map((insertedVerdicts ?? []).map((v) => [v.opportunity_id, v.id]))
  const gapRows = diagnoses.flatMap(({ opp, result }) =>
    result.gaps.map((g) => ({ ...g, ...GAP_TYPE_DEFAULTS[g.type], user_id: userId, opportunity_id: opp.id, verdict_id: verdictIdByOpp.get(opp.id) }))
  )
  if (gapRows.length > 0) {
    const { error: gapErr } = await supabaseAdmin.from('gaps').insert(gapRows)
    if (gapErr) throw new Error(`Gap batch insert failed: ${gapErr.message}`)
  }

  const closures = diagnoses.flatMap(({ opp, result }) =>
    diffClosedGaps(prevGapsByOpp.get(opp.id) ?? [], result.gaps, opp as Opportunity, result).map((c) => ({ ...c, user_id: userId }))
  )
  if (closures.length > 0) {
    const { error: closureErr } = await supabaseAdmin.from('gap_closures').insert(closures)
    if (closureErr) console.error('[gap-closures] batch insert failed:', closureErr.message)
  }

  const oldVerdictIds = (prevVerdicts ?? []).map((v) => v.id)
  if (oldVerdictIds.length > 0) {
    // Cascades the old gap rows (verdict_id ON DELETE CASCADE) without
    // touching the new verdict/gap rows just inserted above — different ids
    // even for the same opportunity_id, so there's no collision.
    await supabaseAdmin.from('verdicts').delete().in('id', oldVerdictIds)
  }

  return insertedVerdicts ?? []
}
