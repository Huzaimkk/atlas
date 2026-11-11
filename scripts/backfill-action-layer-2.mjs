// Second action-layer curation pass. Two unrelated fixes bundled because
// both were requested together:
//
// 1. Finishes the action layer started in backfill-actions-and-
//    verification.mjs: curates satisfying_action on the requirement
//    buckets that were still showing their raw label (CV, degree,
//    references, motivation, research proposal), and merges IMPRS/
//    MBZUAI/EMAI's English-evidence requirements into the same "Sit
//    IELTS, score >= 7.0" action already used by Berkeley/UCLA/Stanford —
//    verified first (see report) that each institution's own stated
//    minimum (MBZUAI: IELTS Academic 6.5, official admission policy;
//    EMAI: IELTS 6.5, corroborated by three independent secondary
//    sources, official page blocked both attempts) is cleared by 7.0.
//    IMPRS is deliberately NOT merged — its own application page states
//    no numeric minimum at all ("TOEFL scores or other evidence of
//    English proficiency"), so there is no threshold for 7.0 to clear;
//    it gets its own honest action instead.
//
// 2. UCSD and Rice's language_test requirements are flipped from
//    satisfied:true to false. Not an expiry case — the profile's own
//    pending_items record says the only Duolingo result on file (120/160)
//    is "an interim/practice indicator only, not an official IELTS/TOEFL
//    score," with no official sitting booked. There is no test date to
//    check an expiry window against; the credential simply doesn't exist
//    yet. Labels are reworded to say so, while keeping the margin framing
//    (UCSD's zero margin vs Rice's 5-point margin) for when an official
//    score does exist.
import { createClient } from '@supabase/supabase-js'

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

const IELTS_ACTION = 'Sit IELTS, score ≥ 7.0'

// Exact-label buckets only — same discipline as the first pass: merge
// what's actually the same action, never collapse rows whose label
// carries a different fact (a page-specific count like "two references"
// or "three-page motivation" stays distinct).
const ENGLISH_MERGE_TITLES = new Set([
  'MBZUAI research MSc funding',
  'MBZUAI Global Research Internship (MGRIP)',
  'MBZUAI PhD funding',
  'EMAI master’s 2027 self-funded round',
])
const IMPRS_TITLE = 'IMPRS for Intelligent Systems PhD'
const IMPRS_ACTION = 'Submit TOEFL score or other evidence of English proficiency (no fixed minimum stated on the official page)'
const UK_CDT_TITLE = 'UK EPSRC Centres for Doctoral Training / Integrated PhD programmes'

const UCSD_TITLE = 'UCSD ECE — PhD'
const RICE_TITLE = 'Rice ECE — PhD'

async function main() {
  const { data: opps, error } = await admin.from('opportunities').select('id, title, requirements, eligibility_rules')
  if (error) throw error

  let reqActionsSet = 0
  let ruleActionsSet = 0
  let englishFlipped = 0
  let rowsTouched = 0

  for (const opp of opps) {
    let changed = false
    let nextRequirements = opp.requirements ?? []
    let nextRules = opp.eligibility_rules ?? []

    nextRequirements = nextRequirements.map((req) => {
      let r = req

      // English merge (MBZUAI x3, EMAI)
      if (ENGLISH_MERGE_TITLES.has(opp.title) && r.type === 'language_test' && r.satisfying_action !== IELTS_ACTION) {
        changed = true; reqActionsSet++
        r = { ...r, satisfying_action: IELTS_ACTION }
      }
      // IMPRS English — own honest action, not merged
      if (opp.title === IMPRS_TITLE && r.type === 'language_test' && r.satisfying_action !== IMPRS_ACTION) {
        changed = true; reqActionsSet++
        r = { ...r, satisfying_action: IMPRS_ACTION }
      }
      // CV
      if (r.type === 'cv' && !r.satisfying_action) {
        changed = true; reqActionsSet++
        r = { ...r, satisfying_action: 'Update CV' }
      }
      // degree (exact label "degree" only — "degree evidence" etc. stay distinct)
      if (r.type === 'other' && (r.label ?? '').trim().toLowerCase() === 'degree' && !r.satisfying_action) {
        changed = true; reqActionsSet++
        r = { ...r, satisfying_action: "Confirm bachelor's degree meets programme's field and GPA requirements" }
      }
      // references (exact label "references" only)
      if (r.type === 'lor' && (r.label ?? '').trim().toLowerCase() === 'references' && !r.satisfying_action) {
        changed = true; reqActionsSet++
        r = { ...r, satisfying_action: 'Secure letters of recommendation' }
      }
      // motivation (exact label "motivation" only)
      if (r.type === 'sop' && (r.label ?? '').trim().toLowerCase() === 'motivation' && !r.satisfying_action) {
        changed = true; reqActionsSet++
        r = { ...r, satisfying_action: 'Draft statement of purpose / motivation letter' }
      }
      // research proposal (exact label "research proposal" only)
      if (r.type === 'research_proposal' && (r.label ?? '').trim().toLowerCase() === 'research proposal' && !r.satisfying_action) {
        changed = true; reqActionsSet++
        r = { ...r, satisfying_action: 'Draft research proposal' }
      }

      // UCSD / Rice — the practice-DET correction
      if (opp.title === UCSD_TITLE && r.type === 'language_test' && r.satisfied === true) {
        changed = true; englishFlipped++
        r = {
          ...r,
          satisfied: false,
          label: 'Duolingo English Test min 120 — profile’s DET 120/160 is an interim/practice score, not an official sitting (zero margin even once retaken)',
        }
      }
      if (opp.title === RICE_TITLE && r.type === 'language_test' && r.satisfied === true) {
        changed = true; englishFlipped++
        r = {
          ...r,
          satisfied: false,
          label: 'TOEFL iBT 90 / IELTS 7 / Duolingo 115 — profile’s DET 120/160 is an interim/practice score, not an official sitting (would clear with margin once official)',
        }
      }

      return r
    })

    nextRules = nextRules.map((rule) => {
      let r = rule
      // UK CDT — stored for consistency; excluded from action_queue by
      // migration 0014 regardless, since this stays a discretionary
      // (record-type) rule.
      if (opp.title === UK_CDT_TITLE && /ielts/i.test(r.rule_text) && r.satisfying_action !== IELTS_ACTION) {
        changed = true; ruleActionsSet++
        r = { ...r, satisfying_action: IELTS_ACTION }
      }
      return r
    })

    if (!changed) continue
    const { error: updateErr } = await admin.from('opportunities').update({ requirements: nextRequirements, eligibility_rules: nextRules }).eq('id', opp.id)
    if (updateErr) console.error(`FAILED "${opp.title}":`, updateErr.message)
    else { rowsTouched++; console.log(`OK "${opp.title}"`) }
  }

  console.log(`\nDone. ${reqActionsSet} requirement action(s), ${ruleActionsSet} rule action(s), ${englishFlipped} English-credential flip(s) (UCSD/Rice), across ${rowsTouched} row(s).`)
}

main()
