// Three data corrections, 19 Nov 2026. Idempotent.
//
// 1. Informational rules. A discretionary rule that states a fact rather
//    than a condition ("GRE is not required", "Funding is guaranteed")
//    became a gap to close. Each of the texts below was read by hand and
//    judged a statement of fact; they get `informational: true`, which the
//    engine skips for gaps. Anything soft but real ("GRE is optional,
//    strongly recommended", "minimum 3.0 GPA") is left as a condition.
//
// 2. Duplicate requirement labels. Pure synonyms of the same document
//    ("transcript" / "transcripts" / "Transcripts") are merged to one
//    canonical label per type. Labels that carry a real qualifier
//    ("official transcript", "advisor reference") are left alone.
//
// 3. The two 1-December programmes added to the brief: Mundus MAPP (both
//    rows) and the East-West Center Graduate Degree Fellowship.
//
// Usage: node --env-file=.env.local scripts/backfill-informational-and-labels.mjs
import { createClient } from '@supabase/supabase-js'

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

// ---------------------------------------------------------------- 1
const INFORMATIONAL = new Set([
  'GRE scores are not required.',
  'GRE is optional.',
  'GRE scores are not used in admission.',
  "A bachelor's degree is sufficient; bachelor's applicants are admitted into the PhD programme.",
  "Bachelor's is the stated general requirement; an M.S. is referenced as helpful, not required.",
  'GRE is not required for 2027–28 admission; scores are given no extra weight. Under review for Fall 2028.',
  'GRE scores are not required for either M.S. or Ph.D. applications for Fall 2027.',
  "A master's degree is not needed to apply to the PhD.",
  "Students are admitted directly to the PhD; a master's is not required.",
  "Applicants with a bachelor's degree in engineering are invited to apply.",
  'GRE scores are optional this cycle.',
  'All admitted PhD students are fully funded.',
  'GRE scores are neither required nor accepted.',
  "A completed bachelor's is required; EE doctoral applicants are admitted initially for the MSEE, with PhD admission evaluated during that year.",
  'Financial aid includes a full tuition scholarship.',
  "A bachelor's in electrical or computer engineering or a related field qualifies for the direct PhD.",
  'GRE scores are optional.',
  "A bachelor's degree (or its equivalent) is required; a master's is not.",
  'Funding is guaranteed.',
  "Bachelor's-level applicants are considered for the direct PhD.",
  'Funding follows the priority deadline.',
  "A four-year bachelor's in engineering, mathematics or a hard science qualifies.",
  'GRE is not required for 2027 applications.',
  'GRE is not required for Fall 2027.',
  "A bachelor's degree or foreign equivalent is sufficient.",
  'GRE is not required.',
  'There is no application fee.',
  'Visa support is offered.',
  'No age restriction; can be based anywhere.',
  'Rolling review, no deadline.',
  'No formal eligibility rule beyond ambition.',
  'International students are eligible; students apply directly.',
  'Pakistan is an eligible country.',
  'GRE scores are not required and not accepted.',
  "Accepts direct entry from a Bachelor's degree — a 5–6 year full-time commitment starting with a Bachelor's.",
  "A master's is not required prior to applying to the PhD program in Electrical Engineering.",
  'No minimum GPA is required to secure admission.',
  'GRE scores are not considered.',
])

// ---------------------------------------------------------------- 2
// [type, exact labels (case-insensitive) that are pure synonyms, canonical]
const MERGES = [
  ['transcript', ['transcript', 'transcripts', 'academic records', 'transcripts (copies)', 'transcripts (unofficial pdfs) and degree certificate'], 'Transcripts'],
  ['cv', ['cv', 'cv / résumé', 'resume', 'résumé', 'cv / resume'], 'CV / résumé'],
  ['sop', ['statement of purpose', 'statement', 'statement of objectives'], 'Statement of purpose'],
  ['sop', ['motivation', 'two-page motivation', 'motivation letter'], 'Motivation letter'],
  ['research_proposal', ['research proposal'], 'Research proposal'],
  ['lor', ['3 references', 'three references', '3× letters of recommendation'], '3× letters of recommendation'],
  ['lor', ['two references', '2 references', '2× letters of recommendation'], '2× letters of recommendation'],
  ['lor', ['references', 'reference', 'letters of recommendation'], 'Letters of recommendation'],
]
function canonicalLabel(type, label) {
  const l = label.trim().toLowerCase()
  for (const [t, synonyms, canonical] of MERGES) if (t === type && synonyms.includes(l)) return canonical
  return label
}

// ---------------------------------------------------------------- 3
const CHECKED = '2026-11-19'
const q = (text, source_url) => ({ text, source_url })
const fact = (topic, status, summary, quotes = [], note = null) => ({ topic, status, summary, quotes, note })
const MAPP_REQ = 'https://www.mundusmapp.org/admissions-requirements/'
const MAPP_CAL = 'https://www.mundusmapp.org/admissions-calendar/'
const MAPP_CHK = 'https://www.mundusmapp.org/admissions-checklist/'
const MAPP_HOW = 'https://www.mundusmapp.org/how-to-apply/'
const MAPP_PORTAL = 'https://sits.ceu.edu/urd/sits.urd/run/siw_ipp_lgn.login?process=siw_ipp_app_crs'

const MAPP_BLOCK = {
  rule_text: 'Holders of a bachelor\'s degree in Natural Sciences or Engineering are not eligible to apply.',
  rule_type: 'mechanical',
  source_quote: 'candidates with a Bachelors degree in Natural Sciences or Engineering are not eligible to apply.',
  source_url: MAPP_REQ,
  check: { kind: 'degree_field_excluded', value: ['engineering', 'natural science'] },
}
const MAPP_DETAILS = {
  portal_url: MAPP_PORTAL,
  portal_status: 'verified',
  checked_on: CHECKED,
  items: [
    fact('deadline', 'verified', '1 December 2026, 23:59 CET, for applicants who want financial aid (the Erasmus Mundus scholarship round).', [q('December 1, 2026, 23:59 Central European Time (CET)', MAPP_CAL)]),
    fact('letters', 'verified', 'Two letters, preferably one academic. They may arrive up to 7 days after you submit; referees get the link only after submission.', [q('The recommendation letters need to be submitted within 7 days of the application submission.', MAPP_CHK)]),
    fact('portal', 'verified', 'Online form on Central European University\'s application system.', [q('Candidates are required to fill in an online application form', MAPP_HOW)]),
    fact('transcripts', 'verified', 'Scanned official English translations of transcript and diploma at application; official hard copies only after admission.', [q('Applicants must submit with the online application form a scanned image of:', MAPP_CHK)]),
    fact('english', 'verified', 'IELTS 7, TOEFL iBT 95, PTE 76 or Duolingo 130, within two years. Late scores are not accepted — the score must be in the application by 1 December.', [
      q('Late submission of test scores is not permitted.', MAPP_REQ),
    ], 'Pakistan is not on the citizenship exemption list.'),
    fact('fee', 'verified', 'No CEU application fee for Mundus MAPP.', [q('Applicants do not need to pay the CEU application fee unless they apply for other CEU programs.', MAPP_HOW)]),
  ],
}

const EWC_SUB = 'https://eastwestcenter.submittable.com/submit/857a8977-8023-4560-a3a8-bbc0cc7c460d/graduate-degree-fellowship-2027'
const UH_DOCS = 'https://manoa.hawaii.edu/graduate/documentation-requirements/index.php'
const UH_ELP = 'https://manoa.hawaii.edu/graduate/english-proficiency-exemption-eligibility/index.php'
const unread = (topic, where) => fact(topic, 'unverified', 'Not read: eastwestcenter.org refused the fetch on 19 Nov 2026.', [], `Check ${where} directly.`)
const EWC_DETAILS = {
  portal_url: EWC_SUB,
  portal_status: 'verified',
  checked_on: CHECKED,
  items: [
    fact('deadline', 'verified', '1 December, 11:59 PM Hawaii time (year not printed; the form is titled 2027). The fellowship form needs proof that you have already applied to UH Mānoa.', [
      q('You must submit your Fellowship application by 11:59 PM (Hawaii Standard Time) on December 1', EWC_SUB),
      q('You will not be able to submit this fellowship application without uploading either the proof of UH application submission', EWC_SUB),
    ], 'UH Mānoa\'s own deadline is set by each graduate programme and was not found.'),
    fact('letters', 'unverified', 'The form asks for contact details of three references; whether letters must arrive by the deadline is not stated.', [q('Name and contact information for each of your three references', EWC_SUB)]),
    fact('transcripts', 'verified', 'UH Mānoa: unofficial transcripts at application, official only if admitted.', [q("Please upload an unofficial transcript from each post-secondary institution you've attended when you submit your application.", UH_DOCS)]),
    fact('english', 'verified', 'UH Mānoa accepts Duolingo (minimum 90), IELTS 5.5, TOEFL iBT 61 / 3.5 on the new scale; programmes may set higher. Unofficial scores are accepted while applying.', [
      q('Applicants may submit unofficial scores while applying for admission.', UH_ELP),
    ], 'Pakistan is not on UH Mānoa\'s exempt-country list.'),
    fact('fee', 'verified', 'UH Mānoa application fee $100, card only. Fellowship fee not stated.', [q('Application fee is $100 for all applicants.', UH_DOCS)]),
    unread('fee_waiver', 'eastwestcenter.org/gdf'),
  ],
}

async function run() {
  const { data: opps, error } = await admin.from('opportunities').select('id, title, eligibility_rules, requirements')
  if (error) throw new Error(error.message)

  let flagged = 0
  let relabelled = 0
  for (const o of opps) {
    let changed = false
    const rules = (o.eligibility_rules ?? []).map((r) => {
      if (r.rule_type === 'discretionary' && INFORMATIONAL.has(r.rule_text) && !r.informational) {
        flagged++
        changed = true
        return { ...r, informational: true }
      }
      return r
    })
    const reqs = (o.requirements ?? []).map((r) => {
      const label = canonicalLabel(r.type, r.label)
      if (label !== r.label) {
        relabelled++
        changed = true
        return { ...r, label }
      }
      return r
    })
    if (!changed) continue
    const { error: e } = await admin.from('opportunities').update({ eligibility_rules: rules, requirements: reqs }).eq('id', o.id)
    if (e) console.error(`FAILED ${o.title}:`, e.message)
  }
  console.log(`informational rules flagged: ${flagged} (of ${INFORMATIONAL.size} curated texts)`)
  console.log(`requirement labels merged: ${relabelled}`)

  for (const title of ['Mundus MAPP financial-aid round', 'Erasmus Mundus Joint Masters — MAPP (Public Policy)']) {
    const row = opps.find((o) => o.title === title)
    if (!row) { console.error(`no row: ${title}`); continue }
    const rules = (row.eligibility_rules ?? []).filter((r) => r.source_url !== MAPP_REQ || r.rule_type !== 'mechanical')
    const { error: e } = await admin.from('opportunities').update({
      eligibility_rules: [MAPP_BLOCK, ...rules],
      application_details: MAPP_DETAILS,
      apply_url: MAPP_PORTAL,
      verified_on: CHECKED,
    }).eq('id', row.id)
    console.log(e ? `FAILED ${title}: ${e.message}` : `OK ${title}`)
  }

  {
    const title = 'East-West Center Graduate Degree Fellowship 2027'
    const { error: e } = await admin.from('opportunities').update({ application_details: EWC_DETAILS, verified_on: CHECKED }).eq('title', title)
    console.log(e ? `FAILED ${title}: ${e.message}` : `OK ${title}`)
  }
}

run()
