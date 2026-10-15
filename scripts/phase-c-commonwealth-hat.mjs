// Phase C data fixes — run once.
// 1. Sets identity.years_of_education = 16 on the current profile snapshot
//    (self-attested: BE Electronics Engineering is a 16-year degree in
//    Pakistan's system, same basis HEC's own eligibility pages use).
// 2. Splits the single "Commonwealth Master's & PhD Scholarships 2027/28"
//    row into two — Master's and PhD — since HEC gates each at a
//    different years-of-education threshold and the merged row hid that
//    the user is only eligible for one of them.
// 3. Adds the HAT requirement (valid score, HEC-wide) to both Commonwealth
//    rows and to "HEC Pakistan overseas & indigenous PhD schemes".
//
// Every source_quote below was fetched and verified directly against
// https://www.hec.gov.pk/english/HECAnnouncements/Pages/CW-Scholarship.aspx
// in this session (not invented) — see the commit message for the
// verification trail.
import { createClient } from '@supabase/supabase-js'

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

const HEC_CW_URL = 'https://www.hec.gov.pk/english/HECAnnouncements/Pages/CW-Scholarship.aspx'
const HAT_REQUIREMENT = { type: 'aptitude_test', label: 'Valid HAT score (≥60/100, HAT-I–IV)', satisfied: false }
const NOMINATING_BODY_RULE = {
  rule_text: 'For citizens/residents of eligible Commonwealth countries; usually applied for through a national nominating body with its own earlier deadline.',
  rule_type: 'discretionary',
  source_url: 'https://cscuk.fcdo.gov.uk',
  source_quote: 'apply through a national nominating body, which sets its own earlier deadline',
}

// ---- 1. Profile fact ----
const { data: current, error: curErr } = await sb.from('profile_snapshots').select('id, identity').eq('is_current', true).single()
if (curErr || !current) { console.error('No current profile snapshot:', curErr?.message); process.exit(1) }
const { error: updErr } = await sb.from('profile_snapshots').update({ identity: { ...current.identity, years_of_education: 16 } }).eq('id', current.id)
if (updErr) { console.error('Failed to set years_of_education:', updErr.message); process.exit(1) }
console.log('Set years_of_education: 16 on the current profile snapshot.')

// ---- 2. Split the Commonwealth row ----
const { data: cw, error: cwErr } = await sb.from('opportunities').select('*').eq('title', "Commonwealth Master's & PhD Scholarships 2027/28").maybeSingle()
if (cwErr) { console.error(cwErr.message); process.exit(1) }
if (!cw) {
  console.log('Commonwealth combined row not found — already split, or renamed. Skipping split step.')
} else {
  const base = {
    institution: cw.institution,
    country: cw.country,
    funding: cw.funding,
    opens: cw.opens,
    deadline: cw.deadline,
    rolling: cw.rolling,
    status: cw.status,
    tier: cw.tier,
    apply_url: cw.apply_url,
    source_url: cw.source_url,
    verified_on: cw.verified_on,
    source_type: cw.source_type,
    verification_level: cw.verification_level,
    scam_risk: cw.scam_risk,
    origin: cw.origin,
    track: cw.track,
    category: cw.category,
    integrated_phd_fast_track: false,
    field_tags: cw.field_tags,
  }

  const mastersRow = {
    ...base,
    title: "Commonwealth Master's Scholarship 2027/28",
    degree_levels_accepted: ['undergraduate'], // a completed bachelor's is the entry point
    eligibility_rules: [
      NOMINATING_BODY_RULE,
      {
        rule_text: "Requires a first-division 16-year bachelor's degree",
        rule_type: 'mechanical', // binary in principle; no profile field for "division" to auto-check against, so informational only — same pattern as Rhodes' age cap
        source_quote: 'an applicant must hold a first division in 16 years Bachelors degree',
        source_url: HEC_CW_URL,
      },
    ],
    requirements: [HAT_REQUIREMENT],
  }

  const phdRow = {
    ...base,
    title: 'Commonwealth PhD Scholarship 2027/28',
    degree_levels_accepted: ['graduate'], // requires an existing Master's/MS/MPhil to enter
    eligibility_rules: [
      NOMINATING_BODY_RULE,
      {
        rule_text: "Requires a first-division 17/18-year Master's/MS/MPhil degree",
        rule_type: 'mechanical',
        check: { kind: 'years_of_education_min', value: 17 },
        source_quote: 'an applicant must hold a first division in 17/18 years Masters/MS/MPhil degree',
        source_url: HEC_CW_URL,
      },
    ],
    requirements: [HAT_REQUIREMENT],
  }

  const { error: insErr } = await sb.from('opportunities').insert([mastersRow, phdRow])
  if (insErr) { console.error('Insert failed:', insErr.message); process.exit(1) }

  // Clears the old row's own verdict/gaps too (ON DELETE CASCADE on both).
  const { error: delErr } = await sb.from('opportunities').delete().eq('id', cw.id)
  if (delErr) { console.error('Delete of old combined row failed:', delErr.message); process.exit(1) }
  console.log('Split Commonwealth row into Master\'s + PhD rows; deleted the combined row.')
}

// ---- 3. HAT on HEC's own overseas/indigenous PhD schemes ----
const { data: hecRow, error: hecErr } = await sb.from('opportunities').select('id, requirements').eq('title', 'HEC Pakistan overseas & indigenous PhD schemes').maybeSingle()
if (hecErr) { console.error(hecErr.message); process.exit(1) }
if (hecRow) {
  const already = (hecRow.requirements ?? []).some((r) => r.label === HAT_REQUIREMENT.label)
  if (!already) {
    const { error } = await sb.from('opportunities').update({ requirements: [...(hecRow.requirements ?? []), HAT_REQUIREMENT] }).eq('id', hecRow.id)
    if (error) { console.error('Failed to add HAT requirement to HEC row:', error.message); process.exit(1) }
    console.log('Added HAT requirement to "HEC Pakistan overseas & indigenous PhD schemes".')
  } else {
    console.log('HEC overseas/indigenous row already has the HAT requirement.')
  }
} else {
  console.log('"HEC Pakistan overseas & indigenous PhD schemes" row not found — skipping.')
}

console.log('\nDone. Run POST /api/diagnose next to re-diagnose the pool against these changes.')
