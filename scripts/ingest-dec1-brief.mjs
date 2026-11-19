// Ingest the 1-December brief (pages read 19 Nov 2026) into the five
// programmes' rows: application_details (migration 0015) plus corrected
// English requirements. Facts the fetch could not read are recorded with
// status 'unverified', never left blank. Conflicts keep both quotes.
//
// Usage: node --env-file=.env.local scripts/ingest-dec1-brief.mjs
// Then:  node --env-file=.env.local scripts/rediagnose.mjs
import { createClient } from '@supabase/supabase-js'

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
const CHECKED = '2026-11-19'
const IELTS = 'Sit IELTS, score ≥ 7.0'

const q = (text, source_url) => ({ text, source_url })
const fact = (topic, status, summary, quotes = [], note = null) => ({ topic, status, summary, quotes, note })
const unread = (topic, where) =>
  fact(topic, 'unverified', 'Not read: the official page could not be fetched on 19 Nov 2026.', [], `Check ${where} directly before relying on this.`)

// ---------------------------------------------------------------------------
const BK = 'https://eecs.berkeley.edu/academics/graduate/research-programs/admissions/'
const BK_FAQ = 'https://grad.berkeley.edu/admissions/application-process/faq/'
const BK_REQ = 'https://grad.berkeley.edu/admissions/steps-to-apply/requirements/'
const BK_FEE = 'https://grad.berkeley.edu/admissions/application-process/fee-waiver/'

const berkeley = {
  title: 'UC Berkeley EECS — PhD',
  patch: {
    apply_url: 'https://gradapp.berkeley.edu/apply/',
    application_details: {
      portal_url: 'https://gradapp.berkeley.edu/apply/',
      portal_status: 'verified',
      checked_on: CHECKED,
      items: [
        fact('deadline', 'verified', '1 December 2026, 8:59 PM PST. The system will not accept a submission after it; the fee must be paid within 3 days or the application is not reviewed.', [
          q('The deadline to apply is December 1, 2026, at 8:59 pm PST.', BK),
          q('Payment must be made by credit card and submitted within 3 days of the application deadline.', BK_FAQ),
        ]),
        fact(
          'letters',
          'conflicting',
          'Three letters. The Graduate Division says letters can be uploaded after the deadline; the EECS page says no late materials. Not resolved — ask EECS.',
          [
            q('The system does allow recommendations to be submitted after the deadline. Please check with the program you are applying to', BK_FAQ),
            q('Late applications or materials will not be accepted.', BK),
            q('Three Letters of Recommendation uploaded as PDFs through the link provided in the online application.', BK),
          ],
          'You can submit the application before all letters are in: "Yes, you can submit your application before all of your letters are submitted."'
        ),
        fact('transcripts', 'verified', 'Unofficial PDF copies at application; upload the degree certificate too if the transcript does not show the award. Official copies only if admitted.', [
          q('Upload unofficial copies/PDFs of your transcripts from all the higher education institutions you attended.', BK),
          q('If you are offered admission to graduate study, you will be required to submit official transcripts at a later time.', BK_FAQ),
        ]),
        fact(
          'english',
          'verified',
          'Required for Pakistan. IELTS 7.0 overall with 6.5 in Speaking and Writing, or TOEFL (tests from 21 Jan 2026) 5 total with 4.5 Speaking and Writing. Duolingo not accepted. Take the test by November; score reports are accepted after the deadline.',
          [
            q('7 overall band score, with 6.5 minimum Speaking and Writing section scores', BK_REQ),
            q('We do not accept the Duolingo exam, TOEFL ITP, My Best Scores, IELTS Indicator, or IELTS One Test Retake.', BK_REQ),
            q('you need to take the TOEFL or IELTS exam by November.', BK),
            q('we accept score reports past the application deadline.', BK_FAQ),
          ],
          'No cutoff for late score reports is stated.'
        ),
        fact('fee', 'verified', '$155 for international applicants, plus a 4.22% card processing fee.', [
          q('The non-refundable application fee is $135 for U.S. citizens and current permanent residents and $155 for all other applicants.', BK_REQ),
        ]),
        fact('fee_waiver', 'verified', 'No waiver for international applicants.', [q('U.S. citizens or current permanent residents may be eligible for an application fee waiver.', BK_FEE)]),
      ],
    },
    eligibility_rules: [
      {
        rule_text: 'English: IELTS 7.0 overall with 6.5 in Speaking and Writing, or TOEFL; the Duolingo English Test is not accepted.',
        rule_type: 'mechanical',
        source_quote: '7 overall band score, with 6.5 minimum Speaking and Writing section scores',
        source_url: BK_REQ,
        satisfying_action: IELTS,
      },
      {
        rule_text: 'GRE scores are not required and not accepted.',
        rule_type: 'discretionary',
        source_quote: 'GRE: Not required, not accepted',
        source_url: BK,
        verification_only: false,
      },
      {
        rule_text: "Accepts direct entry from a Bachelor's degree — a 5–6 year full-time commitment starting with a Bachelor's.",
        rule_type: 'discretionary',
        source_quote: "5–6 year full-time commitment starting with a Bachelor's",
        source_url: BK,
        verification_only: false,
      },
    ],
    requirements: [
      { type: 'language_test', label: 'IELTS 7.0 (6.5 Speaking & Writing) or TOEFL — Duolingo not accepted', satisfied: false, satisfying_action: IELTS },
      { type: 'lor', label: '3× letters of recommendation', count: 3, satisfied: false },
      { type: 'transcript', label: 'Transcripts (unofficial PDFs) and degree certificate', satisfied: false },
    ],
  },
}

// ---------------------------------------------------------------------------
const MIT = 'https://www.eecs.mit.edu/academics/graduate-programs/admission-process/'
const MIT_FAQ = 'https://www.eecs.mit.edu/academics/graduate-programs/admission-process/graduate-admissions-faqs/'
const MIT_ELP = 'https://oge.mit.edu/graduate-admissions/admissions-policies/elp-test-requirement/'
const MIT_EX = 'https://oge.mit.edu/graduate-admissions/admissions-policies/elp-test-requirement/elp-exemptions/'
const MIT_FW = 'https://oge.mit.edu/graduate-admissions/applications/application-fee-waiver/'

const mit = {
  title: 'MIT EECS — PhD',
  patch: {
    apply_url: 'https://apply.mit.edu/apply/',
    application_details: {
      portal_url: 'https://apply.mit.edu/apply/',
      portal_status: 'verified',
      checked_on: CHECKED,
      items: [
        fact('deadline', 'verified', '1 December 2026. Time of day is not stated; the application system shuts down that day.', [
          q('The deadline for submitting completed applications is December 1, 2026.', MIT),
          q('the online application system will shut down that day.', MIT_FAQ),
        ], 'The admission page still refers to "admission in September 2026", so it has not been fully updated for this cycle.'),
        fact('letters', 'verified', 'Three letters. The letter system stays open for several weeks after 1 December; aim for early January.', [
          q('However, the online letter system will stay open for several more weeks.', MIT_FAQ),
          q('Your letters and transcripts should be uploaded to the online application by early January.', MIT_FAQ),
        ]),
        fact('transcripts', 'verified', 'Copies uploaded to the application; official transcripts only from admitted students.', [
          q('Copies of transcripts are uploaded to the application.', MIT_FAQ),
          q('All admitted students will be required to send official transcripts to the EECS Graduate Office', MIT_FAQ),
        ]),
        fact(
          'english',
          'conflicting',
          'Duolingo, IELTS or TOEFL. IELTS 7, TOEFL iBT 100. The Duolingo minimum differs: 130 on the EECS page, 135 on MIT\'s central page. IELTS/TOEFL results are accepted after the deadline. No exemption for a Pakistani degree.',
          [
            q('EECS requires a minimum of 130 on the Duolingo English test.', MIT_FAQ),
            q('DET*: 135 minimum score', MIT_ELP),
            q('Department minimum score requirements supersede GradAdmissions recommended minimum scores.', MIT_ELP),
            q('we will continue to accept IELTS/TOEFL Test results after the deadline.', MIT_FAQ),
          ],
          'MIT\'s automatic exemption lists only Australia, Canada, Ireland, New Zealand, the UK and the US, and "does not accept requests for ELP test exemptions." (' + MIT_EX + ')'
        ),
        fact('fee', 'verified', '$90.', [q('Applying to the EECS graduate program requires a fee of $90 US dollars', MIT_FAQ)]),
        fact(
          'fee_waiver',
          'passed',
          'Request deadline was 18 November 2026 and has passed. International applicants qualified only if already at a US university and in a select research-preparation programme.',
          [
            q('Fee waiver requests are due by November 18 for all programs with a December 1 application deadline', MIT_FW),
            q('cannot consider fee waiver requests solely on the basis of financial hardship for our international applicants.', MIT_FW),
          ]
        ),
      ],
    },
    requirements: [
      { type: 'language_test', label: 'Duolingo ≥ 130 (EECS; MIT central page says 135), IELTS ≥ 7 or TOEFL iBT ≥ 100', satisfied: false, satisfying_action: IELTS },
      { type: 'lor', label: '3× letters of recommendation', count: 3, satisfied: false },
      { type: 'sop', label: 'Statement of purpose', satisfied: false },
      { type: 'transcript', label: 'Transcripts (copies)', satisfied: false },
      { type: 'cv', label: 'CV / résumé', satisfied: false },
    ],
  },
}

// ---------------------------------------------------------------------------
const PU = 'https://engineering.purdue.edu/ECE/Academics/Graduates/Admissions'
const PU_OGSPS = 'purdue.edu/academics/ogsps/admissions/how-to-apply/'

const purdue = {
  title: 'Purdue ECE — PhD',
  patch: {
    apply_url: 'https://gradapply.purdue.edu/apply/',
    application_details: {
      portal_url: 'https://gradapply.purdue.edu/apply/',
      portal_status: 'verified',
      checked_on: CHECKED,
      items: [
        fact('deadline', 'verified', '1 December is the priority date for funding; 1 April is final. No year printed. Whether 1 December means a complete file or only submission is not stated.', [
          q('December 1 – Priority', PU),
          q('*December 1 is the deadline for priority consideration for financial support.', PU),
        ]),
        unread('letters', PU_OGSPS),
        fact('portal', 'verified', 'The ECE page links the Graduate School\'s online application system.', [q('Check the status of your application in the online application system', PU)]),
        unread('transcripts', PU_OGSPS),
        fact(
          'english',
          'verified',
          'TOEFL or IELTS, with a writing-section minimum: IELTS writing 6, or TOEFL writing 4.5 (tests on or after 21 Jan 2026). Duolingo not stated. Late score reports not stated.',
          [
            q('accepts either TOEFL or IELTS scores.', PU),
            q('IELTS: 6 or higher', PU),
            q('We will not review an application where the scores do not meet these requirements except for exceptional PhD applicants', PU),
          ],
          'Overall minimums sit on the Graduate School page, which could not be read.'
        ),
        unread('fee', PU_OGSPS),
        unread('fee_waiver', PU_OGSPS),
      ],
    },
    requirements: [
      { type: 'language_test', label: 'TOEFL or IELTS with writing ≥ 6 (IELTS) / ≥ 4.5 (TOEFL)', satisfied: false, satisfying_action: IELTS },
      { type: 'lor', label: '3× letters of recommendation', count: 3, satisfied: false },
      { type: 'sop', label: 'Statement of purpose', satisfied: false },
      { type: 'transcript', label: 'Transcripts', satisfied: false },
      { type: 'cv', label: 'CV / résumé', satisfied: false },
    ],
  },
}

// ---------------------------------------------------------------------------
const ST = 'https://ee.stanford.edu/admissions/phd'
const stanford = {
  title: 'Stanford Electrical Engineering — PhD',
  patch: {
    application_details: {
      portal_url: null,
      portal_status: 'unverified',
      checked_on: CHECKED,
      items: [
        fact('deadline', 'verified', '1 December 2026, 11:59 PM PST, for Autumn 2027-28. Decisions late February 2027.', [
          q('December 1, 2026 is the application deadline for Autumn 2027-2028.', ST),
        ], 'Knight-Hennessy requires a separate application; its deadline was 6 October 2026.'),
        unread('letters', 'ee.stanford.edu/admissions/required-materials'),
        unread('portal', 'ee.stanford.edu/admissions/application'),
        unread('transcripts', 'ee.stanford.edu/admissions/official-materials'),
        unread('english', 'gradadmissions.stanford.edu'),
        unread('fee', 'gradadmissions.stanford.edu'),
        unread('fee_waiver', 'gradadmissions.stanford.edu'),
      ],
    },
  },
}

// ---------------------------------------------------------------------------
const ut = {
  title: 'UT Austin ECE — PhD',
  patch: {
    application_details: {
      portal_url: null,
      portal_status: 'unverified',
      checked_on: CHECKED,
      items: [
        fact(
          'deadline',
          'unverified',
          'Not re-read on 19 Nov 2026. The 16 Nov read gave 1 December 2026, 11:00 PM CST.',
          [q('The deadline to apply for Summer 2027 and Fall 2027 is December 1, 2026, 11:00 PM CST.', 'https://www.ece.utexas.edu/academics/graduate/admissions')],
          'Quote is from the 16 Nov read; confirm on the page.'
        ),
        unread('letters', 'ece.utexas.edu/academics/graduate/admissions'),
        unread('portal', 'gradschool.utexas.edu/admissions/how-to-apply'),
        unread('transcripts', 'gradschool.utexas.edu/admissions/how-to-apply'),
        unread('english', 'gradschool.utexas.edu/admissions/how-to-apply/international-students'),
        unread('fee', 'gradschool.utexas.edu/admissions/how-to-apply'),
        unread('fee_waiver', 'gradschool.utexas.edu/admissions/how-to-apply'),
      ],
    },
  },
}

for (const { title, patch } of [berkeley, mit, purdue, stanford, ut]) {
  const { data, error } = await admin.from('opportunities').update({ ...patch, verified_on: CHECKED }).eq('title', title).select('id, title')
  if (error) console.error(`FAILED "${title}":`, error.message)
  else if (!data?.length) console.error(`FAILED "${title}": no row with that title`)
  else console.log(`OK "${title}" (${data[0].id})`)
}
