import 'server-only'
import { supabaseAdmin } from '@/lib/supabase'
import { extractFingerprintKeywords, overlapScore, type FingerprintKeywords } from '@/lib/fingerprint'
import type { EligibilityRule, GapType, Opportunity, ProfileSnapshot, RequirementType, VerdictType } from '@/types/atlas'

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
}

export async function loadProfileFacts(snapshot: ProfileSnapshot & { id: string }): Promise<ProfileFacts> {
  const { data: postDegreeHours } = await supabaseAdmin.rpc('post_degree_hours', { p_snapshot_id: snapshot.id })
  return {
    citizenship: snapshot.identity.citizenship,
    hasCompletedDegree: /completed/i.test(snapshot.identity.current_degree_level),
    isCurrentlyUndergradEnrolled: false, // no field in the schema for "currently enrolled" distinct from "highest degree" yet
    isCurrentPhdStudent: false,
    postDegreeHours: postDegreeHours ?? 0,
    yearsOfEducation: snapshot.identity.years_of_education,
    fingerprintKeywords: extractFingerprintKeywords(snapshot.research_fingerprint),
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
  gaps: { type: GapType; label: string }[]
}

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
      }
    }
  }

  if (opp.status === 'expired') {
    if (LATE_WINDOW_TITLES.has(opp.title)) {
      return { type: 'LATE_WINDOW', reason: 'Late applications accepted — see the programme\'s own late-application route.', fit_score: null, gaps: [] }
    }
    return { type: 'EXPIRED', fit_score: null, gaps: [] }
  }

  if (opp.status === 'not_yet_open') {
    return { type: 'NOT_YET_OPEN', fit_score: fitScore(opp.field_tags, facts.fingerprintKeywords), gaps: [] }
  }

  const gaps: { type: GapType; label: string }[] = []
  for (const req of opp.requirements ?? []) {
    if (!req.satisfied) gaps.push({ type: REQUIREMENT_GAP_TYPE[req.type] ?? 'document', label: req.label })
  }
  const acceptsBachelor = (opp.degree_levels_accepted ?? []).length === 0 || opp.degree_levels_accepted.includes('undergraduate')
  if (!acceptsBachelor) {
    // Ambiguity, not a confirmed rejection (v5 §5.1) — never BLOCKED, and
    // never surfaced with the spec citation that justifies that rule;
    // the user just needs a plain action.
    gaps.push({ type: 'record', label: "Confirm this programme accepts bachelor's-only applicants — not stated on the official page" })
  }
  for (const rule of opp.eligibility_rules ?? []) {
    // rule_text is already written as a plain-English condition (e.g.
    // "Typically requires a 2:1 undergraduate degree; IELTS typically
    // 6.0.") — it IS the action item, no internal framing needed on top.
    if (rule.rule_type === 'discretionary') gaps.push({ type: 'record', label: rule.rule_text })
  }

  return {
    type: gaps.length > 0 ? 'GAP' : 'READY',
    fit_score: fitScore(opp.field_tags, facts.fingerprintKeywords),
    gaps,
  }
}

/** Diagnoses one opportunity against the current profile snapshot, writes the verdict (+ gaps), replacing any prior verdict for this opportunity at this snapshot version. Returns the new verdict row. */
export async function diagnoseOpportunity(opportunityId: string) {
  const { data: opp, error: oppErr } = await supabaseAdmin.from('opportunities').select('*').eq('id', opportunityId).single()
  if (oppErr || !opp) throw new Error(`Opportunity not found: ${oppErr?.message ?? opportunityId}`)

  const { data: snapshot, error: snapErr } = await supabaseAdmin.from('profile_snapshots').select('*').eq('is_current', true).single()
  if (snapErr || !snapshot) throw new Error(`No current profile snapshot: ${snapErr?.message}`)

  const facts = await loadProfileFacts(snapshot)
  const result = diagnoseOne(opp as Opportunity, facts)

  await supabaseAdmin.from('verdicts').delete().eq('opportunity_id', opportunityId).eq('snapshot_version', snapshot.version)

  const { data: verdict, error: verdictErr } = await supabaseAdmin
    .from('verdicts')
    .insert({
      opportunity_id: opportunityId,
      snapshot_version: snapshot.version,
      type: result.type,
      rule_type: result.rule_type,
      reason: result.reason,
      blocking_rule_quote: result.blocking_rule_quote,
      blocking_rule_source_url: result.blocking_rule_source_url,
      fit_score: result.fit_score,
    })
    .select('*')
    .single()
  if (verdictErr) throw new Error(`Verdict insert failed: ${verdictErr.message}`)

  if (result.gaps.length > 0) {
    const gapRows = result.gaps.map((g) => ({ ...g, ...GAP_TYPE_DEFAULTS[g.type], opportunity_id: opportunityId, verdict_id: verdict.id }))
    const { error: gapErr } = await supabaseAdmin.from('gaps').insert(gapRows)
    if (gapErr) throw new Error(`Gap insert failed: ${gapErr.message}`)
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
 * in-memory, then does one delete + one bulk verdict insert + one bulk
 * gap insert.
 */
export async function diagnosePool() {
  const { data: snapshot, error: snapErr } = await supabaseAdmin.from('profile_snapshots').select('*').eq('is_current', true).single()
  if (snapErr || !snapshot) throw new Error(`No current profile snapshot: ${snapErr?.message}`)
  const facts = await loadProfileFacts(snapshot)

  const { data: opportunities, error: oppErr } = await supabaseAdmin.from('opportunities').select('*')
  if (oppErr) throw new Error(`Could not load opportunities: ${oppErr.message}`)

  const diagnoses = (opportunities ?? []).map((opp) => ({ opp, result: diagnoseOne(opp as Opportunity, facts) }))

  // Deleting verdicts cascades to their gaps (gaps.verdict_id ON DELETE CASCADE).
  await supabaseAdmin.from('verdicts').delete().eq('snapshot_version', snapshot.version)

  const verdictRows = diagnoses.map(({ opp, result }) => ({
    opportunity_id: opp.id,
    snapshot_version: snapshot.version,
    type: result.type,
    rule_type: result.rule_type,
    reason: result.reason,
    blocking_rule_quote: result.blocking_rule_quote,
    blocking_rule_source_url: result.blocking_rule_source_url,
    fit_score: result.fit_score,
  }))
  const { data: insertedVerdicts, error: verdictErr } = await supabaseAdmin.from('verdicts').insert(verdictRows).select('id, opportunity_id')
  if (verdictErr) throw new Error(`Verdict batch insert failed: ${verdictErr.message}`)

  const verdictIdByOpp = new Map((insertedVerdicts ?? []).map((v) => [v.opportunity_id, v.id]))
  const gapRows = diagnoses.flatMap(({ opp, result }) =>
    result.gaps.map((g) => ({ ...g, ...GAP_TYPE_DEFAULTS[g.type], opportunity_id: opp.id, verdict_id: verdictIdByOpp.get(opp.id) }))
  )
  if (gapRows.length > 0) {
    const { error: gapErr } = await supabaseAdmin.from('gaps').insert(gapRows)
    if (gapErr) throw new Error(`Gap batch insert failed: ${gapErr.message}`)
  }

  return insertedVerdicts ?? []
}
