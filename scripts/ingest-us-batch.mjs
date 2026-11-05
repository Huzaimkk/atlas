// One-off ingest of data/inbox/atlas-us-batch-1.md and atlas-us-batch-2.md.
// Upgrades existing rows in place (Rice, UH, NVIDIA GTC, CES, SXSW, APEC)
// rather than duplicating, and inserts the 4 genuinely new department-level
// PhD rows (Berkeley, Stanford, UCLA, UCSD) plus Energy HPC & AI.
import { createClient } from '@supabase/supabase-js'

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

const EE_TAGS = ['Electrical engineering', 'Engineering', 'Computer science', 'Control', 'Energy']

// ---------------------------------------------------------------------------
// New rows
// ---------------------------------------------------------------------------
const NEW_ROWS = [
  {
    title: 'UC Berkeley EECS — PhD',
    track: 'phd_funded',
    category: 3,
    integrated_phd_fast_track: true,
    institution: 'UC Berkeley',
    country: 'United States',
    region: 'USA',
    field_tags: EE_TAGS,
    funding: null,
    degree_levels_accepted: ['undergraduate', 'graduate'],
    eligibility_rules: [
      {
        rule_text: 'English proficiency test required — TOEFL or IELTS only; the Duolingo English Test is not accepted.',
        rule_type: 'mechanical',
        source_quote: 'English: TOEFL / IELTS only. Duolingo not accepted. Test deadline November',
        source_url: 'https://eecs.berkeley.edu/academics/graduate/research-programs/admissions/',
      },
      {
        rule_text: 'GRE scores are not required and not accepted.',
        rule_type: 'discretionary',
        source_quote: 'GRE: Not required, not accepted',
        source_url: 'https://eecs.berkeley.edu/academics/graduate/research-programs/admissions/',
      },
      {
        rule_text: "Accepts direct entry from a Bachelor's degree — a 5–6 year full-time commitment starting with a Bachelor's.",
        rule_type: 'discretionary',
        source_quote: "5–6 year full-time commitment starting with a Bachelor's",
        source_url: 'https://eecs.berkeley.edu/academics/graduate/research-programs/admissions/',
      },
    ],
    requirements: [{ type: 'language_test', label: 'TOEFL or IELTS (Duolingo not accepted)', satisfied: false }],
    opens: null,
    deadline: '2026-12-01',
    rolling: false,
    status: 'closing_soon',
    tier: 'T1',
    apply_url: 'https://eecs.berkeley.edu/academics/graduate/research-programs/admissions/',
    source_url: 'https://eecs.berkeley.edu/academics/graduate/research-programs/admissions/',
    source_type: 'official',
    verification_level: 'verified',
    scam_risk: false,
    origin: 'txt',
    source_assessment:
      'Ingested from data/inbox/atlas-us-batch-1.md (compiled 16 Oct 2026). Tightest deadline in the US batch — 1 Dec 2026, 8:59pm PST. English test is the only real gap; GRE and degree-level are both non-barriers per the programme\'s own page.',
  },
  {
    title: 'Stanford Electrical Engineering — PhD',
    track: 'phd_funded',
    category: 3,
    integrated_phd_fast_track: true,
    institution: 'Stanford University',
    country: 'United States',
    region: 'USA',
    field_tags: EE_TAGS,
    funding: { tuition: 'covered', notes: 'Full financial support for the duration of the doctoral program, conditional on satisfactory academic progress.' },
    degree_levels_accepted: ['undergraduate', 'graduate'],
    eligibility_rules: [
      {
        rule_text: "A master's is not required prior to applying to the PhD program in Electrical Engineering.",
        rule_type: 'discretionary',
        source_quote: "a master's is not required prior to applying to the PhD program in Electrical Engineering",
        source_url: 'https://ee.stanford.edu/admissions/phd',
      },
      {
        rule_text: 'No minimum GPA is required to secure admission.',
        rule_type: 'discretionary',
        source_quote: 'Applicants do not need to meet any minimum grade point average (GPA) to secure admission',
        source_url: 'https://ee.stanford.edu/admissions/phd/faq',
      },
      {
        rule_text: 'English proficiency requirement is not published on the admissions or FAQ pages — assume TOEFL/IELTS, verify before applying.',
        rule_type: 'discretionary',
        source_quote: 'Not published on the admissions or FAQ pages — assume TOEFL/IELTS, verify before applying',
        source_url: 'https://ee.stanford.edu/admissions/phd · https://ee.stanford.edu/admissions/phd/faq',
      },
    ],
    requirements: [],
    opens: null,
    deadline: '2026-12-01',
    rolling: false,
    status: 'closing_soon',
    tier: 'T1',
    apply_url: 'https://ee.stanford.edu/admissions/phd',
    source_url: 'https://ee.stanford.edu/admissions/phd',
    source_type: 'official',
    verification_level: 'verified',
    scam_risk: false,
    origin: 'txt',
    source_assessment:
      "Ingested from data/inbox/atlas-us-batch-2.md (compiled 16 Oct 2026). Degree level and GPA are both explicitly non-barriers. English requirement is genuinely unpublished (not merely unresearched) — represented as a discretionary 'verify before applying' rule rather than a stated credential gap, since the page does not state a number to fail to meet.",
  },
  {
    title: 'UCLA Electrical & Computer Engineering — PhD',
    track: 'phd_funded',
    category: 3,
    integrated_phd_fast_track: true,
    institution: 'UCLA',
    country: 'United States',
    region: 'USA',
    field_tags: EE_TAGS,
    funding: null,
    degree_levels_accepted: ['undergraduate', 'graduate'],
    eligibility_rules: [
      {
        rule_text: "Bachelor's is the stated general requirement; an M.S. is referenced as helpful, not required.",
        rule_type: 'discretionary',
        source_quote: "Bachelor's is the stated general requirement; M.S. referenced as helpful, not required",
        source_url: 'https://www.ee.ucla.edu/graduate-application-requirements/',
      },
      {
        rule_text: 'GRE is not required for 2027–28 admission; scores are given no extra weight. Under review for Fall 2028.',
        rule_type: 'discretionary',
        source_quote: 'Not required for 2027–28; scores given no extra weight. Under review for Fall 2028',
        source_url: 'https://www.ee.ucla.edu/graduate-application-requirements/',
      },
    ],
    requirements: [{ type: 'language_test', label: 'TOEFL 87 / IELTS 7.0 (Duolingo not accepted, no conditional admission)', satisfied: false }],
    opens: null,
    deadline: '2026-12-15',
    rolling: false,
    status: 'open',
    tier: 'T2',
    apply_url: 'https://www.ee.ucla.edu/graduate-application-requirements/',
    source_url: 'https://www.ee.ucla.edu/graduate-application-requirements/',
    source_type: 'official',
    verification_level: 'verified',
    scam_risk: false,
    origin: 'txt',
    source_assessment:
      'Ingested from data/inbox/atlas-us-batch-2.md (compiled 16 Oct 2026). Deadline year ("confirm the cycle year on the page") not independently re-verified at ingest time. English test (TOEFL 87 / IELTS 7.0, no Duolingo, no conditional admission) is the only gap.',
  },
  {
    title: 'UCSD ECE — PhD',
    track: 'phd_funded',
    category: 3,
    integrated_phd_fast_track: true,
    institution: 'UC San Diego',
    country: 'United States',
    region: 'USA',
    field_tags: EE_TAGS,
    funding: null,
    degree_levels_accepted: ['undergraduate', 'graduate'],
    eligibility_rules: [
      {
        rule_text: 'English proficiency: Duolingo English Test minimum 120 accepted (also IELTS 7, PTE 65).',
        rule_type: 'mechanical',
        source_quote: 'Duolingo minimum 120 — accepted. Also IELTS 7, PTE 65',
        source_url: 'https://www.ece.ucsd.edu/graduate/graduate-admissions',
      },
      {
        rule_text: 'GRE scores are not required for either M.S. or Ph.D. applications for Fall 2027.',
        rule_type: 'discretionary',
        source_quote: 'GRE scores are not required for either M.S. or Ph.D. applications for Fall 2027',
        source_url: 'https://www.ece.ucsd.edu/graduate/graduate-admissions',
      },
      {
        rule_text: 'B.S. and/or M.S. in engineering, physical sciences or mathematics; minimum 3.0 GPA.',
        rule_type: 'discretionary',
        source_quote: 'B.S. and/or M.S. in engineering, physical sciences or mathematics; min 3.0 GPA (profile: 3.3)',
        source_url: 'https://www.ece.ucsd.edu/graduate/graduate-admissions',
      },
    ],
    requirements: [{ type: 'language_test', label: 'Duolingo English Test 120 — zero margin, profile scores exactly 120', satisfied: true }],
    opens: null,
    deadline: '2026-12-16',
    rolling: false,
    status: 'open',
    tier: 'T2',
    apply_url: 'https://www.ece.ucsd.edu/graduate/graduate-admissions',
    source_url: 'https://www.ece.ucsd.edu/graduate/graduate-admissions',
    source_type: 'official',
    verification_level: 'verified',
    scam_risk: false,
    origin: 'txt',
    source_assessment:
      'Ingested from data/inbox/atlas-us-batch-1.md (compiled 16 Oct 2026). READY on credentials but with zero margin — the Duolingo minimum is exactly 120 and the profile score is exactly 120. A retake with a higher score removes the risk; flagged here rather than silently treated as safely clear.',
  },
  {
    title: 'Energy HPC & AI Conference',
    track: 'conference',
    category: 7,
    integrated_phd_fast_track: false,
    institution: 'Rice University',
    country: 'United States',
    region: 'USA',
    field_tags: ['Energy', 'Engineering', 'AI', 'Computing'],
    funding: null,
    degree_levels_accepted: ['undergraduate', 'graduate'],
    eligibility_rules: [],
    requirements: [],
    opens: '2027-02-23',
    deadline: null,
    rolling: false,
    status: 'not_yet_open',
    tier: 'T3',
    apply_url: 'https://kenkennedy.rice.edu/energyhpc-ai',
    source_url: 'https://kenkennedy.rice.edu/energyhpc-ai',
    source_type: 'official',
    verification_level: 'verified',
    scam_risk: false,
    origin: 'txt',
    source_assessment:
      'Ingested from data/inbox/atlas-us-batch-1.md (compiled 16 Oct 2026). 23–25 Feb 2027, BioScience Research Collaborative, 6500 Main St, Houston TX — on Rice University\'s own campus. Closes with a Poster Reception showcasing research by emerging leaders in HPC and AI. High fit: Houston, Rice campus, industrial-energy-plus-AI intersection. Submitting a poster puts the applicant physically at Rice while the Rice ECE PhD application is under review (the batch doc\'s "January insight").',
  },
]

// ---------------------------------------------------------------------------
// Upgrades to existing rows — by current title
// ---------------------------------------------------------------------------
const UPGRADES = [
  {
    title: 'Rice doctoral and thesis-master funding',
    patch: {
      title: 'Rice ECE — PhD',
      track: 'phd_funded',
      category: 3,
      integrated_phd_fast_track: false, // batch explicitly flags direct-entry as unconfirmed — see eligibility_rules
      institution: 'Rice University',
      funding: {
        tuition: 'covered',
        stipend: { amount: 38000, currency: 'USD', period: 'year' },
        notes:
          'All enrolled full-time PhD students are supported with full tuition and a stipend (first-year fellowship, then advisor RA). Stipend figure ($37,000–40,000/yr) carried forward from the original department-funding-policy review (graduate.rice.edu/admissions/costofstudy); not independently re-confirmed by the new department admissions page.',
      },
      degree_levels_accepted: ['undergraduate', 'graduate'],
      eligibility_rules: [
        {
          rule_text: 'Minimum 3.0 GPA; bachelor\'s degree required at acceptance.',
          rule_type: 'discretionary',
          source_quote: "Min 3.0 GPA, bachelor's required at acceptance",
          source_url: 'https://eceweb.rice.edu/academics/graduate-programs/graduate-admissions',
        },
        {
          rule_text: 'GRE is optional, "strongly recommended."',
          rule_type: 'discretionary',
          source_quote: 'Optional, "strongly recommended"',
          source_url: 'https://eceweb.rice.edu/academics/graduate-programs/graduate-admissions',
        },
        {
          rule_text: "The page doesn't state whether bachelor's-only applicants enter the PhD directly or via a thesis master's first — verify entry route before applying.",
          rule_type: 'discretionary',
          source_quote: "Page doesn't state whether bachelor's-only applicants enter the PhD directly",
          source_url: 'https://eceweb.rice.edu/academics/graduate-programs/graduate-admissions',
        },
      ],
      requirements: [{ type: 'language_test', label: 'TOEFL iBT 90 / IELTS 7 / Duolingo 115 — profile clears with margin', satisfied: true }],
      opens: null,
      deadline: '2026-12-21',
      status: 'open',
      tier: 'T2',
      apply_url: 'https://eceweb.rice.edu/academics/graduate-programs/graduate-admissions',
      source_url: 'https://eceweb.rice.edu/academics/graduate-programs/graduate-admissions',
      source_type: 'official',
      verification_level: 'verified',
      verified_correction:
        'Deadline (~21 Dec 2026, late deadline 1 Jan) carried from data/inbox/atlas-us-batch-1.md as-is — the batch doc itself flags "confirm the year on the page," not independently re-checked at ingest time. Reconciled from the prior generic "Rice doctoral and thesis-master funding" row (graduate.rice.edu/admissions/costofstudy, manual/conflicting) into this now-verified department-level admissions row rather than duplicating; that page\'s cost/stipend figures are kept in funding.notes since the new source doesn\'t restate them.',
    },
  },
  {
    title: 'University of Houston graduate assistantships',
    patch: {
      title: 'University of Houston ECE — PhD',
      track: 'phd_funded',
      category: 3,
      integrated_phd_fast_track: false,
      institution: 'University of Houston',
      degree_levels_accepted: ['graduate'],
      eligibility_rules: [
        {
          rule_text: 'GRE is optional, recommended.',
          rule_type: 'discretionary',
          source_quote: 'Optional, recommended',
          source_url: 'https://www.ece.uh.edu/graduate/admission-procedures',
        },
        {
          rule_text: 'English proficiency: TOEFL preferred, IELTS accepted; no minimum scores are published on the department page — verify current requirement before applying.',
          rule_type: 'discretionary',
          source_quote: 'TOEFL preferred, IELTS accepted; no minimums published',
          source_url: 'https://www.ece.uh.edu/graduate/admission-procedures',
        },
      ],
      requirements: [],
      opens: null,
      deadline: '2027-03-15',
      status: 'open',
      tier: 'T3',
      apply_url: 'https://www.ece.uh.edu/graduate/admission-procedures',
      source_url: 'https://www.ece.uh.edu/graduate/admission-procedures',
      source_type: 'official',
      verification_level: 'verified',
      verified_correction:
        '15 March priority / 15 May regular — much later and lower urgency than Berkeley/Stanford/UCLA/UCSD/Rice. Reconciled from the prior generic "University of Houston graduate assistantships" row (uh.edu/graduate-school, category 4, manual/unverified) into this now-verified ECE PhD admissions row (category 3) rather than duplicating. That row\'s GPA/English figures came from a less precisely sourced bulk-import review and were NOT restated by this new, more carefully verified department-page check, so they were dropped rather than carried forward as "verified." Prior funding.notes (appointment-dependent RA/TA pay) retained below.',
    },
  },
  {
    title: 'NVIDIA GTC 2027',
    patch: {
      opens: '2027-03-15',
      source_type: 'official',
      verification_level: 'verified',
      source_assessment:
        'Prior DATE CONFLICT resolved by data/inbox/atlas-us-batch-2.md (compiled 16 Oct 2026, verification standard: every row checked against the programme\'s own page): 15–18 March 2027, San Jose, California — matching this app\'s earlier user research over the bulk-import research file\'s unconfirmed 14–18 claim. Very high fit: NVIDIA 6G Developer Program membership, Jetson Nano Certificate of Competency, CUDA work, existing NVIDIA Inception T3 row; "Physical AI" is the profile\'s exact territory. Direct full-overlap clash with SXSW 2027 (15–21 March, Austin) — GTC is the stronger match (inside the US window, on the technical core rather than the founder periphery); batch 2 recommends dropping SXSW in favor of GTC. CUDA, Jetson, edge AI and LLM deployment.',
    },
  },
  {
    title: 'CES 2027',
    patch: {
      source_type: 'official',
      verification_level: 'verified',
    },
  },
  {
    title: 'SXSW 2027 Innovation Conference',
    patch: {
      source_type: 'official',
      verification_level: 'verified',
      source_assessment:
        'Confirmed in data/inbox/atlas-us-batch-1.md/2.md (compiled 16 Oct 2026). Founder/tech track, not academic; relevant to Aladdin AI and Berry AI rather than the PhD research track. Flagged as a full-overlap clash with NVIDIA GTC 2027 (15–18 Mar, San Jose) — batch 2 recommends dropping this one in favor of GTC. Badges on sale. Current price not extracted. No general travel award verified',
    },
  },
  {
    title: 'APEC 2027 attendee and student-support routes',
    patch: {
      source_type: 'official',
      verification_level: 'verified',
      source_assessment:
        'Confirmed in data/inbox/atlas-us-batch-1.md/2.md (compiled 16 Oct 2026) as IEEE APEC 2027 — Applied Power Electronics Conference, 7–11 March 2027, Ernest N. Morial Convention Center, New Orleans. Highest fit in the US batch: direct field match for PMSM / Direct Torque Control work, with a Student Job Fair, Student Mentorship Program, Student Demonstration Competition, Student Attendance Support Program and Student Leader Program. Check the Student Attendance Support Program for travel funding. NOTE: the existing deadline field (2026-10-29) on this row predates today and was NOT re-confirmed or corrected by this batch, which gives only the event dates — flagging for separate review rather than silently altering an unverified figure.',
    },
  },
]

async function run() {
  console.log('--- Inserting new rows ---')
  for (const row of NEW_ROWS) {
    const { data, error } = await admin.from('opportunities').insert(row).select('id, title')
    if (error) console.error(`FAILED insert "${row.title}":`, error.message)
    else console.log(`OK insert "${row.title}" ->`, data[0].id)
  }

  console.log('\n--- Upgrading existing rows ---')
  for (const { title, patch } of UPGRADES) {
    const { data, error } = await admin.from('opportunities').update(patch).eq('title', title).select('id, title')
    if (error) console.error(`FAILED update "${title}":`, error.message)
    else if (!data?.length) console.error(`FAILED update "${title}": no row matched`)
    else console.log(`OK update "${title}" -> "${patch.title ?? title}" (${data[0].id})`)
  }

  const { count } = await admin.from('opportunities').select('*', { count: 'exact', head: true })
  console.log('\nTotal opportunities now:', count)
}

run()
