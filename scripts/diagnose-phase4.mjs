// Phase 4 — Diagnostic Engine. Eligibility runs before fit (instruction).
//
// Only rules the profile snapshot actually carries data for get a hard,
// automatic pass/fail: post-degree hours (v5 §5.5), current enrollment
// status, completed-degree status, current-PhD-student status, and work
// authorization by citizenship. Age caps (Rhodes, Schwarzman, Thiel) and
// the Schlumberger women-only rule are NOT auto-evaluated — v5 never
// states a birthdate or gender, and inventing either to drive a BLOCKED
// verdict would be exactly the kind of unverified claim §5.6 forbids.
// Those rules stay visible on the opportunity as text; a human confirms.
//
// Only a rule_type: 'mechanical' check can ever produce BLOCKED (v5 §5.7),
// enforced twice over — once here, again by the DB CHECK constraints from
// Phase 1 (a BLOCKED insert without a quote+source+mechanical rule_type
// is rejected outright, not just discouraged).
import { createClient } from '@supabase/supabase-js'

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

// ---- Step 1: attach machine-checkable descriptors to the Phase 3 rows ----
// that actually carry a rule of these kinds. Re-verified against each
// programme's own source_url already recorded on the row (v5 §5.4
// instruction: don't take the snapshot's word for it) — the quotes below
// match what's already stored as eligibility_rules[].source_quote.
const CHECKS = [
  { title: 'Chevening Scholarships 2027-28', check: { kind: 'post_degree_hours_min', value: 2800 } },
  { title: 'DAAD EPOS — Development-Related Postgraduate Courses', check: { kind: 'post_degree_hours_min', value: 173.33 * 12 * 2 } }, // "≥2 years professional experience after bachelor's"
  { title: 'Mitacs Globalink Research Internship 2027', check: { kind: 'enrollment_status_required', value: 'undergraduate_enrolled' } },
  { title: 'Thiel Fellowship', check: { kind: 'no_completed_degree_required', value: true } },
  { title: 'Apple Scholars in AI/ML & Google PhD Fellowship', check: { kind: 'current_phd_student_required', value: true } },
  { title: 'Anthropic Fellows Program', check: { kind: 'work_auth_countries', value: ['United States', 'United Kingdom', 'Canada'] } },
  { title: 'Claude Corps (Anthropic x CodePath), Cohort 3', check: { kind: 'work_auth_countries', value: ['United States'] } },
]

for (const { title, check } of CHECKS) {
  const { data: opp, error: fetchErr } = await admin.from('opportunities').select('id, eligibility_rules').eq('title', title).single()
  if (fetchErr || !opp) { console.error(`Could not find "${title}" to attach check:`, fetchErr?.message); continue }
  const rules = opp.eligibility_rules.map((r) => (r.rule_type === 'mechanical' ? { ...r, check } : r))
  const { error: updateErr } = await admin.from('opportunities').update({ eligibility_rules: rules }).eq('id', opp.id)
  if (updateErr) console.error(`Failed to attach check to "${title}":`, updateErr.message)
}
console.log(`Attached machine-checkable descriptors to ${CHECKS.length} rows.`)

// ---- Step 2: load profile + post_degree_hours ----
const { data: profile, error: profileErr } = await admin.from('profile_snapshots').select('*').eq('is_current', true).single()
if (profileErr) { console.error('Could not load current profile snapshot:', profileErr.message); process.exit(1) }
const { data: postDegreeHours } = await admin.rpc('post_degree_hours', { p_snapshot_id: profile.id })
console.log(`Current profile: version ${profile.version}, post_degree_hours=${postDegreeHours}`)

const citizenship = profile.identity.citizenship
const currentDegreeLevel = profile.identity.current_degree_level // "BE Electronics Engineering (completed)"
const hasCompletedDegree = /completed/i.test(currentDegreeLevel)
const isCurrentlyUndergradEnrolled = false // BE completed Jan 2026 — no longer enrolled
const isCurrentPhdStudent = false // target is parallel master's/PhD, not currently enrolled in either

function evalMechanicalCheck(check) {
  switch (check?.kind) {
    case 'post_degree_hours_min':
      return postDegreeHours >= check.value ? { pass: true } : { pass: false, detail: `has ${postDegreeHours}h, needs ${check.value}h` }
    case 'enrollment_status_required':
      return check.value === 'undergraduate_enrolled' && isCurrentlyUndergradEnrolled ? { pass: true } : { pass: false, detail: 'not currently enrolled as an undergraduate — degree already completed' }
    case 'no_completed_degree_required':
      return !hasCompletedDegree ? { pass: true } : { pass: false, detail: 'already holds a completed degree (BE, Jan 2026)' }
    case 'current_phd_student_required':
      return isCurrentPhdStudent ? { pass: true } : { pass: false, detail: 'not currently enrolled in a PhD program' }
    case 'work_auth_countries':
      return check.value.includes(citizenship) ? { pass: true } : { pass: false, detail: `citizenship is ${citizenship}, not in [${check.value.join(', ')}], and no work authorization recorded in profile` }
    default:
      return null // no machine-checkable descriptor — never auto-block
  }
}

// v5 explicitly restates this program's own status: schema doesn't (yet)
// carry a "late applications accepted" flag on opportunities, so this is a
// narrow, documented special case rather than a generic mechanism. Follow-
// up: add opportunities.late_applications_accepted in a future migration.
const LATE_WINDOW_TITLES = new Set(['MATS (ML Alignment & Theory Scholars) — Winter 2027, late window'])

// Generic time/cost guidance per gap type, spec §5.2 — applied uniformly,
// not fabricated per-row. A per-row estimate (e.g. "this specific LOR will
// take exactly 19 days") isn't something the engine has grounds to claim.
const GAP_TYPE_DEFAULTS = {
  credential: { time_estimate: 'weeks to months', cost_estimate: 'costs money' },
  document: { time_estimate: 'hours to days', cost_estimate: 'free — agent-assisted' },
  endorsement: { time_estimate: 'weeks, depends on others', cost_estimate: 'free' },
  record: { time_estimate: 'months, sometimes not closable before deadline', cost_estimate: 'varies' },
  experience: { time_estimate: 'months', cost_estimate: 'varies' },
  contact: { time_estimate: 'days — highest leverage per hour spent', cost_estimate: 'free' },
}

const RESEARCH_FINGERPRINT = profile.research_fingerprint.map((s) => s.toLowerCase())
function fitScore(fieldTags) {
  if (!fieldTags?.length) return null
  const hits = fieldTags.filter((tag) => RESEARCH_FINGERPRINT.some((fp) => fp.includes(tag.toLowerCase()) || tag.toLowerCase().includes(fp)))
  return Math.round((hits.length / fieldTags.length) * 100)
}

// ---- Step 3: diagnose every row (idempotent — clears this snapshot's prior verdicts/gaps first) ----
const { data: opportunities, error: oppErr } = await admin.from('opportunities').select('*')
if (oppErr) { console.error('Could not load opportunities:', oppErr.message); process.exit(1) }

const { data: priorVerdicts } = await admin.from('verdicts').select('id').eq('snapshot_version', profile.version)
if (priorVerdicts?.length) {
  await admin.from('gaps').delete().in('verdict_id', priorVerdicts.map((v) => v.id))
  await admin.from('verdicts').delete().eq('snapshot_version', profile.version)
  console.log(`Cleared ${priorVerdicts.length} prior verdicts (and their gaps) for a clean re-run.`)
}

const verdictRows = []
const gapRows = []

for (const opp of opportunities) {
  // Eligibility first: any mechanical rule with a failing check -> BLOCKED, full stop.
  let blocked = null
  for (const rule of opp.eligibility_rules ?? []) {
    if (rule.rule_type !== 'mechanical' || !rule.check) continue
    const result = evalMechanicalCheck(rule.check)
    if (result && !result.pass) {
      blocked = { rule, detail: result.detail }
      break
    }
  }

  if (blocked) {
    verdictRows.push({
      opportunity_id: opp.id,
      snapshot_version: profile.version,
      type: 'BLOCKED',
      rule_type: 'mechanical',
      reason: `${blocked.rule.rule_text} (${blocked.detail})`,
      blocking_rule_quote: blocked.rule.source_quote,
      blocking_rule_source_url: blocked.rule.source_url,
    })
    continue
  }

  if (opp.status === 'expired') {
    if (LATE_WINDOW_TITLES.has(opp.title)) {
      verdictRows.push({
        opportunity_id: opp.id, snapshot_version: profile.version, type: 'LATE_WINDOW',
        reason: 'Late applications accepted by emailing applications@matsprogram.org with a resume (v5 §5.4).',
      })
    } else {
      verdictRows.push({ opportunity_id: opp.id, snapshot_version: profile.version, type: 'EXPIRED' })
    }
    continue
  }

  if (opp.status === 'not_yet_open') {
    verdictRows.push({ opportunity_id: opp.id, snapshot_version: profile.version, type: 'NOT_YET_OPEN', fit_score: fitScore(opp.field_tags) })
    continue
  }

  // Gaps: unsatisfied requirements, ambiguous/mismatched degree level (never BLOCKED — v5 §5.1),
  // and discretionary rules worth naming explicitly.
  const gaps = []
  for (const req of opp.requirements ?? []) {
    if (!req.satisfied) gaps.push({ type: 'document', label: req.label })
  }
  const acceptsBachelor = (opp.degree_levels_accepted ?? []).length === 0 || opp.degree_levels_accepted.includes('undergraduate')
  if (!acceptsBachelor) {
    gaps.push({ type: 'record', label: 'Verify entry route — degree_level_required not confirmed to admit bachelor\'s-only applicants (v5 §5.1: GAP, never BLOCKED, on ambiguity)' })
  }
  for (const rule of opp.eligibility_rules ?? []) {
    if (rule.rule_type === 'discretionary') {
      gaps.push({ type: 'record', label: `Discretionary requirement to address: ${rule.rule_text}` })
    }
  }

  const verdictType = gaps.length > 0 ? 'GAP' : 'READY'
  const verdict = {
    opportunity_id: opp.id, snapshot_version: profile.version, type: verdictType,
    fit_score: fitScore(opp.field_tags),
  }
  verdictRows.push(verdict)
  if (verdictType === 'GAP') {
    for (const g of gaps) gapRows.push({ ...g, opportunity_id: opp.id, _verdictIndex: verdictRows.length - 1 })
  }
}

console.log(`\nDiagnosed ${verdictRows.length} rows. Inserting verdicts...`)
const { data: insertedVerdicts, error: verdictErr } = await admin.from('verdicts').insert(verdictRows).select('id, opportunity_id, type')
if (verdictErr) { console.error('Verdict insert failed:', verdictErr.message); process.exit(1) }
console.log(`Inserted ${insertedVerdicts.length} verdicts.`)

// Map opportunity_id -> verdict id for GAP rows (order-preserved 1:1 with verdictRows since no batching reordered them)
const verdictIdByOpp = new Map(insertedVerdicts.map((v) => [v.opportunity_id, v.id]))
const gapsToInsert = gapRows.map(({ _verdictIndex, opportunity_id, ...g }) => ({
  ...g, ...GAP_TYPE_DEFAULTS[g.type], opportunity_id, verdict_id: verdictIdByOpp.get(opportunity_id),
}))

if (gapsToInsert.length > 0) {
  const { error: gapErr } = await admin.from('gaps').insert(gapsToInsert)
  if (gapErr) { console.error('Gap insert failed:', gapErr.message); process.exit(1) }
  console.log(`Inserted ${gapsToInsert.length} gap rows.`)
}

// ---- Summary ----
const byType = {}
for (const v of verdictRows) byType[v.type] = (byType[v.type] ?? 0) + 1
console.log('\nVerdict breakdown:', byType)

const blockedList = verdictRows.filter((v) => v.type === 'BLOCKED')
console.log(`\nBLOCKED rows (${blockedList.length}):`)
for (const b of blockedList) {
  const opp = opportunities.find((o) => o.id === b.opportunity_id)
  console.log(`  - ${opp.title}\n    quote: "${b.blocking_rule_quote}"\n    source: ${b.blocking_rule_source_url}\n    reason: ${b.reason}\n`)
}
