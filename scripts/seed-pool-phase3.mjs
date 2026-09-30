// Phase 3 — imports data/seed/Global_Opportunities_MASTER_2026-27.md into
// opportunities. Hand-transcribed (the source is prose/tables, not
// structured data). Status is ALWAYS computed here from today's date, never
// copied from the file's 15-Sept static tags (several have since expired).
//
// Deliberately excluded (reported in the run summary, not silently dropped):
//  - Part B's bare scholarship name-lists ("50 fully funded US scholarships",
//    "curated university lists") — no source_url given anywhere for these,
//    and opportunities.source_url is NOT NULL. Fabricating one would violate
//    the project's own standard (spec §6: never cite anything but a primary
//    source) worse than leaving them out. They're real leads — worth a
//    Channel B pass once that's built, not a guessed URL now.
//  - Non-opportunity content already flagged by the source file itself
//    (§1 item 9): Nvidia origin story, Musk advice, "Islamic way to get
//    smarter" list, China/Windows news, Forbes rankings, GRE-vs-research
//    note, PhD application strategy note, scholarship calendar (redundant
//    with the actual program rows), agent scraping/schema meta-sections.
//  - Third-party personal data (spec §9c item 6): Ayaan Gazali's YC/VC
//    interview context, Usama Nasir's personal achievement list, the AWS
//    cert validation number and University of Toronto offer letter (the
//    source file had already stripped the latter two itself).
//  - A handful of vague single-line mentions with no date, institution
//    detail, or URL to responsibly place anywhere (LinkedIn Next Gen Voices,
//    "One Future Conference - Canada", UN Online Volunteer Program, Tech
//    Tools/Open Source project mentions — none of these are funding
//    opportunities in the first place).
//
// Category numbers follow the SPEC's taxonomy (atlas-v2-spec1.md §4b), not
// the source file's own table groupings, where the two disagree — e.g. the
// source file's "Pattern-Based Annual Cycles" table (§7) mixes postdoc
// fellowships (Marie Curie Postdoctoral, Humboldt, Schlumberger — spec
// category 8) in with genuine annual-cycle programs (Rhodes, Clarendon,
// MEXT, GKS — spec category 9). Split here to match the spec.

import { createClient } from '@supabase/supabase-js'

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

const TODAY = new Date().toISOString().slice(0, 10)

function computeStatus({ opens, deadline, rolling }) {
  if (rolling) return 'rolling'
  if (opens && opens > TODAY) return 'not_yet_open'
  if (deadline) {
    if (deadline < TODAY) return 'expired'
    const daysLeft = (new Date(deadline) - new Date(TODAY)) / 86_400_000
    if (daysLeft <= 21) return 'closing_soon'
    return 'open'
  }
  return 'open'
}

// Each row omits `status` — computeStatus() fills it in at insert time.
const rows = [
  // ---- Category 1 — AI safety / AI research fellowships (§2) ----
  {
    title: 'Anthropic Fellows Program', track: 'fellowship', category: 1, integrated_phd_fast_track: false,
    institution: 'Anthropic', country: 'US / UK / Canada', field_tags: ['AI safety', 'ML systems', 'AI policy'],
    funding: { stipend: { amount: 3850, currency: 'USD', period: 'month' }, notes: '~$15k/month compute; also quoted as £2,310/wk GBP or C$4,300/wk CAD' },
    degree_levels_accepted: [], eligibility_rules: [
      { rule_text: 'Requires existing work authorization in the US, UK, or Canada; located there. No visa sponsorship.', rule_type: 'mechanical', source_quote: 'Must have work authorization in the US, UK, or Canada — no visa sponsorship', source_url: 'https://alignment.anthropic.com/2025/anthropic-fellows-program-2026/' },
    ],
    requirements: [], rolling: true, tier: 'T2',
    source_url: 'https://alignment.anthropic.com/2025/anthropic-fellows-program-2026/', source_type: 'official', verification_level: 'verified', origin: 'txt',
  },
  {
    title: 'Claude Corps (Anthropic x CodePath), Cohort 3', track: 'fellowship', category: 1, integrated_phd_fast_track: false,
    institution: 'Anthropic x CodePath', country: 'United States', field_tags: ['applied AI', 'nonprofit tech'],
    funding: {}, degree_levels_accepted: [],
    eligibility_rules: [
      { rule_text: 'US work authorization required for the whole fellowship; F-1 OPT/STEM OPT do not qualify.', rule_type: 'mechanical', source_quote: 'US work authorization required for the whole fellowship; F-1 OPT/STEM OPT do not qualify', source_url: 'https://www.anthropic.com/claude-corps/fellow' },
    ],
    requirements: [], opens: '2026-09-01', deadline: null, tier: 'T3',
    source_url: 'https://www.anthropic.com/claude-corps/fellow', source_type: 'official', verification_level: 'verified', origin: 'txt',
  },
  {
    title: 'MATS (ML Alignment & Theory Scholars) — Winter 2027, late window', track: 'fellowship', category: 1, integrated_phd_fast_track: false,
    institution: 'ML Alignment & Theory Scholars', country: 'US / UK', field_tags: ['AI safety', 'alignment'],
    funding: { stipend: { amount: 6400, currency: 'USD', period: 'month' }, notes: '$8k-16k/mo compute, housing, meals, travel, J-1 support; extension $7,680/mo' },
    degree_levels_accepted: [], eligibility_rules: [],
    requirements: [{ type: 'cv', label: 'Resume, emailed to applications@matsprogram.org', satisfied: false }],
    deadline: '2026-09-06', tier: 'T1',
    source_url: 'https://www.matsprogram.org/apply', source_type: 'official', verification_level: 'verified', origin: 'txt',
  },
  {
    title: 'MATS Residency', track: 'fellowship', category: 1, integrated_phd_fast_track: false,
    institution: 'ML Alignment & Theory Scholars', country: 'US / UK', region: 'London, Berkeley, or Washington DC', field_tags: ['AI safety', 'alignment'],
    funding: {}, degree_levels_accepted: [], eligibility_rules: [],
    requirements: [{ type: 'writing_sample', label: 'Work sample', satisfied: false }],
    opens: '2026-08-25', deadline: '2026-10-31', tier: 'T1',
    source_url: 'https://opportunitiesforyouth.org/2026/08/28/mats-residency-winter-2027-fully-funded-ai-safety-research-opportunity-for-talented-researchers-worldwide/', source_type: 'aggregator', verification_level: 'pattern', origin: 'txt',
  },
  {
    title: 'SPAR (Supervised Program for Alignment Research), Spring 2027', track: 'fellowship', category: 1, integrated_phd_fast_track: false,
    institution: 'SPAR', country: 'Remote', field_tags: ['AI safety', 'AI policy'],
    funding: {}, degree_levels_accepted: [], eligibility_rules: [], requirements: [],
    opens: '2026-12-01', deadline: null, tier: 'T2',
    source_url: 'https://sparai.org/', source_type: 'official', verification_level: 'pattern', origin: 'txt',
  },
  {
    title: 'Pivotal Research Fellowship (London)', track: 'fellowship', category: 1, integrated_phd_fast_track: false,
    institution: 'Pivotal / LISA', country: 'United Kingdom', field_tags: ['AI safety'],
    funding: { stipend: { amount: 7000, currency: 'GBP', period: 'month' }, notes: '£6k-8k stipend, travel, £2,000 housing for non-Londoners, compute' },
    degree_levels_accepted: [], eligibility_rules: [], requirements: [], deadline: null, tier: 'T2',
    source_url: 'https://www.pivotal-research.org/fellowship', source_type: 'official', verification_level: 'verified', origin: 'txt',
  },
  {
    title: 'GovAI Seasonal Fellowship — Research & Applied tracks', track: 'fellowship', category: 1, integrated_phd_fast_track: false,
    institution: 'Centre for the Governance of AI', country: 'United Kingdom', field_tags: ['AI policy', 'AI governance'],
    funding: {}, degree_levels_accepted: [], eligibility_rules: [], requirements: [], deadline: null, tier: 'T3',
    source_url: 'https://www.governance.ai/opportunities', source_type: 'official', verification_level: 'pattern', origin: 'txt',
  },
  ...[
    ['ERA Cambridge Fellowship', 'https://erafellowship.org', 'Cambridge, UK'],
    ['LASR Labs', 'https://www.lasrlabs.org', 'London, UK'],
    ['Constellation Astra Fellowship', 'https://www.constellation.org', 'Berkeley, US'],
    ['IAPS AI Policy Fellowship', 'https://www.iaps.ai', null],
    ['Horizon Institute for Public Service', 'https://horizonpublicservice.org', 'United States'],
  ].map(([title, url, country]) => ({
    title, track: 'fellowship', category: 1, integrated_phd_fast_track: false,
    institution: title, country, field_tags: ['AI safety', 'AI policy'],
    funding: {}, degree_levels_accepted: [], eligibility_rules: [], requirements: [], deadline: null, tier: 'T3',
    source_url: url, source_type: 'official', verification_level: 'pattern', origin: 'txt',
  })),

  // ---- Category 2 — Fully funded master's & PhD scholarships (§3) ----
  {
    title: "Chevening Scholarships 2027-28", track: 'scholarship', category: 2, integrated_phd_fast_track: false,
    institution: 'UK Government / FCDO', country: 'United Kingdom', field_tags: [],
    funding: { stipend: { amount: 1378, currency: 'GBP', period: 'month' }, tuition: 'covered', notes: '~£1,378/mo outside London, ~£1,690/mo in London' },
    degree_levels_accepted: ['graduate'],
    eligibility_rules: [
      { rule_text: 'Requires 2,800 hours of work experience obtained after completing the undergraduate degree.', rule_type: 'mechanical', source_quote: '2,800 hours of work experience', source_url: 'https://www.chevening.org/scholarships/application-timeline/' },
    ],
    requirements: [{ type: 'other', label: 'Apply to 3 eligible UK courses', satisfied: false }],
    deadline: '2026-10-06', tier: 'T1',
    source_url: 'https://www.chevening.org/scholarships/application-timeline/', source_type: 'official', verification_level: 'verified', origin: 'txt',
  },
  {
    title: 'Knight-Hennessy Scholars 2027', track: 'scholarship', category: 2, integrated_phd_fast_track: false,
    institution: 'Stanford University', country: 'United States', field_tags: [],
    funding: { tuition: 'covered', notes: 'living, travel and relocation stipends; up to ~3 years' },
    degree_levels_accepted: ['graduate'], eligibility_rules: [],
    requirements: [{ type: 'other', label: 'Stanford graduate degree application by 1 Dec 2026 or program deadline', satisfied: false }],
    deadline: '2026-10-06', tier: 'T1',
    source_url: 'https://knight-hennessy.stanford.edu/admission', source_type: 'official', verification_level: 'verified', origin: 'txt',
  },
  {
    title: 'Gates Cambridge Scholarship 2027/28', track: 'scholarship', category: 2, integrated_phd_fast_track: false,
    institution: 'University of Cambridge', country: 'United Kingdom', field_tags: [],
    funding: { stipend: { amount: 22050, currency: 'GBP', period: 'year' }, tuition: 'covered', travel: true, insurance: true },
    degree_levels_accepted: ['graduate'],
    eligibility_rules: [{ rule_text: 'Open to any non-UK citizen.', rule_type: 'mechanical', source_quote: 'open to any non-UK citizen applying for a full-time postgraduate degree', source_url: 'https://www.gatescambridge.org/apply/timeline/' }],
    requirements: [], deadline: '2026-12-08', tier: 'T1',
    source_url: 'https://www.gatescambridge.org/apply/timeline/', source_type: 'official', verification_level: 'verified', origin: 'txt',
  },
  {
    title: 'Commonwealth Master\'s & PhD Scholarships 2027/28', track: 'scholarship', category: 2, integrated_phd_fast_track: false,
    institution: 'Commonwealth Scholarship Commission', country: 'United Kingdom', field_tags: [],
    funding: { tuition: 'covered' },
    degree_levels_accepted: ['graduate'],
    eligibility_rules: [{ rule_text: 'For citizens/residents of eligible Commonwealth countries; usually applied for through a national nominating body with its own earlier deadline.', rule_type: 'discretionary', source_quote: 'apply through a national nominating body, which sets its own earlier deadline', source_url: 'https://cscuk.fcdo.gov.uk' }],
    requirements: [], deadline: '2026-10-20', tier: 'T1',
    source_url: 'https://cscuk.fcdo.gov.uk', source_type: 'official', verification_level: 'verified', origin: 'txt',
  },
  {
    title: 'Swiss Government Excellence Scholarships 2027-28', track: 'scholarship', category: 2, integrated_phd_fast_track: false,
    institution: 'Swiss Confederation / HEC Pakistan', country: 'Switzerland', field_tags: [],
    funding: { stipend: { amount: 2450, currency: 'CHF', period: 'month' }, insurance: true, notes: 'one-time housing allowance, Swiss Half-Fare card, airfare for eligible non-EU scholars' },
    degree_levels_accepted: ['graduate'],
    eligibility_rules: [{ rule_text: 'Requires a Swiss academic supervisor\'s support letter.', rule_type: 'mechanical', source_quote: 'A Swiss academic supervisor\'s support letter is required', source_url: 'https://www.hec.gov.pk/english/HECAnnouncements/Pages/SGES.aspx' }],
    requirements: [], deadline: '2026-09-29', tier: 'T2',
    source_url: 'https://www.hec.gov.pk/english/HECAnnouncements/Pages/SGES.aspx', source_type: 'official', verification_level: 'conflicting', origin: 'txt',
    // conflicting: Swiss country list says 29 Sept, HEC notice says 31 Oct — planned against the earlier date per the source file's own guidance.
  },
  {
    title: 'DAAD EPOS — Development-Related Postgraduate Courses', track: 'scholarship', category: 2, integrated_phd_fast_track: false,
    institution: 'DAAD', country: 'Germany', field_tags: [],
    funding: { stipend: { amount: 992, currency: 'EUR', period: 'month' }, insurance: true, travel: true },
    degree_levels_accepted: ['graduate'],
    eligibility_rules: [{ rule_text: 'Requires >=2 years of professional experience after the bachelor\'s degree.', rule_type: 'mechanical', source_quote: 'graduates from developing/newly industrialised countries with at least 2 years of professional experience after their bachelor\'s', source_url: 'https://www2.daad.de/deutschland/stipendium/datenbank/en/21148-scholarship-database/?detail=50076777' }],
    requirements: [], deadline: '2026-10-15', tier: 'T2',
    source_url: 'https://www2.daad.de/deutschland/stipendium/datenbank/en/21148-scholarship-database/?detail=50076777', source_type: 'official', verification_level: 'verified', origin: 'txt',
  },
  {
    title: 'ETH Zurich Excellence Scholarship & Opportunity Programme (ESOP)', track: 'scholarship', category: 2, integrated_phd_fast_track: false,
    institution: 'ETH Zurich', country: 'Switzerland', field_tags: [],
    funding: { stipend: { amount: 13500, currency: 'CHF', period: 'year' }, tuition: 'covered' },
    degree_levels_accepted: ['graduate'],
    eligibility_rules: [{ rule_text: 'Requires being in the top 10% of the bachelor\'s class.', rule_type: 'mechanical', source_quote: 'top 10% of bachelor\'s class', source_url: 'https://ethz.ch/students/en/studies/financial/scholarships/excellencescholarship.html' }],
    requirements: [], opens: '2026-11-01', deadline: '2026-11-30', tier: 'T2',
    source_url: 'https://ethz.ch/students/en/studies/financial/scholarships/excellencescholarship.html', source_type: 'official', verification_level: 'verified', origin: 'txt',
  },
  {
    title: 'Erasmus Mundus Joint Masters — MAPP (Public Policy)', track: 'scholarship', category: 2, integrated_phd_fast_track: false,
    institution: 'European Commission (EACEA)', country: 'Europe (multi-country)', field_tags: ['public policy'],
    funding: { stipend: { amount: 1400, currency: 'EUR', period: 'month' }, tuition: 'covered', travel: true },
    degree_levels_accepted: ['graduate'], eligibility_rules: [], requirements: [],
    deadline: '2026-12-01', tier: 'T2',
    source_url: 'https://www.eacea.ec.europa.eu/scholarships/erasmus-mundus-catalogue_en', source_type: 'official', verification_level: 'verified', origin: 'txt',
  },
  {
    title: 'Schwarzman Scholars — Class of 2028-29', track: 'scholarship', category: 2, integrated_phd_fast_track: false,
    institution: 'Tsinghua University', country: 'China', field_tags: ['global affairs'],
    funding: { tuition: 'covered' }, degree_levels_accepted: ['undergraduate', 'graduate'],
    eligibility_rules: [{ rule_text: 'Age 18-28.', rule_type: 'mechanical', source_quote: 'age 18-28 rule', source_url: 'https://www.schwarzmanscholars.org/admissions/' }],
    requirements: [], opens: '2027-04-01', deadline: null, tier: 'T1',
    source_url: 'https://www.schwarzmanscholars.org/admissions/', source_type: 'official', verification_level: 'verified', origin: 'txt',
  },
  {
    title: 'Fulbright Degree Program — Pakistan (USEFP)', track: 'scholarship', category: 2, integrated_phd_fast_track: false,
    institution: 'USEFP', country: 'United States', field_tags: [],
    funding: { tuition: 'covered', insurance: true, travel: true },
    degree_levels_accepted: ['graduate'],
    eligibility_rules: [{ rule_text: 'PhD awardees sign an HEC return-service bond; clinical medicine excluded.', rule_type: 'mechanical', source_quote: 'clinical medicine excluded', source_url: 'https://usefp.org/scholarships/fulbright-degree.cfm' }],
    requirements: [], opens: '2027-01-01', deadline: null, tier: 'T2',
    source_url: 'https://usefp.org/scholarships/fulbright-degree.cfm', source_type: 'official', verification_level: 'pattern', origin: 'txt',
  },

  // ---- Category 3 — Fully funded PhD programs & industry PhD fellowships (§4) ----
  {
    title: 'OIST PhD Program', track: 'phd_funded', category: 3, integrated_phd_fast_track: true,
    institution: 'Okinawa Institute of Science and Technology', country: 'Japan', field_tags: [],
    funding: { stipend: { amount: 2400000, currency: 'JPY', period: 'year' }, tuition: 'covered' },
    degree_levels_accepted: ['undergraduate', 'graduate'], eligibility_rules: [],
    requirements: [{ type: 'research_proposal', label: 'Research statement', satisfied: false }, { type: 'cv', label: 'CV', satisfied: false }, { type: 'lor', label: '3 references', count: 3, satisfied: false }],
    opens: '2026-07-31', deadline: '2026-11-15', tier: 'T2',
    source_url: 'https://www.oist.jp/admissions/phd-program/apply-phd', source_type: 'official', verification_level: 'verified', origin: 'txt',
  },
  {
    title: 'ELLIS PhD Program', track: 'phd_funded', category: 3, integrated_phd_fast_track: false,
    institution: 'ELLIS (European Laboratory for Learning and Intelligent Systems)', country: 'Europe (multi-country)', field_tags: ['machine learning'],
    funding: {}, degree_levels_accepted: ['graduate'], eligibility_rules: [], requirements: [],
    opens: '2026-10-01', deadline: null, tier: 'T2',
    source_url: 'https://ellis.eu/research/phd-postdoc/guidelines-phd-admission-process', source_type: 'official', verification_level: 'pattern', origin: 'txt',
  },
  {
    title: 'Apple Scholars in AI/ML & Google PhD Fellowship', track: 'phd_funded', category: 3, integrated_phd_fast_track: false,
    institution: 'Apple / Google', country: 'Global', field_tags: ['AI', 'ML'],
    funding: { notes: 'living-expense gift for 2 years + $5,000/yr travel; mentorship' },
    degree_levels_accepted: ['graduate'],
    eligibility_rules: [{ rule_text: 'University nomination only — cannot self-apply.', rule_type: 'mechanical', source_quote: 'university nomination only', source_url: 'https://www.tech.cam.ac.uk/apple-google-phd-fellowships-0' }],
    requirements: [], opens: '2027-04-01', deadline: null, tier: 'T1',
    source_url: 'https://www.tech.cam.ac.uk/apple-google-phd-fellowships-0', source_type: 'official', verification_level: 'verified', origin: 'txt',
  },
  ...[
    ['Max Planck IMPRS schools', 'Germany', 'https://www.mpg.de/imprs', false],
    ['Marie Skłodowska-Curie Doctoral Networks', 'Europe (multi-country)', 'https://euraxess.ec.europa.eu/jobs', false],
    ['KAUST Fellowship', 'Saudi Arabia', 'https://admissions.kaust.edu.sa', false],
    ['MBZUAI', 'United Arab Emirates', 'https://mbzuai.ac.ae', false],
    ['Vector Institute / Mila graduate pathways', 'Canada', 'https://vectorinstitute.ai', true],
    ['HEC Pakistan overseas & indigenous PhD schemes', 'Pakistan', 'https://www.hec.gov.pk', false],
  ].map(([title, country, url, integrated]) => ({
    title, track: 'phd_funded', category: 3, integrated_phd_fast_track: integrated,
    institution: title, country, field_tags: [],
    funding: {}, degree_levels_accepted: [], eligibility_rules: [], requirements: [], deadline: null, tier: 'T3',
    source_url: url, source_type: 'official', verification_level: 'pattern', origin: 'txt',
  })),

  // ---- Explicit integrated_phd_fast_track seeds (Phase 3 instruction) — sourced from profile v5 §5.1 ----
  {
    title: 'UK EPSRC Centres for Doctoral Training / Integrated PhD programmes', track: 'phd_funded', category: 3, integrated_phd_fast_track: true,
    institution: 'UK universities (sector-wide, EPSRC-funded)', country: 'United Kingdom', field_tags: [],
    funding: {}, degree_levels_accepted: ['undergraduate'],
    eligibility_rules: [{ rule_text: 'Typically requires a 2:1 undergraduate degree; IELTS typically 6.0.', rule_type: 'discretionary', source_quote: 'explicitly designed for applicants without a master\'s; 2:1 undergraduate, IELTS typically 6.0', source_url: 'https://www.findaphd.com/guides/integrated-phd-programmes' }],
    requirements: [], deadline: null, tier: 'T2',
    source_url: 'https://www.findaphd.com/guides/integrated-phd-programmes', source_type: 'aggregator', verification_level: 'pattern', origin: 'manual',
  },
  ...['Cognition', 'Matter to Life', 'Photonics'].map((school) => ({
    title: `Max Planck School of ${school}`, track: 'phd_funded', category: 3, integrated_phd_fast_track: true,
    institution: 'Max Planck Society', country: 'Germany', field_tags: [],
    funding: { stipend: { amount: 992, currency: 'EUR', period: 'month' }, notes: 'stipend during the qualification phase, plus allowances' },
    degree_levels_accepted: ['undergraduate'],
    eligibility_rules: [{ rule_text: '"Excellent graduates with a Bachelor\'s degree" — not every school offers the fast-track qualification phase, check per school.', rule_type: 'discretionary', source_quote: 'Excellent graduates with a Bachelor\'s degree', source_url: 'https://www.mpg.de/en/bachelors' }],
    requirements: [], deadline: null, tier: 'T2',
    source_url: 'https://www.mpg.de/en/bachelors', source_type: 'official', verification_level: 'pattern', origin: 'manual',
  })),
  {
    title: 'Canadian direct-entry PhD departments', track: 'phd_funded', category: 3, integrated_phd_fast_track: true,
    institution: 'Canadian universities (department-dependent)', country: 'Canada', field_tags: [],
    funding: {}, degree_levels_accepted: ['undergraduate'],
    eligibility_rules: [{ rule_text: 'Strong bachelor\'s degree; direct-entry availability varies by department — verify per department.', rule_type: 'discretionary', source_quote: 'direct-entry PhD at several universities; or master\'s with transfer to PhD after year 1 — check per department', source_url: 'https://www.findaphd.com/guides/integrated-phd-programmes' }],
    requirements: [], deadline: null, tier: 'T3',
    source_url: 'https://www.findaphd.com/guides/integrated-phd-programmes', source_type: 'aggregator', verification_level: 'pattern', origin: 'manual',
  },

  // ---- Category 5 — Research internships (§5) ----
  {
    title: 'Mitacs Globalink Research Internship 2027', track: 'internship', category: 5, integrated_phd_fast_track: false,
    institution: 'Mitacs (partner universities)', country: 'Canada', field_tags: [],
    funding: { notes: '12-week funded research internship with a Canadian professor' },
    degree_levels_accepted: ['undergraduate'],
    eligibility_rules: [{ rule_text: 'Requires enrolled full-time undergraduate status with 1-3 semesters remaining as of fall 2027, at a listed partner institution.', rule_type: 'mechanical', source_quote: 'full-time undergrad (or combined bachelor\'s/master\'s), 1-3 semesters remaining as of fall 2027', source_url: 'https://www.mitacs.ca/our-programs/globalink-research-internship-students/' }],
    requirements: [{ type: 'lor', label: 'Professor reference letter', satisfied: false }],
    deadline: '2026-09-16', tier: 'T3',
    source_url: 'https://www.mitacs.ca/our-programs/globalink-research-internship-students/', source_type: 'official', verification_level: 'verified', origin: 'txt',
  },
  {
    title: 'OIST Research Internship', track: 'internship', category: 5, integrated_phd_fast_track: false,
    institution: 'Okinawa Institute of Science and Technology', country: 'Japan', field_tags: [],
    funding: {}, degree_levels_accepted: ['undergraduate', 'graduate'], eligibility_rules: [], requirements: [],
    rolling: true, tier: 'T3',
    source_url: 'https://www.oist.jp/admissions', source_type: 'official', verification_level: 'verified', origin: 'txt',
  },
  ...[
    ['DAAD RISE Worldwide', 'Germany', 'https://www.daad.de/rise', ['undergraduate']],
    ['CERN Summer Student / Technical Student', 'Switzerland', 'https://careers.cern', ['undergraduate', 'graduate']],
    ['EPFL Excellence Research Internship', 'Switzerland', 'https://www.epfl.ch', ['undergraduate', 'graduate']],
    ['KAUST Visiting Student Research Program (VSRP)', 'Saudi Arabia', 'https://vsrp.kaust.edu.sa', ['undergraduate', 'graduate']],
    ['ETH Student Summer Research Fellowship', 'Switzerland', 'https://ethz.ch', ['undergraduate', 'graduate']],
    ['Amgen Scholars', 'US / Europe / Asia', 'https://amgenscholars.com', ['undergraduate']],
  ].map(([title, country, url, levels]) => ({
    title, track: 'internship', category: 5, integrated_phd_fast_track: false,
    institution: title, country, field_tags: [], funding: {}, degree_levels_accepted: levels,
    eligibility_rules: [], requirements: [], deadline: null, tier: 'T3',
    source_url: url, source_type: 'official', verification_level: 'pattern', origin: 'txt',
  })),
  {
    title: 'CERN Student Programmes (Technical, Administrative, Doctoral)', track: 'internship', category: 5, integrated_phd_fast_track: false,
    institution: 'CERN', country: 'Switzerland', field_tags: [],
    funding: { stipend: { amount: 3486, currency: 'CHF', period: 'month' } },
    degree_levels_accepted: [], eligibility_rules: [], requirements: [],
    deadline: '2026-06-30', tier: 'T3',
    source_url: 'https://careers.cern', source_type: 'official', verification_level: 'verified', origin: 'txt',
  },
  {
    title: 'Max Planck Institute Research Internship (Summer 2027)', track: 'internship', category: 5, integrated_phd_fast_track: false,
    institution: 'Max Planck Society', country: 'Germany', field_tags: [],
    funding: {}, degree_levels_accepted: [], eligibility_rules: [], requirements: [],
    opens: '2027-01-01', deadline: null, tier: 'T3',
    source_url: 'https://www.mpg.de/imprs', source_type: 'aggregator', verification_level: 'pattern', origin: 'txt',
  },
  {
    title: 'AI2ML Conference 2026 — Call for Papers', track: 'conference', category: 7, integrated_phd_fast_track: false,
    institution: 'NUST / Azerbaijan Technical University / IEEE', country: 'Multiple', field_tags: ['AI', 'ML'],
    funding: {}, degree_levels_accepted: [], eligibility_rules: [],
    requirements: [{ type: 'writing_sample', label: 'Paper submission', satisfied: false }],
    deadline: '2026-06-21', tier: 'T3',
    source_url: 'https://www.ieee.org', source_type: 'aggregator', verification_level: 'conflicting', origin: 'txt',
    // no specific conference URL was given in the source beyond a generic IEEE affiliation — flagged conflicting for resolution.
  },
  {
    title: 'Future Minds Summit 2026', track: 'conference', category: 7, integrated_phd_fast_track: false,
    institution: 'Future Minds', country: 'Thailand', region: 'Bangkok', field_tags: ['youth leadership'],
    funding: { notes: 'fully funded 4-day program' }, degree_levels_accepted: [], eligibility_rules: [], requirements: [],
    deadline: '2026-06-15', tier: 'T3',
    source_url: 'https://opportunitiesforyouth.org', source_type: 'aggregator', verification_level: 'conflicting', origin: 'txt',
  },

  // ---- Category 6 — Founder, builder & startup programs (§6) ----
  {
    title: 'Y Combinator — Winter 2027', track: 'accelerator', category: 6, integrated_phd_fast_track: false,
    institution: 'Y Combinator', country: 'United States', region: 'San Francisco', field_tags: ['founder programs'],
    funding: { notes: '$500K standard deal (reported)' }, degree_levels_accepted: [], eligibility_rules: [], requirements: [],
    deadline: '2026-11-02', tier: 'T3',
    source_url: 'https://www.ycombinator.com/early-decision', source_type: 'official', verification_level: 'verified', origin: 'txt',
  },
  {
    title: 'Thiel Fellowship', track: 'accelerator', category: 6, integrated_phd_fast_track: false,
    institution: 'Thiel Foundation', country: 'Global', field_tags: ['founder programs'],
    funding: { stipend: { amount: 125000, currency: 'USD', period: 'year' }, notes: '$250,000 over two years, no equity' },
    degree_levels_accepted: [],
    eligibility_rules: [{ rule_text: 'Age 22 or under; must not hold a completed university degree.', rule_type: 'mechanical', source_quote: '22 or younger without a university degree; you must leave or skip university to accept', source_url: 'https://thielfellowship.org' }],
    requirements: [], rolling: true, tier: 'T3',
    source_url: 'https://thielfellowship.org', source_type: 'official', verification_level: 'verified', origin: 'txt',
  },
  {
    title: 'Emergent Ventures', track: 'accelerator', category: 6, integrated_phd_fast_track: false,
    institution: 'Mercatus Center', country: 'Global', field_tags: ['founder programs'],
    funding: {}, degree_levels_accepted: [], eligibility_rules: [], requirements: [], rolling: true, tier: 'T3',
    source_url: 'https://mercatus.tfaforms.net/5099527', source_type: 'official', verification_level: 'verified', origin: 'txt',
  },
  {
    title: 'a16z Speedrun / Alpha Fellowship', track: 'accelerator', category: 6, integrated_phd_fast_track: false,
    institution: 'Andreessen Horowitz', country: 'United States', field_tags: ['founder programs'],
    funding: { notes: 'Alpha Fellowship: $20,000 equity-free grant for early consideration' },
    degree_levels_accepted: [], eligibility_rules: [], requirements: [], rolling: true, tier: 'T3',
    source_url: 'https://speedrun.a16z.com', source_type: 'official', verification_level: 'verified', origin: 'txt',
  },
  {
    title: 'NVIDIA Inception', track: 'accelerator', category: 6, integrated_phd_fast_track: false,
    institution: 'NVIDIA', country: 'Global', field_tags: ['founder programs', 'AI startups'],
    funding: { notes: 'credits, training, investor access — free program' },
    degree_levels_accepted: [], eligibility_rules: [], requirements: [], rolling: true, tier: 'T3',
    source_url: 'https://www.nvidia.com/en-us/startups/', source_type: 'official', verification_level: 'verified', origin: 'txt',
  },

  // ---- Category 8 — Postdoctoral fellowships (split out of the source's §7 table per spec's own taxonomy) ----
  {
    title: 'Marie Skłodowska-Curie Postdoctoral Fellowships', track: 'postdoc', category: 8, integrated_phd_fast_track: false,
    institution: 'European Commission', country: 'Europe (multi-country)', field_tags: [],
    funding: {}, degree_levels_accepted: ['postdoc'], eligibility_rules: [], requirements: [],
    opens: '2027-08-01', deadline: null, tier: 'T2',
    source_url: 'https://marie-sklodowska-curie-actions.ec.europa.eu', source_type: 'official', verification_level: 'pattern', origin: 'txt',
  },
  {
    title: 'Humboldt Research Fellowship', track: 'postdoc', category: 8, integrated_phd_fast_track: false,
    institution: 'Alexander von Humboldt Foundation', country: 'Germany', field_tags: [],
    funding: {}, degree_levels_accepted: ['postdoc'], eligibility_rules: [], requirements: [], rolling: true, tier: 'T2',
    source_url: 'https://www.humboldt-foundation.de', source_type: 'official', verification_level: 'pattern', origin: 'txt',
  },
  {
    title: 'Schlumberger Foundation Faculty for the Future', track: 'postdoc', category: 8, integrated_phd_fast_track: false,
    institution: 'Schlumberger Foundation', country: 'Global', field_tags: [],
    funding: {}, degree_levels_accepted: ['graduate', 'postdoc'],
    eligibility_rules: [{ rule_text: 'For women from developing economies.', rule_type: 'mechanical', source_quote: 'women from developing economies', source_url: 'https://www.slb.com/facultyforthefuture' }],
    requirements: [], opens: '2026-09-01', deadline: null, tier: 'T2',
    source_url: 'https://www.slb.com/facultyforthefuture', source_type: 'official', verification_level: 'pattern', origin: 'txt',
  },

  // ---- Category 9 — Pattern-based annual cycles (§7, minus the postdoc rows split above) ----
  ...[
    ['Rhodes Scholarship (Pakistan constituency)', 'https://www.rhodeshouse.ox.ac.uk', 'United Kingdom'],
    ['Clarendon Fund (Oxford)', 'https://www.ox.ac.uk/clarendon', 'United Kingdom'],
    ['MEXT Scholarship — Embassy track', 'https://www.studyinjapan.go.jp', 'Japan'],
    ['Global Korea Scholarship (GKS) — Graduate', 'https://www.studyinkorea.go.kr', 'South Korea'],
    ['Türkiye Bursları', 'https://www.turkiyeburslari.gov.tr', 'Turkey'],
    ['Chinese Government Scholarship (CSC)', 'https://www.campuschina.org', 'China'],
    ['Stipendium Hungaricum', 'https://stipendiumhungaricum.hu', 'Hungary'],
    ['Aga Khan Foundation International Scholarship', 'https://www.akdn.org', 'Global'],
    ['Rotary Peace Fellowship', 'https://www.rotary.org', 'Global'],
    ['Australia Awards', 'https://www.dfat.gov.au/people-to-people/australia-awards', 'Australia'],
  ].map(([title, url, country]) => ({
    title, track: 'scholarship', category: 9, integrated_phd_fast_track: false,
    institution: title, country, field_tags: [], funding: {}, degree_levels_accepted: ['graduate'],
    eligibility_rules: [], requirements: [], deadline: null, tier: 'T2',
    source_url: url, source_type: 'official', verification_level: 'pattern', origin: 'txt',
  })),

  // ---- Category 4 — Professor-led funded positions (Part B §1) ----
  {
    title: 'Fully Funded PhD Scholarship — Human-centric physical AI', track: 'phd_funded', category: 4, integrated_phd_fast_track: false,
    institution: 'Imperial College London', country: 'United Kingdom', field_tags: ['human-centric physical AI', 'computer perception'],
    supervisor: { name: 'Iasonas Kokkinos', lab_url: 'https://jkokkin.github.io' },
    funding: {}, degree_levels_accepted: [], eligibility_rules: [], requirements: [],
    opens: '2026-01-01', tier: 'T2',
    source_url: 'https://jkokkin.github.io', source_type: 'social', verification_level: 'conflicting', origin: 'txt',
  },
  {
    title: 'Fully Funded PhD Positions — SEDIS Lab', track: 'phd_funded', category: 4, integrated_phd_fast_track: false,
    institution: 'University of Texas at Dallas', country: 'United States', field_tags: ['uncertainty-aware inference', 'distributed AI', 'multi-agent systems'],
    supervisor: { name: 'Minah Lee' },
    funding: {}, degree_levels_accepted: [], eligibility_rules: [], requirements: [],
    deadline: '2026-08-23', tier: 'T2',
    source_url: 'https://labs.utdallas.edu/sedis', source_type: 'social', verification_level: 'conflicting', origin: 'txt',
  },
  {
    title: 'Two Fully Funded PhD Positions — PEARL Lab', track: 'phd_funded', category: 4, integrated_phd_fast_track: false,
    institution: 'University of Nebraska-Lincoln', country: 'United States', field_tags: ['embodied AI', 'robot perception'],
    supervisor: { name: 'Quan Luu', email: 'qluu3@unl.edu' },
    funding: {}, degree_levels_accepted: [], eligibility_rules: [], requirements: [], tier: 'T2',
    source_url: 'mailto:qluu3@unl.edu', source_type: 'social', verification_level: 'conflicting', origin: 'txt',
  },
  {
    title: 'Two Fully Funded PhD Positions — Humanoid Robots Lab (TV-L E13)', track: 'phd_funded', category: 4, integrated_phd_fast_track: false,
    institution: 'University of Bonn', country: 'Germany', field_tags: ['VLM-based reasoning', 'robotic intervention'],
    supervisor: { name: 'Maren Bennewitz' },
    funding: {}, degree_levels_accepted: [], eligibility_rules: [], requirements: [],
    deadline: '2026-08-14', tier: 'T2',
    source_url: 'https://www.hrl.uni-bonn.de/research', source_type: 'social', verification_level: 'conflicting', origin: 'txt',
  },
  {
    title: 'Fully Funded PhD — SAI-CROP', track: 'phd_funded', category: 4, integrated_phd_fast_track: false,
    institution: 'University of Augsburg', country: 'Germany', field_tags: ['climate-resilient agriculture', 'remote sensing'],
    supervisor: { name: 'Daniela P.' },
    funding: {}, degree_levels_accepted: [], eligibility_rules: [], requirements: [],
    deadline: '2026-08-01', tier: 'T3',
    source_url: 'https://www.uni-augsburg.de', source_type: 'social', verification_level: 'conflicting', origin: 'txt',
  },
  {
    title: 'Fully Funded PhD & Postdoctoral Positions — SMILE Lab', track: 'phd_funded', category: 4, integrated_phd_fast_track: false,
    institution: 'Vanderbilt University', country: 'United States', field_tags: ['multimodal clinical foundation models', 'agentic AI'],
    supervisor: { name: 'Ruogu Fang', email: 'smilefanglab@gmail.com' },
    funding: {}, degree_levels_accepted: [], eligibility_rules: [], requirements: [], tier: 'T2',
    source_url: 'mailto:smilefanglab@gmail.com', source_type: 'social', verification_level: 'conflicting', origin: 'txt',
    // v5's own §1 notes Ruogu Fang appears elsewhere as "University of Florida" — institution genuinely conflicting between sources, surfaced not resolved.
  },
  {
    title: 'PhD Application — Fully Funded (Fall 2027 cohort)', track: 'phd_funded', category: 4, integrated_phd_fast_track: false,
    institution: 'Harvard Business School', country: 'United States', field_tags: ['business', 'technology & operations management'],
    supervisor: { name: 'Marais Canali Young' },
    funding: { stipend: { amount: 57054, currency: 'USD', period: 'year' }, tuition: 'covered', insurance: true },
    degree_levels_accepted: [], eligibility_rules: [], requirements: [], tier: 'T2',
    source_url: 'https://www.hbs.edu/doctoral', source_type: 'social', verification_level: 'conflicting', origin: 'txt',
  },
  {
    title: 'PhD Students — Nutritional Sciences (Fall 2027)', track: 'phd_funded', category: 4, integrated_phd_fast_track: false,
    institution: 'Penn State', country: 'United States', field_tags: ['nutritional sciences'],
    supervisor: { name: 'Kristina Petersen' },
    funding: {}, degree_levels_accepted: [], eligibility_rules: [], requirements: [], tier: 'T3',
    source_url: 'https://www.psu.edu', source_type: 'social', verification_level: 'conflicting', origin: 'txt',
  },
  {
    title: 'Two Fully-Funded PhD Opportunities — Structural Engineering', track: 'phd_funded', category: 4, integrated_phd_fast_track: false,
    institution: 'University of Adelaide', country: 'Australia', field_tags: ['fiber-reinforced polymer structures'],
    supervisor: { name: 'Tafsirojaman', email: 'tafsirojaman@adelaide.edu.au' },
    funding: {}, degree_levels_accepted: [], eligibility_rules: [], requirements: [], tier: 'T3',
    source_url: 'mailto:tafsirojaman@adelaide.edu.au', source_type: 'social', verification_level: 'conflicting', origin: 'txt',
  },
  {
    title: 'Open PhD Position (Start Jan 2027)', track: 'phd_funded', category: 4, integrated_phd_fast_track: false,
    institution: 'Iowa State University', country: 'United States', field_tags: ['cityscape resilience', 'probabilistic mechanics'],
    supervisor: { name: 'Alice Alipour', email: 'alipour@iastate.edu' },
    funding: {}, degree_levels_accepted: [], eligibility_rules: [], requirements: [],
    opens: '2027-01-01', tier: 'T3',
    source_url: 'mailto:alipour@iastate.edu', source_type: 'social', verification_level: 'conflicting', origin: 'txt',
  },

  // ---- Category 4 — GTA-relevant, Category 2/8 non-duplicate Part B entries with a usable source ----
  {
    title: 'Stanford Biodesign Innovation Fellowship 2027-28', track: 'fellowship', category: 8, integrated_phd_fast_track: false,
    institution: 'Stanford University', country: 'United States', field_tags: ['medtech'],
    funding: {}, degree_levels_accepted: ['graduate'], eligibility_rules: [], requirements: [],
    deadline: '2026-08-27', tier: 'T1',
    source_url: 'https://biodesign.stanford.edu/education/fellowship.html', source_type: 'official', verification_level: 'verified', origin: 'txt',
  },
]

console.log(`Inserting ${rows.length} opportunity rows (status computed against ${TODAY})...`)

// Bulk insert sends NULL for a key omitted on some rows when other rows in
// the same batch set it explicitly, rather than falling back to the
// column default per row — so every NOT NULL-with-default column needs an
// explicit value on every row here, not just where it differs from default.
const toInsert = rows.map((r) => ({ ...r, rolling: r.rolling ?? false, scam_risk: r.scam_risk ?? false, status: computeStatus(r) }))
const BATCH = 25
let inserted = 0
for (let i = 0; i < toInsert.length; i += BATCH) {
  const chunk = toInsert.slice(i, i + BATCH)
  const { error, data } = await admin.from('opportunities').insert(chunk).select('id')
  if (error) {
    console.error(`Batch ${i / BATCH} failed:`, error.message)
    console.error('First row in failing batch:', JSON.stringify(chunk[0], null, 2))
    process.exit(1)
  }
  inserted += data.length
  console.log(`  inserted ${inserted}/${toInsert.length}`)
}

const byStatus = {}
for (const r of toInsert) byStatus[r.status] = (byStatus[r.status] ?? 0) + 1
console.log('\nStatus breakdown:', byStatus)

const byCategory = {}
for (const r of toInsert) byCategory[r.category] = (byCategory[r.category] ?? 0) + 1
console.log('Category breakdown:', byCategory)

console.log(`\nintegrated_phd_fast_track rows: ${toInsert.filter((r) => r.integrated_phd_fast_track).length}`)
console.log(`Total inserted: ${inserted}`)
