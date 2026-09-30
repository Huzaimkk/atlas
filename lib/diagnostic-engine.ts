import 'server-only'
import { supabaseAdmin } from '@/lib/supabase'
import type { EligibilityRule, GapType, Opportunity, ProfileSnapshot, VerdictType } from '@/types/atlas'

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

const GAP_TYPE_DEFAULTS: Record<GapType, { time_estimate: string; cost_estimate: string }> = {
  credential: { time_estimate: 'weeks to months', cost_estimate: 'costs money' },
  document: { time_estimate: 'hours to days', cost_estimate: 'free — agent-assisted' },
  endorsement: { time_estimate: 'weeks, depends on others', cost_estimate: 'free' },
  record: { time_estimate: 'months, sometimes not closable before deadline', cost_estimate: 'varies' },
  experience: { time_estimate: 'months', cost_estimate: 'varies' },
  contact: { time_estimate: 'days — highest leverage per hour spent', cost_estimate: 'free' },
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
  researchFingerprint: string[]
}

export async function loadProfileFacts(snapshot: ProfileSnapshot & { id: string }): Promise<ProfileFacts> {
  const { data: postDegreeHours } = await supabaseAdmin.rpc('post_degree_hours', { p_snapshot_id: snapshot.id })
  return {
    citizenship: snapshot.identity.citizenship,
    hasCompletedDegree: /completed/i.test(snapshot.identity.current_degree_level),
    isCurrentlyUndergradEnrolled: false, // no field in the schema for "currently enrolled" distinct from "highest degree" yet
    isCurrentPhdStudent: false,
    postDegreeHours: postDegreeHours ?? 0,
    researchFingerprint: snapshot.research_fingerprint.map((s) => s.toLowerCase()),
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
  }
}

function fitScore(fieldTags: string[] | undefined, researchFingerprint: string[]): number | null {
  if (!fieldTags?.length) return null
  const hits = fieldTags.filter((tag) => researchFingerprint.some((fp) => fp.includes(tag.toLowerCase()) || tag.toLowerCase().includes(fp)))
  return Math.round((hits.length / fieldTags.length) * 100)
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
    return { type: 'NOT_YET_OPEN', fit_score: fitScore(opp.field_tags, facts.researchFingerprint), gaps: [] }
  }

  const gaps: { type: GapType; label: string }[] = []
  for (const req of opp.requirements ?? []) {
    if (!req.satisfied) gaps.push({ type: 'document', label: req.label })
  }
  const acceptsBachelor = (opp.degree_levels_accepted ?? []).length === 0 || opp.degree_levels_accepted.includes('undergraduate')
  if (!acceptsBachelor) {
    gaps.push({ type: 'record', label: 'Verify entry route — degree_level_required not confirmed to admit bachelor\'s-only applicants (v5 §5.1: GAP, never BLOCKED, on ambiguity)' })
  }
  for (const rule of opp.eligibility_rules ?? []) {
    if (rule.rule_type === 'discretionary') gaps.push({ type: 'record', label: `Discretionary requirement to address: ${rule.rule_text}` })
  }

  return {
    type: gaps.length > 0 ? 'GAP' : 'READY',
    fit_score: fitScore(opp.field_tags, facts.researchFingerprint),
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
