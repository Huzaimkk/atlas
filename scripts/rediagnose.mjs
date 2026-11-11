// Plain-JS mirror of lib/diagnostic-engine.ts's diagnoseOne/diagnosePool,
// run directly against the live DB with the service-role key — needed
// because the real module is TS with '@/...' path aliases and a
// 'server-only' guard that only resolve inside the Next.js build. Keep
// this in sync with lib/diagnostic-engine.ts by hand; it is a stand-in
// for calling the real app route (app/api/diagnose/route.ts), not a
// permanent second implementation.
import { createClient } from '@supabase/supabase-js'

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
const USER_ID = 'de2223b9-b014-488b-b7d0-5e04455342b9'

const INVENTORY_KEY = {
  sop: 'sop', research_proposal: 'research_statement', cv: 'cv', transcript: 'transcripts',
  lor: 'lor_commitments', writing_sample: 'writing_sample', portfolio: 'portfolio',
}

const CONNECTORS = new Set(['the','and','for','with','from','this','that','into','via','using','based','on','of','in','to','a','an','as','at','by','or','is','are'])
const WEAK_SINGLES = new Set(['policy','state','drive','direct','scientific','networks','learning','machine','deep','edge','deployment','estimation','simulated','datasets','prediction','healthcare','control','modelling','systems'])
const MIN_TOKEN_LENGTH = 3
function tokenize(text) { return text.split(/[\s,/()]+/).map((t) => t.trim().toLowerCase()).filter(Boolean) }
function extractFingerprintKeywords(fingerprint) {
  const singles = new Set(), bigrams = new Set(), bigramPairs = []
  for (const phrase of fingerprint ?? []) {
    const parenMatch = phrase.match(/\(([^)]+)\)/)
    const mainPart = phrase.replace(/\([^)]*\)/g, '')
    const parenPart = parenMatch?.[1] ?? ''
    for (const part of [mainPart, parenPart]) {
      const words = tokenize(part)
      for (const w of words) { if (w.length < MIN_TOKEN_LENGTH) continue; if (CONNECTORS.has(w)) continue; if (!WEAK_SINGLES.has(w)) singles.add(w) }
      for (let i = 0; i < words.length - 1; i++) {
        const [a, b] = [words[i], words[i + 1]]
        if (a.length < MIN_TOKEN_LENGTH || b.length < MIN_TOKEN_LENGTH || CONNECTORS.has(a) || CONNECTORS.has(b)) continue
        const key = `${a} ${b}`
        if (bigrams.has(key)) continue
        bigrams.add(key); bigramPairs.push([a, b])
      }
    }
  }
  return { singles: [...singles], bigrams: bigramPairs }
}
function overlapScore(candidateText, keywords) {
  const words = tokenize(candidateText).filter((w) => w.length >= MIN_TOKEN_LENGTH && !CONNECTORS.has(w))
  if (words.length === 0) return null
  const singleSet = new Set(keywords.singles)
  const bigramSet = new Set(keywords.bigrams.map(([a, b]) => `${a} ${b}`))
  const matched = new Set()
  for (let i = 0; i < words.length; i++) if (singleSet.has(words[i])) matched.add(i)
  for (let i = 0; i < words.length - 1; i++) if (bigramSet.has(`${words[i]} ${words[i + 1]}`)) { matched.add(i); matched.add(i + 1) }
  return Math.round((matched.size / words.length) * 100)
}
function fitScore(fieldTags, keywords) { if (!fieldTags?.length) return null; return overlapScore(fieldTags.join(' '), keywords) }

const GAP_TYPE_DEFAULTS = {
  credential: { time_estimate: 'weeks to months', cost_estimate: 'costs money' },
  document: { time_estimate: 'hours to days', cost_estimate: 'free — agent-assisted' },
  endorsement: { time_estimate: 'weeks, depends on others', cost_estimate: 'free' },
  record: { time_estimate: 'months, sometimes not closable before deadline', cost_estimate: 'varies' },
  experience: { time_estimate: 'months', cost_estimate: 'varies' },
  contact: { time_estimate: 'days — highest leverage per hour spent', cost_estimate: 'free' },
}
const REQUIREMENT_GAP_TYPE = { lor: 'endorsement', gre: 'credential', language_test: 'credential', aptitude_test: 'credential' }
const LATE_WINDOW_TITLES = new Set(['MATS (ML Alignment & Theory Scholars) — Winter 2027, late window'])

function evalMechanicalCheck(check, facts) {
  if (!check) return null
  switch (check.kind) {
    case 'post_degree_hours_min': return facts.postDegreeHours >= check.value ? { pass: true } : { pass: false, detail: `has ${facts.postDegreeHours}h, needs ${check.value}h` }
    case 'enrollment_status_required': return facts.isCurrentlyUndergradEnrolled ? { pass: true } : { pass: false, detail: 'not currently enrolled as an undergraduate' }
    case 'no_completed_degree_required': return !facts.hasCompletedDegree ? { pass: true } : { pass: false, detail: 'already holds a completed degree' }
    case 'current_phd_student_required': return facts.isCurrentPhdStudent ? { pass: true } : { pass: false, detail: 'not currently enrolled in a PhD program' }
    case 'work_auth_countries': return check.value.includes(facts.citizenship) ? { pass: true } : { pass: false, detail: `citizenship is ${facts.citizenship}, not in [${check.value.join(', ')}], and no work authorization recorded` }
    case 'years_of_education_min': return facts.yearsOfEducation >= check.value ? { pass: true } : { pass: false, detail: `has ${facts.yearsOfEducation} years of education, needs ${check.value}` }
  }
  return null
}

function diagnoseOne(opp, facts) {
  for (const rule of opp.eligibility_rules ?? []) {
    if (rule.rule_type !== 'mechanical' || !rule.check) continue
    const result = evalMechanicalCheck(rule.check, facts)
    if (result && !result.pass) {
      return { type: 'BLOCKED', rule_type: 'mechanical', reason: `${rule.rule_text} (${result.detail})`, blocking_rule_quote: rule.source_quote, blocking_rule_source_url: rule.source_url, fit_score: null, gaps: [], verification_required: false }
    }
  }
  if (opp.status === 'expired' || opp.status === 'paused') {
    if (LATE_WINDOW_TITLES.has(opp.title)) return { type: 'LATE_WINDOW', reason: "Late applications accepted — see the programme's own late-application route.", fit_score: null, gaps: [], verification_required: false }
    return { type: 'EXPIRED', fit_score: null, gaps: [], verification_required: false }
  }
  if (opp.status === 'not_yet_open') return { type: 'NOT_YET_OPEN', fit_score: fitScore(opp.field_tags, facts.fingerprintKeywords), gaps: [], verification_required: false }

  const gaps = []
  let verification_required = false
  for (const req of opp.requirements ?? []) {
    const invKey = INVENTORY_KEY[req.type]
    const expired = !!req.valid_until && req.valid_until < facts.today
    const satisfied = invKey ? facts.documentInventory?.[invKey] === 'ready' : req.satisfied && !expired
    if (!satisfied) gaps.push({ type: REQUIREMENT_GAP_TYPE[req.type] ?? 'document', label: req.label, action_label: req.satisfying_action ?? req.label })
  }
  const acceptsBachelor = (opp.degree_levels_accepted ?? []).length === 0 || opp.degree_levels_accepted.includes('undergraduate')
  if (!acceptsBachelor) {
    const label = "Confirm this programme accepts bachelor's-only applicants — not stated on the official page"
    gaps.push({ type: 'record', label, action_label: label })
    verification_required = true
  }
  for (const rule of opp.eligibility_rules ?? []) {
    if (rule.rule_type !== 'discretionary') continue
    gaps.push({ type: 'record', label: rule.rule_text, action_label: rule.satisfying_action ?? rule.rule_text })
    if (rule.verification_only) verification_required = true
  }
  return { type: gaps.length > 0 ? 'GAP' : 'READY', fit_score: fitScore(opp.field_tags, facts.fingerprintKeywords), gaps, verification_required }
}

function computeReadySince(prev, newType) {
  if (newType === 'READY') return prev?.type === 'READY' && prev.ready_since ? prev.ready_since : new Date().toISOString()
  return prev?.ready_since ?? null
}

async function main() {
  const { data: snapshot, error: snapErr } = await admin.from('profile_snapshots').select('*').eq('is_current', true).eq('user_id', USER_ID).single()
  if (snapErr || !snapshot) throw new Error(`No current profile snapshot: ${snapErr?.message}`)

  const { data: postDegreeHours } = await admin.rpc('post_degree_hours', { p_user_id: USER_ID })
  const facts = {
    citizenship: snapshot.identity.citizenship,
    hasCompletedDegree: /completed/i.test(snapshot.identity.current_degree_level),
    isCurrentlyUndergradEnrolled: false,
    isCurrentPhdStudent: false,
    postDegreeHours: postDegreeHours ?? 0,
    yearsOfEducation: snapshot.identity.years_of_education,
    fingerprintKeywords: extractFingerprintKeywords(snapshot.research_fingerprint),
    documentInventory: snapshot.document_inventory ?? null,
    today: new Date().toISOString().slice(0, 10),
  }

  const { data: opportunities, error: oppErr } = await admin.from('opportunities').select('*')
  if (oppErr) throw new Error(`Could not load opportunities: ${oppErr.message}`)
  console.log(`Re-diagnosing ${opportunities.length} rows against snapshot v${snapshot.version}...`)

  const diagnoses = opportunities.map((opp) => ({ opp, result: diagnoseOne(opp, facts) }))

  const [{ data: prevVerdicts }] = await Promise.all([
    admin.from('verdicts').select('id, opportunity_id, type, ready_since').eq('snapshot_version', snapshot.version).eq('user_id', USER_ID),
  ])
  const prevVerdictByOpp = new Map((prevVerdicts ?? []).map((v) => [v.opportunity_id, v]))

  const verdictRows = diagnoses.map(({ opp, result }) => ({
    user_id: USER_ID, opportunity_id: opp.id, snapshot_version: snapshot.version, type: result.type, rule_type: result.rule_type,
    reason: result.reason, blocking_rule_quote: result.blocking_rule_quote, blocking_rule_source_url: result.blocking_rule_source_url,
    fit_score: result.fit_score, ready_since: computeReadySince(prevVerdictByOpp.get(opp.id), result.type),
    verification_required: result.verification_required,
  }))
  const { data: insertedVerdicts, error: verdictErr } = await admin.from('verdicts').insert(verdictRows).select('id, opportunity_id')
  if (verdictErr) throw new Error(`Verdict batch insert failed: ${verdictErr.message}`)

  const verdictIdByOpp = new Map(insertedVerdicts.map((v) => [v.opportunity_id, v.id]))
  const gapRows = diagnoses.flatMap(({ opp, result }) => result.gaps.map((g) => ({ ...g, ...GAP_TYPE_DEFAULTS[g.type], user_id: USER_ID, opportunity_id: opp.id, verdict_id: verdictIdByOpp.get(opp.id) })))
  if (gapRows.length > 0) {
    const { error: gapErr } = await admin.from('gaps').insert(gapRows)
    if (gapErr) throw new Error(`Gap batch insert failed: ${gapErr.message}`)
  }

  const oldVerdictIds = (prevVerdicts ?? []).map((v) => v.id)
  if (oldVerdictIds.length > 0) await admin.from('verdicts').delete().in('id', oldVerdictIds)

  console.log(`Done. ${insertedVerdicts.length} verdicts written, ${gapRows.length} gaps written.`)

  const dist = await admin.from('verdicts').select('type, verification_required').eq('user_id', USER_ID)
  const counts = {}
  for (const r of dist.data) {
    const key = r.type === 'GAP' ? (r.verification_required ? 'GAP (pending verification)' : 'GAP (real)') : r.type
    counts[key] = (counts[key] ?? 0) + 1
  }
  console.log('\nNew verdict distribution:', counts)
}

main().catch((e) => { console.error(e); process.exit(1) })
