// Two curation passes, both persisted as data (not re-derived at
// diagnosis time):
//
// 1. satisfying_action on specific requirements/rules — the two concrete
//    cases named explicitly: IELTS 7.0 clears Berkeley, UCLA, Stanford,
//    UCSD and Rice's English requirements simultaneously (even though
//    Berkeley rejects Duolingo and UCSD/Rice accept it — the rows stay
//    distinct, only the action they share is unified); and "transcript"
//    vs "transcripts" (etc.) are the same action under different wording.
//    Deliberately narrow — these are the two cases actually verified by
//    name. Broader groups (references/LOR wording, motivation/SOP
//    wording) look like the same class of problem but weren't in scope
//    here; flagged in the report, not fixed.
//
// 2. verification_only on every discretionary eligibility_rule pool-wide
//    — true when the rule records the PAGE'S OWN SILENCE ("not stated",
//    "doesn't state", "not published", "unconfirmed"), false when the
//    page states an actual (if soft) preference ("typically requires",
//    "preferred", "strongly recommended"). Heuristic (regex over
//    rule_text), applied once and stored — lib/diagnostic-engine.ts reads
//    the stored flag directly, it does not re-run this regex at diagnosis
//    time.
import { createClient } from '@supabase/supabase-js'

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

const IELTS_ACTION = 'Sit IELTS, score ≥ 7.0'
const IELTS_TITLES = new Set(['UC Berkeley EECS — PhD', 'UCLA Electrical & Computer Engineering — PhD', 'Stanford Electrical Engineering — PhD', 'UCSD ECE — PhD', 'Rice ECE — PhD'])

const TRANSCRIPT_ACTION = 'Request official transcripts'
const TRANSCRIPT_LABELS = new Set(['transcripts', 'transcript', 'official transcript', 'academic records'])

const NOT_STATED_PATTERN = /not stated|doesn.t state|not published|not confirmed|unverified|unpublished|unconfirmed/i

async function main() {
  const { data: opps, error } = await admin.from('opportunities').select('id, title, requirements, eligibility_rules')
  if (error) throw error

  let reqActionsSet = 0
  let ruleActionsSet = 0
  let ruleFlagsSet = 0
  let rowsTouched = 0

  for (const opp of opps) {
    let changed = false

    const nextRequirements = (opp.requirements ?? []).map((req) => {
      if (req.type === 'language_test' && IELTS_TITLES.has(opp.title) && req.satisfying_action !== IELTS_ACTION) {
        changed = true; reqActionsSet++
        return { ...req, satisfying_action: IELTS_ACTION }
      }
      if (req.type === 'transcript' && TRANSCRIPT_LABELS.has((req.label ?? '').trim().toLowerCase()) && req.satisfying_action !== TRANSCRIPT_ACTION) {
        changed = true; reqActionsSet++
        return { ...req, satisfying_action: TRANSCRIPT_ACTION }
      }
      return req
    })

    const nextRules = (opp.eligibility_rules ?? []).map((rule) => {
      let r = rule
      if (r.rule_type === 'discretionary') {
        const verificationOnly = NOT_STATED_PATTERN.test(r.rule_text)
        if (r.verification_only !== verificationOnly) { changed = true; ruleFlagsSet++; r = { ...r, verification_only: verificationOnly } }
      }
      if (IELTS_TITLES.has(opp.title) && /english|ielts|toefl/i.test(r.rule_text) && r.satisfying_action !== IELTS_ACTION) {
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

  console.log(`\nDone. ${reqActionsSet} requirement action(s), ${ruleActionsSet} rule action(s), ${ruleFlagsSet} verification_only flag(s) set, across ${rowsTouched} row(s).`)
}

main()
