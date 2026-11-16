// Ingest of US batch 3 (compiled 16 Nov 2026) — see data/inbox/atlas-us-batch-3.md
// for the evidence table. Every fact below was read off the programme's own
// page on 16 Nov 2026; anything the page did not state is recorded as a
// verification_only rule ("not stated"), never filled in.
//
// Usage: node --env-file=.env.local scripts/ingest-us-batch-3.mjs
// Idempotent: a row whose title already exists is skipped, not duplicated.
// Follow with: node --env-file=.env.local scripts/rediagnose.mjs
import { createClient } from '@supabase/supabase-js'

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

const BATCH = 'Ingested from data/inbox/atlas-us-batch-3.md (compiled 16 Nov 2026, each fact read from the programme\'s own page that day).'
const IELTS = 'Sit IELTS, score ≥ 7.0'
const ECE_TAGS = ['Electrical engineering', 'Engineering', 'Computer science', 'Control', 'Energy']
const ML_TAGS = ['Machine learning', 'Computer science', 'Artificial intelligence', 'Engineering']

const rule = (rule_text, source_quote, source_url, extra = {}) => ({ rule_text, rule_type: 'discretionary', source_quote, source_url, verification_only: false, ...extra })
const unstated = (rule_text, source_url) => ({ rule_text, rule_type: 'discretionary', source_quote: 'Not stated on the page', source_url, verification_only: true })
const english = (rule_text, source_quote, source_url) => ({ rule_text, rule_type: 'mechanical', source_quote, source_url, satisfying_action: IELTS })
const blocker = (rule_text, source_quote, source_url, check) => ({ rule_text, rule_type: 'mechanical', source_quote, source_url, check })

const phdDocs = (letters = 3) => [
  { type: 'lor', label: `${letters}× letters of recommendation`, count: letters, satisfied: false },
  { type: 'sop', label: 'Statement of purpose', satisfied: false },
  { type: 'transcript', label: 'Transcripts', satisfied: false },
  { type: 'cv', label: 'CV / résumé', satisfied: false },
]
const langReq = (label) => ({ type: 'language_test', label, satisfied: false, satisfying_action: IELTS })

function phd({ title, institution, tags = ECE_TAGS, deadline, status = 'open', tier = 'T2', url, funding = null, rules, requirements, level = 'verified', note }) {
  return {
    title,
    track: 'phd_funded',
    category: 3,
    integrated_phd_fast_track: true,
    institution,
    country: 'United States',
    region: 'USA',
    field_tags: tags,
    funding,
    degree_levels_accepted: ['undergraduate', 'graduate'],
    eligibility_rules: rules,
    requirements,
    opens: null,
    deadline,
    rolling: false,
    status,
    tier,
    apply_url: url,
    source_url: url,
    source_type: 'official',
    verification_level: level,
    scam_risk: false,
    origin: 'search',
    source_assessment: `${BATCH} ${note}`,
  }
}

function other({ title, institution, track, category, tags, deadline = null, opens = null, rolling = false, status, tier = 'T3', url, funding = null, rules = [], requirements = [], country = 'United States', region = 'USA', levels = ['graduate'], level = 'verified', note }) {
  return {
    title, track, category, integrated_phd_fast_track: false, institution, country, region, field_tags: tags, funding,
    degree_levels_accepted: levels, eligibility_rules: rules, requirements, opens, deadline, rolling, status, tier,
    apply_url: url, source_url: url, source_type: 'official', verification_level: level, scam_risk: false, origin: 'search',
    source_assessment: `${BATCH} ${note}`,
  }
}

// ---------------------------------------------------------------------------
// A. Department-level PhD admissions, Fall 2027
// ---------------------------------------------------------------------------
const MIT = 'https://www.eecs.mit.edu/academics/graduate-programs/admission-process/graduate-admissions-faqs/'
const CMU_ML = 'https://www.ml.cmu.edu/academics/machine-learning-phd.html'
const CMU_SCS = 'https://www.cs.cmu.edu/academics/graduate-admissions'
const UT = 'https://www.ece.utexas.edu/academics/graduate/admissions'
const CORNELL = 'https://www.duffield.cornell.edu/ece/phd/phd-admission-requirements/'
const HARVARD = 'https://seas.harvard.edu/prospective-students/prospective-graduate-students/how-apply'
const HARVARD_FUND = 'https://seas.harvard.edu/prospective-students/prospective-graduate-students/funding-scholarship-graduate-programs'
const UW = 'https://www.ece.uw.edu/academics/grad/admissions/'
const UW_ELP = 'https://grad.uw.edu/policies/3-2-graduate-school-english-language-proficiency-requirements/'
const CALTECH = 'https://www.ee.caltech.edu/academics/grad'
const CALTECH_GO = 'https://www.gradoffice.caltech.edu/admissions/checklist'
const UIUC = 'https://ece.illinois.edu/admissions/graduate/admissions-requirements-and-process'
const UIUC_DATES = 'https://ece.illinois.edu/admissions/graduate/graduate-dates-and-deadlines'
const STANFORD_CS = 'https://www.cs.stanford.edu/admissions/graduate-application-checklists'
const STANFORD_CS_DL = 'https://www.cs.stanford.edu/admissions-graduate-application-deadlines'
const PURDUE = 'https://engineering.purdue.edu/ECE/Academics/Graduates/Admissions'
const TAMU = 'https://engineering.tamu.edu/electrical/admissions-and-aid/graduate-admissions/index.html'
const USC = 'https://viterbigradadmission.usc.edu/doctoral/how-to-apply-phd/'
const UCSD_CSE = 'https://cse.ucsd.edu/graduate/admissions'
const UCSD_ELP = 'https://grad.ucsd.edu/admissions/requirements/international-students/english-proficiency.html'
const TTIC = 'https://www.ttic.edu/studentapplication'

const MIT_PATCH = {
  title: 'MIT EECS — PhD',
  integrated_phd_fast_track: true,
  degree_levels_accepted: ['undergraduate', 'graduate'],
  funding: { tuition: 'covered', insurance: true, notes: 'Fully funded for the duration of the programme: monthly stipend, tuition and annual medical insurance. Stipend amount not stated on the page.' },
  eligibility_rules: [
    english('English proficiency: Duolingo (minimum 130), IELTS (minimum 7) or TOEFL iBT (minimum 100).', 'EECS requires a minimum of 130 on the Duolingo English test.', MIT),
    rule('GRE scores are not used in admission.', 'We do not use the GRE test scores during the admission process', MIT),
    rule("A bachelor's degree is sufficient; bachelor's applicants are admitted into the PhD programme.", "We expect applicants to have earned a Bachelor's degree by the time they register in EECS", MIT),
  ],
  requirements: [langReq('Duolingo ≥ 130, IELTS ≥ 7 or TOEFL iBT ≥ 100'), ...phdDocs(3)],
  deadline: '2026-12-01',
  status: 'closing_soon',
  tier: 'T1',
  apply_url: 'https://www.eecs.mit.edu/academics/graduate-programs/admission-process/',
  source_url: 'https://www.eecs.mit.edu/academics/graduate-programs/admission-process/',
  source_type: 'official',
  verification_level: 'verified',
  verified_correction: `${BATCH} Upgraded in place from the generic, unverified "MIT EECS funded PhD" row. Deadline quoted as "The deadline for submitting completed applications is December 1, 2026." The admission page's wording still refers to "admission in September 2026", so the page has not been fully rolled to the Fall 2027 cycle — re-check before submitting. Application fee $90.`,
}

const NEW_ROWS = [
  phd({
    title: 'Carnegie Mellon Machine Learning — PhD',
    institution: 'Carnegie Mellon University',
    tags: ML_TAGS,
    deadline: '2026-12-09',
    tier: 'T1',
    url: CMU_ML,
    funding: { tuition: 'covered', notes: 'Full tuition and stipend support, continued with satisfactory progress. Stipend amount not stated.' },
    rules: [
      english('English proficiency score no older than two years is required of non-native speakers; no waivers. TOEFL iBT or IELTS preferred, Duolingo accepted if those are not possible.', 'We do not issue waivers for non-native speakers of English.', CMU_SCS),
      rule("A master's degree is not needed to apply to the PhD.", "Yes. You do not need a master's degree to apply to a Ph.D. program.", CMU_SCS),
      unstated('Minimum English test scores are not published (only typical admitted ranges); the Machine Learning Department\'s own GRE policy is not stated.', CMU_SCS),
    ],
    requirements: [langReq('TOEFL iBT or IELTS preferred (Duolingo accepted), score under two years old'), ...phdDocs(3)],
    note: 'Final deadline "Dec. 9, 2026 (3 p.m. ET)"; early deadline 18 Nov 2026 lowers the fee from $100 to $80. Up to three CMU doctoral programmes can be applied to in one cycle.',
  }),
  phd({
    title: 'UT Austin ECE — PhD',
    institution: 'The University of Texas at Austin',
    deadline: '2026-12-01',
    status: 'closing_soon',
    url: UT,
    funding: { notes: 'Not guaranteed. Research and teaching assistantships at 20 hrs/week have tuition and individual health insurance fully covered.' },
    rules: [
      english('English proficiency: TOEFL and IELTS are both accepted.', 'The TOEFL and IELTS exams are both accepted.', UT),
      rule('GRE scores are not considered.', 'GRE scores are not considered in our application process.', UT),
      unstated('Whether the Duolingo English Test is accepted, minimum English scores, and whether a bachelor\'s alone qualifies for direct PhD entry are not stated on the department page.', UT),
    ],
    requirements: [langReq('TOEFL or IELTS'), ...phdDocs(3)],
    note: 'Deadline quoted as "The deadline to apply for Summer 2027 and Fall 2027 is December 1, 2026, 11:00 PM CST." The application fee is not waived for international applicants. Texas — inside the US presence window.',
  }),
  phd({
    title: 'Cornell ECE — PhD',
    institution: 'Cornell University',
    deadline: '2026-12-15',
    tier: 'T1',
    url: CORNELL,
    level: 'pattern',
    rules: [
      english('TOEFL or IELTS is required of all foreign nationals whose native language is not English.', 'All foreign nationals whose native language is not English are required to submit either a TOEFL or IELTS score.', CORNELL),
      rule("Students are admitted directly to the PhD; a master's is not required.", "Entering students are admitted directly to the Ph.D. program; a Master's Degree is not a requirement for admission.", CORNELL),
      rule('GRE scores are not required.', 'We do not require GRE scores.', CORNELL),
      unstated('Funding, minimum English scores and Duolingo acceptance are not stated on the department page (they sit on the Graduate School site).', CORNELL),
    ],
    requirements: [langReq('TOEFL or IELTS'), ...phdDocs(3)],
    note: 'The page gives the deadline as "December 15" with no year; 15 Dec 2026 is inferred for Fall 2027, hence verification_level pattern. Two statements are required (academic statement of purpose and personal statement); at least two of the three letters must be from faculty.',
  }),
  phd({
    title: 'Harvard SEAS — PhD (Electrical Engineering / Computer Science)',
    institution: 'Harvard University',
    deadline: '2026-12-15',
    tier: 'T1',
    url: HARVARD,
    funding: { stipend: { amount: 4330, currency: 'USD', period: 'month' }, tuition: 'covered', notes: 'All admitted PhD students receive full financial support: tuition and fees plus a cost-of-living stipend of $4,330/month before tax (AY26-27), independent of need.' },
    rules: [
      english('TOEFL or IELTS is required of applicants whose native language is not English, unless the bachelor\'s was taught in English.', 'TOEFL or IELTS scores are required for applicants whose native language is other than English', HARVARD),
      rule("Applicants with a bachelor's degree in engineering are invited to apply.", "Students with bachelor's degrees in the natural or quantitative sciences, mathematics, computer science, or engineering", HARVARD),
      rule('GRE scores are optional this cycle.', 'General GRE and Subject GRE scores are optional for the upcoming admissions cycle.', HARVARD),
      rule('All admitted PhD students are fully funded.', 'All students admitted into our Ph.D. program receive full financial support.', HARVARD_FUND),
      unstated('Whether a Pakistani English-medium bachelor\'s satisfies the English-instruction exemption, minimum scores, and Duolingo acceptance are not stated.', HARVARD),
    ],
    requirements: [langReq('TOEFL or IELTS (unless the English-instruction exemption applies)'), ...phdDocs(3)],
    note: 'Deadline quoted as "Applicants to our Ph.D. program must apply by December 15, 2026" (5 p.m. ET), no late applications. Application fee $105; a waiver can be requested in the application.',
  }),
  phd({
    title: 'University of Washington ECE — PhD',
    institution: 'University of Washington',
    deadline: '2026-12-15',
    url: UW,
    level: 'pattern',
    rules: [
      english('English proficiency (Graduate School policy 3.2): Duolingo minimum 115 / recommended 130, IELTS minimum 6.5 / recommended 7.0, or TOEFL iBT; scores valid two years.', 'Test scores are valid for two years and must be valid on the date the application is submitted', UW_ELP),
      rule('Minimum cumulative 3.0 GPA on a 4.0 scale over the last 60 graded semester credits.', 'Students must have a cumulative 3.0 GPA on a 4.0 scale', UW),
      rule('GRE scores are neither required nor accepted.', 'GRE scores are no longer required or accepted for admission to our MS or Ph.D. programs.', UW),
      unstated('Funding for PhD students, and whether a bachelor\'s alone qualifies for direct PhD entry, are not stated on the admissions page.', UW),
    ],
    requirements: [langReq('Duolingo ≥ 115 (130 recommended), IELTS ≥ 6.5 or TOEFL iBT'), ...phdDocs(3)],
    note: 'The page says "Applications must be completed by December 15." with no year; 15 Dec 2026 is inferred, hence verification_level pattern. Below the recommended English score, admitted students must take paid UW Academic English courses. Application fee $90.',
  }),
  phd({
    title: 'Caltech Electrical Engineering — PhD',
    institution: 'California Institute of Technology',
    deadline: '2027-01-15',
    tier: 'T1',
    url: CALTECH,
    level: 'conflicting',
    funding: { tuition: 'covered', notes: 'PhD applicants are automatically considered for fellowships and teaching assistantships; either or both include a full tuition scholarship. Stipend not stated.' },
    rules: [
      rule("A completed bachelor's is required; EE doctoral applicants are admitted initially for the MSEE, with PhD admission evaluated during that year.", "Applicants must have completed a bachelor's degree or the equivalent before beginning graduate study.", CALTECH_GO),
      rule('GRE scores are encouraged, not required.', 'Students are encouraged to submit the Graduate Record Examination (GRE) scores', CALTECH),
      rule('Financial aid includes a full tuition scholarship.', 'A fellowship may be supplemented by a teaching assistantship, and either or both include a full tuition scholarship.', CALTECH),
      unstated('The English-test policy and the exact Fall 2027 deadline are published only in PDFs that could not be read; verify both on gradoffice.caltech.edu before applying.', CALTECH_GO),
    ],
    requirements: [langReq('English proficiency test — policy not confirmed, check the Graduate Office'), ...phdDocs(3)],
    note: 'Two official pages disagree on the application window: the Graduate Office says "between December 1 and January 15", the EE page says "between December 15 and January 15". Both end 15 January, which is the date recorded; marked conflicting until the deadlines PDF is read. No minimum GPA is used.',
  }),
  phd({
    title: 'UIUC Electrical & Computer Engineering — PhD',
    institution: 'University of Illinois Urbana-Champaign',
    deadline: '2027-01-15',
    url: UIUC,
    level: 'pattern',
    rules: [
      english('English proficiency: TOEFL iBT minimum 96, or IELTS 6.5 overall with 6.0 in every subsection (full status needs TOEFL above 102 or IELTS 7.0).', 'minimum TOEFL score of 96 (iBT), 243 (CBT), or 590 (PBT)', UIUC),
      rule("A bachelor's in electrical or computer engineering or a related field qualifies for the direct PhD.", 'may apply to the MS program or to the direct Ph.D. program', UIUC),
      rule('GRE scores are optional.', 'GRE scores are no longer required for graduate applications!', 'https://ece.illinois.edu/admissions/graduate'),
      unstated('The Fall 2027 deadline is not yet posted, and Duolingo acceptance, guaranteed funding and stipend are not stated.', UIUC_DATES),
    ],
    requirements: [langReq('TOEFL iBT ≥ 96 or IELTS ≥ 6.5'), { type: 'lor', label: '3× letters of recommendation', count: 3, satisfied: false }, { type: 'sop', label: 'Statement of purpose', satisfied: false }, { type: 'transcript', label: 'Transcripts', satisfied: false }],
    note: 'The dates page still shows the previous cycle ("January 15, 2026 for admission to the fall semester", priority 15 December). 15 Jan 2027 is the annual pattern, not a confirmed date. Apply by 15 December for fellowship consideration. Application fee $90.',
  }),
  phd({
    title: 'Stanford Computer Science — PhD',
    institution: 'Stanford University',
    tags: ML_TAGS,
    deadline: '2026-12-08',
    tier: 'T1',
    url: STANFORD_CS_DL,
    funding: { tuition: 'covered', notes: 'All CS PhD students are guaranteed funding while making satisfactory academic progress. Amounts not stated.' },
    rules: [
      english('English proficiency: TOEFL or IELTS; exempt if the degree was taught entirely in English.', 'Stanford University accepts TOEFL/IELTS scores to prove English proficiency.', STANFORD_CS),
      rule("A bachelor's degree (or its equivalent) is required; a master's is not.", "Applicants must hold, or expect to hold before enrollment at Stanford, a Bachelor's degree", 'https://www.cs.stanford.edu/admissions/phd-admissions'),
      rule('GRE scores are not required.', 'These are not required for PhD or MS applicants.', STANFORD_CS),
      rule('Funding is guaranteed.', 'all CS PhD students are guaranteed funding as long as they make satisfactory academic progress.', 'https://www.cs.stanford.edu/phd-program-overview/funding'),
      unstated('Minimum English scores and Duolingo acceptance are not stated on the department pages.', STANFORD_CS),
    ],
    requirements: [langReq('TOEFL or IELTS (unless the English-instruction exemption applies)'), ...phdDocs(3)],
    note: 'Deadline row reads "December 8, 2026" for the Autumn PhD application (opened 15 Sep 2026, decisions February 2027); "All application deadlines are final." Application fee $125. Statement of purpose is capped at two pages.',
  }),
  phd({
    title: 'Purdue ECE — PhD',
    institution: 'Purdue University',
    deadline: '2026-12-01',
    status: 'closing_soon',
    url: PURDUE,
    level: 'pattern',
    funding: { notes: 'Not guaranteed. Most funding goes to applicants who meet the 1 December priority date.' },
    rules: [
      english('English proficiency: TOEFL or IELTS, with a writing score requirement (IELTS writing 6 or higher).', 'IELTS: 6 or higher', PURDUE),
      rule("Bachelor's-level applicants are considered for the direct PhD.", "Bachelor's level students are considered for admission into either the Master's program or into the direct PhD program.", PURDUE),
      rule('GRE is optional.', 'The GRE is optional for all applicants.', PURDUE),
      rule('Funding follows the priority deadline.', 'The majority of our funding is offered to students who apply for a Fall start by the December 1 priority date.', PURDUE),
      unstated('Duolingo acceptance, the application fee and the number of recommendation letters are not stated on the department page.', PURDUE),
    ],
    requirements: [langReq('TOEFL or IELTS (writing ≥ 6)'), ...phdDocs(3)],
    note: 'Deadlines are listed as "December 1 – Priority" and "April 1 - Final" with no year (page last modified 29 Jan 2026); 1 Dec 2026 is inferred. International applicants are benchmarked as "typically in the top 5% of their graduating class".',
  }),
  phd({
    title: 'Texas A&M ECE — PhD',
    institution: 'Texas A&M University',
    deadline: '2027-02-01',
    tier: 'T3',
    url: TAMU,
    level: 'pattern',
    rules: [
      english('Non-native English speakers must meet an English proficiency requirement (TOEFL or IELTS).', 'Applicants whose native languages are not English must fulfill an English proficiency requirement.', 'https://engineering.tamu.edu/admissions-and-aid/graduate-admissions/language-requirements.html'),
      rule('GRE is optional.', 'The GRE is optional for all applicants.', TAMU),
      unstated('Direct PhD entry from a bachelor\'s, minimum GPA, minimum English scores, Duolingo acceptance and funding are not stated on the department pages.', TAMU),
    ],
    requirements: [langReq('TOEFL or IELTS'), ...phdDocs(3)],
    note: 'International Fall deadline quoted as "International (Everyone else, no matter the visa type or where you are going to school): February 1", with no year. Fees: $90 international plus $58 EngineeringCAS. 3–5 letters accepted. Texas — inside the US presence window; 1 February is also the fellowship consideration date.',
  }),
  phd({
    title: 'USC Viterbi — PhD (Electrical & Computer Engineering)',
    institution: 'University of Southern California',
    deadline: '2026-12-15',
    url: USC,
    rules: [
      english('International applicants must submit an English proficiency test (TOEFL, IELTS, PTE or Cambridge).', 'International Applicants only', USC),
      rule("A four-year bachelor's in engineering, mathematics or a hard science qualifies.", 'may be eligible to apply for a Doctoral (PhD) program', USC),
      rule('GRE is not required for 2027 applications.', 'GRE Not Required (2027 Applications): All Viterbi School PhD programs except ASTE and ISE', USC),
      unstated('Funding, minimum English scores and Duolingo acceptance are not stated on the school page.', USC),
    ],
    requirements: [langReq('TOEFL, IELTS, PTE or Cambridge'), ...phdDocs(3)],
    note: 'Deadline quoted as "Fall 2027 deadline: December 15, 2026" (11:59 p.m. PST). The page is school-wide for all Viterbi PhD programmes rather than ECE-specific. Application fee $120. California — inside the US presence window.',
  }),
  phd({
    title: 'UC San Diego CSE — PhD',
    institution: 'UC San Diego',
    tags: ML_TAGS,
    deadline: '2026-12-16',
    url: UCSD_CSE,
    rules: [
      english('English proficiency: Duolingo English Test minimum 120 accepted (valid two years, sent by Duolingo); also IELTS band 7.', 'Minimum Total Score: 120 (out of 160)', UCSD_ELP),
      rule("A master's is not required; minimum B average (3.0 GPA).", 'At least a B average (3.0 GPA) or its equivalent is required for admission.', UCSD_CSE),
      rule('GRE is not required for Fall 2027.', 'The GRE is not required for PhD and MS applications for Fall 2027.', UCSD_CSE),
      unstated('Funding and stipend are not stated on the admissions pages.', UCSD_CSE),
    ],
    requirements: [langReq('Duolingo ≥ 120 (official sitting) or IELTS ≥ 7'), ...phdDocs(3)],
    note: 'Window quoted as "Fall 2027 admission from September 2, 2026 until December 16, 2026 at 11:59 p.m." A limited number of fee waivers exist for international PhD applicants; the request form closes 2 Dec 2026, 3 PM PST. Same Duolingo-120 zero-margin caveat as the existing UCSD ECE row. California — inside the US presence window.',
  }),
  phd({
    title: 'TTIC — PhD in Computer Science',
    institution: 'Toyota Technological Institute at Chicago',
    tags: ML_TAGS,
    deadline: '2026-12-09',
    url: TTIC,
    level: 'pattern',
    funding: { tuition: 'covered', notes: 'Full tuition scholarship plus guaranteed stipends for six years as RA or TA, conditional on good standing.' },
    rules: [
      english('English proficiency: TOEFL iBT minimum 92 or IELTS minimum 7 with no subsection below 7 (conditional admission possible at IELTS 6.0–6.9).', 'The minimum TOEFL score to be considered for admission is 92 on the internet-based test (iBT).', TTIC),
      rule("A bachelor's degree or foreign equivalent is sufficient.", "Applicant should hold an American Bachelor's degree, or higher, or an equivalent foreign degree.", TTIC),
      rule('GRE is not required.', 'TTIC does not require applicants to report GRE scores.', TTIC),
      rule('There is no application fee.', "There is NO APPLICATION FEE to apply for TTIC's PhD program.", TTIC),
      unstated('Duolingo acceptance is not stated.', TTIC),
    ],
    requirements: [langReq('TOEFL iBT ≥ 92 or IELTS ≥ 7'), { type: 'lor', label: '2× letters of recommendation (minimum)', count: 2, satisfied: false }, { type: 'sop', label: 'Statement of purpose', satisfied: false }, { type: 'transcript', label: 'Transcripts', satisfied: false }, { type: 'cv', label: 'CV / résumé', satisfied: false }],
    note: 'Deadline quoted as "Application deadline for the next academic year: DECEMBER 9" with no year; applications are accepted between 7 October and 15 January. No fee and a six-year stipend guarantee make this the cheapest serious application in the batch.',
  }),

  // -------------------------------------------------------------------------
  // B. Fellowships, residencies, founder programmes
  // -------------------------------------------------------------------------
  other({
    title: 'Ai2 Predoctoral Young Investigators',
    institution: 'Allen Institute for AI',
    track: 'fellowship',
    category: 1,
    tags: ['Artificial intelligence', 'Machine learning', 'Natural language processing', 'Computer science'],
    rolling: true,
    status: 'rolling',
    tier: 'T2',
    url: 'https://allenai.org/predoctoral-young-investigators',
    levels: ['undergraduate', 'graduate'],
    funding: { travel: true, notes: 'Paid 1–3 year research position; salary not stated on the page. Benefits list "Financial and legal support for visa acquisition" and a travel budget.' },
    rules: [
      rule("For people with a bachelor's or master's who plan to start a PhD within one to two years.", "PYI Program candidates have graduated with a bachelor's or master's degree in a relevant field", 'https://allenai.org/predoctoral-young-investigators'),
      rule('Visa support is offered.', 'Financial and legal support for visa acquisition', 'https://allenai.org/predoctoral-young-investigators'),
      unstated('Application deadline, salary and required materials are not stated; openings are posted on allenai.org/careers.', 'https://allenai.org/careers'),
    ],
    requirements: [{ type: 'cv', label: 'CV / résumé', satisfied: false }],
    note: 'Start date flexible, duration 1–3 years; the one open listing on 16 Nov 2026 was located in Seattle, WA. One of the few US pre-PhD research roles that states visa support in writing.',
  }),
  other({
    title: 'Kempner Institute Post-Baccalaureate Program',
    institution: 'Harvard University',
    track: 'fellowship',
    category: 1,
    tags: ['Machine learning', 'Neuroscience', 'Artificial intelligence'],
    status: 'not_yet_open',
    url: 'https://kempnerinstitute.harvard.edu/education/post-baccalaureate-program/',
    levels: ['undergraduate'],
    funding: { tuition: 'covered', insurance: true, notes: 'Full funding: living stipend, tuition and health insurance for a two-year, non-degree programme.' },
    rules: [
      blocker('Open to US citizens and permanent residents only.', 'Be a US citizen or permanent resident', 'https://kempnerinstitute.harvard.edu/education/post-baccalaureate-program/', { kind: 'work_auth_countries', value: ['United States'] }),
      rule("Bachelor's completed no more than three years before applying.", "Have completed a bachelor's degree by the start of the program (July), but no more than three years prior to application", 'https://kempnerinstitute.harvard.edu/education/post-baccalaureate-program/'),
    ],
    note: '"Applications for 2026-27 have closed. Applications for 2027-28 will open in winter of 2026." Recorded so the citizenship bar is visible with its quote rather than silently absent.',
  }),
  other({
    title: 'Thiel Fellowship',
    institution: 'Thiel Foundation',
    track: 'accelerator',
    category: 6,
    tags: ['Founder', 'Startup', 'Entrepreneurship'],
    rolling: true,
    status: 'rolling',
    url: 'https://thielfellowship.org/faq',
    levels: ['undergraduate'],
    funding: { notes: '$250,000 over two years, no equity taken.' },
    rules: [
      blocker('Holders of a university degree are not eligible.', 'Anyone aged 22 or younger (and without a university degree) is eligible to apply.', 'https://thielfellowship.org/faq', { kind: 'no_completed_degree_required', value: true }),
    ],
    note: 'Applications are accepted year round. The FAQ answers "Am I eligible … if I\'ve received a university degree (undergraduate or graduate)?" with "No." There is also an age limit of 22, which is not checked here because no birthdate is on the profile.',
  }),
  other({
    title: 'Quad Fellowship',
    institution: 'Quad Fellowship (IIE)',
    track: 'fellowship',
    category: 2,
    tags: ['STEM', 'Engineering', 'Graduate study in the US'],
    status: 'not_yet_open',
    url: 'https://www.quadfellowship.org/apply',
    funding: { notes: 'One-time stipend for academic expenses; amount not stated.' },
    rules: [
      blocker(
        'Citizens or legal permanent residents of the Quad countries (Australia, India, Japan, United States) or the ten ASEAN countries only.',
        'Citizens or Legal Permanent Residents of the Quad Countries – Australia, India, Japan, or the United States',
        'https://www.quadfellowship.org/apply',
        { kind: 'work_auth_countries', value: ['Australia', 'India', 'Japan', 'United States', 'Brunei', 'Cambodia', 'Indonesia', 'Laos', 'Malaysia', 'Myanmar', 'Philippines', 'Singapore', 'Thailand', 'Vietnam'] }
      ),
    ],
    note: 'The 2025-2026 application is closed and the timeline reads "To Be Announced". Pakistan is not on the eligible list.',
  }),
  other({
    title: 'Emergent Ventures',
    institution: 'Mercatus Center at George Mason University',
    track: 'accelerator',
    category: 6,
    tags: ['Founder', 'Research', 'Entrepreneurship', 'Grants'],
    rolling: true,
    status: 'rolling',
    url: 'https://www.mercatus.org/emergent-ventures',
    levels: ['undergraduate', 'graduate'],
    rules: [
      rule('Applicants must be at least 13; no nationality or degree rule is stated.', 'Applicants must be at least 13 years old.', 'https://www.mercatus.org/emergent-ventures'),
      unstated('Grant size, deadline and required materials are not stated on the page; the application form carries the instructions.', 'https://www.mercatus.org/emergent-ventures'),
    ],
    note: 'Open application with no stated deadline. The page states "Emergent Ventures no longer accepts AI-written applications."',
  }),
  other({
    title: 'Z Fellows',
    institution: 'Z Fellows',
    track: 'accelerator',
    category: 6,
    tags: ['Founder', 'Startup', 'Entrepreneurship'],
    rolling: true,
    status: 'rolling',
    url: 'https://www.zfellows.com/',
    levels: ['undergraduate', 'graduate'],
    funding: { notes: 'One-week programme. $10,000 offered as an investment at a $1B valuation cap, not a grant; participation without the money is allowed.' },
    rules: [
      rule('No age restriction; can be based anywhere.', "there's no age restriction to apply!", 'https://www.zfellows.com/'),
      rule('Rolling review, no deadline.', 'there is no deadline to submit an application.', 'https://www.zfellows.com/'),
    ],
    note: 'Multiple cohorts a year. Founder track, relevant to the venture work rather than the PhD route.',
  }),
  other({
    title: 'South Park Commons Founder Fellowship',
    institution: 'South Park Commons',
    track: 'accelerator',
    category: 6,
    tags: ['Founder', 'Startup', 'Entrepreneurship'],
    deadline: '2026-08-02',
    status: 'expired',
    url: 'https://www.southparkcommons.com/news/f26-founder-fellowship',
    levels: ['undergraduate', 'graduate'],
    funding: { notes: '$400K upfront for 7% on a standard SAFE, plus $600K guaranteed in the next round.' },
    rules: [rule('No formal eligibility rule beyond ambition.', 'Our only strict requirement is the ambition to build at the frontier.', 'https://www.southparkcommons.com/news/f26-founder-fellowship')],
    note: 'Fall 2026 cohort closed ("Application deadline: 11:59pm PT on Sunday, August 2nd"). Fellows work from San Francisco, New York City or Bangalore. No 2027 cycle announced yet — kept as next cycle\'s early warning.',
  }),
  other({
    title: 'Jane Street Graduate Research Fellowship',
    institution: 'Jane Street',
    track: 'fellowship',
    category: 3,
    tags: ['Computer science', 'Mathematics', 'Machine learning', 'Statistics'],
    deadline: '2026-11-13',
    status: 'expired',
    tier: 'T1',
    url: 'https://www.janestreet.com/join-jane-street/programs-and-events/graduate-research-fellowship/',
    funding: { stipend: { amount: 50000, currency: 'USD', period: 'year' }, tuition: 'covered', notes: 'Full tuition and fees for the academic year plus a $50,000 stipend.' },
    rules: [
      blocker('Applicants must be current PhD students or have committed to start a PhD at a specified university in Fall 2027.', 'or have committed to commence a PhD program at a specified university in the Fall of 2027 are eligible to apply.', 'https://www.janestreet.com/join-jane-street/programs-and-events/graduate-research-fellowship/', { kind: 'current_phd_student_required', value: true }),
      rule('International students are eligible; students apply directly.', 'International students are eligible and encouraged to apply!', 'https://www.janestreet.com/join-jane-street/programs-and-events/graduate-research-fellowship/'),
    ],
    note: 'This cycle closed three days before compilation ("Submit your application by November 13, 2026 AoE"). Becomes relevant the autumn after a PhD offer is accepted.',
  }),
  other({
    title: 'Two Sigma PhD Fellowship',
    institution: 'Two Sigma',
    track: 'fellowship',
    category: 3,
    tags: ['Computer science', 'Statistics', 'Machine learning', 'Mathematics'],
    deadline: '2026-09-25',
    status: 'expired',
    url: 'https://www.twosigma.com/graduate-students/phd-fellowships/',
    funding: { stipend: { amount: 75000, currency: 'USD', period: 'year' }, notes: 'Up to $75,000 per academic year for two years, plus a one-time $10,000 award.' },
    rules: [
      blocker('Full-time PhD students at an accredited US university, in at least their third year with two years remaining.', 'full-time students currently pursuing a PhD at an accredited university in the United States.', 'https://www.twosigma.com/graduate-students/phd-fellowships/', { kind: 'current_phd_student_required', value: true }),
    ],
    note: '"Applications for the 2027 cycle have now closed." A mid-PhD fellowship; recorded for the long horizon.',
  }),
  other({
    title: 'Google PhD Fellowship (Canada & United States)',
    institution: 'Google',
    track: 'fellowship',
    category: 3,
    tags: ['Computer science', 'Machine learning', 'Artificial intelligence'],
    deadline: '2026-04-30',
    status: 'expired',
    tier: 'T1',
    url: 'https://research.google/programs-and-events/phd-fellowship/',
    funding: { stipend: { amount: 85000, currency: 'USD', period: 'year' }, notes: 'Up to two years at US$85K per year towards tuition, fees, living expenses, travel and equipment, paid to the university.' },
    rules: [
      blocker('Enrolled full-time PhD students only, nominated by their university; students cannot apply directly.', 'direct applications from students are not accepted', 'https://research.google/programs-and-events/phd-fellowship/', { kind: 'current_phd_student_required', value: true }),
    ],
    note: '"Applications are currently closed for the 2026 cycle" (opened 5 Mar 2026, closed 30 Apr 2026). Each university may nominate up to four students. No 2027 dates posted.',
  }),
  other({
    title: 'Schmidt Science Fellows',
    institution: 'Schmidt Science Fellows',
    track: 'postdoc',
    category: 8,
    tags: ['Natural sciences', 'Engineering', 'Computing', 'Interdisciplinary research'],
    deadline: '2026-07-13',
    status: 'expired',
    tier: 'T1',
    url: 'https://schmidtsciencefellows.org/selection/who-can-apply/',
    levels: ['postdoc'],
    rules: [
      blocker('Candidates must be completing a PhD and be nominated by their PhD-awarding institution.', 'Be nominated by your PhD awarding institution.', 'https://schmidtsciencefellows.org/selection/who-can-apply/', { kind: 'current_phd_student_required', value: true }),
    ],
    note: '2027 cohort closed ("Full Application Deadline: July 13 2026"; institutional nominations closed 15 May 2026). Award amount not stated on the pages read.',
  }),
  other({
    title: 'Aga Khan Foundation International Scholarship Programme',
    institution: 'Aga Khan Foundation',
    track: 'scholarship',
    category: 2,
    tags: ['Postgraduate study', "Master's", 'PhD', 'Development'],
    status: 'not_yet_open',
    tier: 'T2',
    url: 'https://the.akdn/en/what-we-do/developing-human-capacity/education/international-scholarships',
    country: 'International',
    region: null,
    funding: { tuition: 'partial', notes: '50% grant, 50% loan, covering tuition and living expenses. Master\'s funded for the full course; PhD for the first two years. A guarantor must co-sign.' },
    rules: [
      rule('Pakistan is an eligible country.', 'the AKF ISP is available in Afghanistan, Australia, Bangladesh, Egypt, India, Kenya, the Kyrgyz Republic, Madagascar, Mozambique, New Zealand, Pakistan', 'https://the.akdn/en/what-we-do/developing-human-capacity/education/international-scholarships'),
      rule('Must be entering the first year of a postgraduate programme, with an admission in hand.', 'Students who have already enrolled in, or have commenced their postgraduate studies, are not eligible.', 'https://the.akdn/en/what-we-do/developing-human-capacity/education/international-scholarships'),
      rule('Must demonstrate financial need; preference to applicants under 30.', 'preference is given to young professionals under 30 years of age.', 'https://the.akdn/en/what-we-do/developing-human-capacity/education/international-scholarships'),
    ],
    requirements: [{ type: 'other', label: 'Admission to a postgraduate programme', satisfied: false }, { type: 'transcript', label: 'Transcripts', satisfied: false }],
    note: '"The 2026-2027 application cycle is now closed. The next cycle will open in early 2027." Usable for study in the US but half of the award is a repayable loan. Applications go through the Aga Khan office in Pakistan.',
  }),
]

async function run() {
  console.log('--- Upgrading MIT in place ---')
  {
    const { data, error } = await admin.from('opportunities').update(MIT_PATCH).eq('title', 'MIT EECS funded PhD').select('id, title')
    if (error) console.error('FAILED MIT upgrade:', error.message)
    else if (!data?.length) console.log('skip: no "MIT EECS funded PhD" row (already upgraded?)')
    else console.log('OK upgrade ->', data[0].title, data[0].id)
  }

  console.log('\n--- Inserting new rows ---')
  const { data: existing } = await admin.from('opportunities').select('title')
  const have = new Set((existing ?? []).map((r) => r.title))
  let inserted = 0
  for (const row of NEW_ROWS) {
    if (have.has(row.title)) {
      console.log(`skip (exists) "${row.title}"`)
      continue
    }
    const { data, error } = await admin.from('opportunities').insert(row).select('id, title')
    if (error) console.error(`FAILED insert "${row.title}":`, error.message)
    else {
      inserted++
      console.log(`OK insert "${row.title}" ->`, data[0].id)
    }
  }

  const { count } = await admin.from('opportunities').select('*', { count: 'exact', head: true })
  console.log(`\nInserted ${inserted} of ${NEW_ROWS.length}. Total opportunities now: ${count}`)
}

run()
