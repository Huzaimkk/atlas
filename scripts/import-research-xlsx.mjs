// Bulk import — Opportunity_Research_EU_USA_UAE.xlsx (254 Opportunities-
// sheet rows; Texas focus/University details/Employer targets/Events are
// pure enrichment views over those same 254 IDs — verified 100% match
// rate against the Opportunities sheet's own ID column before writing
// this script, so none of those four sheets create new rows on their own).
//
// Source JSON produced by scripts/extract-research-xlsx.py (openpyxl ->
// JSON; kept as a separate step since this project has no xlsx-reading
// Node dependency and installing one for a single one-off import isn't
// worth it).
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
const DATA_PATH = process.argv[2]
if (!DATA_PATH) { console.error('Usage: node import-research-xlsx.mjs <path-to-research-import.json>'); process.exit(1) }
const data = JSON.parse(readFileSync(DATA_PATH, 'utf-8'))

function norm(s) {
  return (s ?? '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
}
function toDate(v) {
  if (!v) return null
  return String(v).slice(0, 10)
}
function splitList(v) {
  if (!v) return []
  return String(v).split(';').map((s) => s.trim()).filter(Boolean)
}

// ---- Type -> track/category ----
const TYPE_MAP = {
  assistantship: ['ra', 4],
  phd_program: ['phd_funded', 3],
  phd_vacancy: ['phd_funded', 4],
  employment: ['internship', 5], // closest existing bucket — these are Employer-targets career/job rows, not confirmed vacancies (flagged in source_assessment)
  scholarship: ['scholarship', 2],
  fellowship: ['fellowship', 2],
  founder_program: ['accelerator', 6],
  event: ['conference', 7],
  internship: ['internship', 5],
  postdoc: ['postdoc', 8],
  startup_support: ['accelerator', 6],
  graduate_research: ['ra', 4],
  grant: ['fellowship', 2],
  research_training: ['internship', 5],
  masters_program: ['scholarship', 2],
  competition: ['conference', 7],
}

function mapTrackCategory(type, level) {
  let [track, category] = TYPE_MAP[type] ?? ['scholarship', 2]
  if (type === 'fellowship' && /postdoc/i.test(level ?? '')) category = 8
  return { track, category }
}

function mapDegreeLevels(level) {
  const tokens = splitList((level ?? '').replace(/;/g, ';'))
  const out = new Set()
  for (const t of tokens) {
    if (/undergrad|bachelor/i.test(t)) out.add('undergraduate')
    else out.add('graduate')
  }
  return [...out]
}

// their status -> our Status, given deadline presence
function mapStatus(theirStatus, deadline, startDate) {
  switch (theirStatus) {
    case 'open': return 'open'
    case 'rolling': return 'rolling'
    case 'closed': return 'expired'
    case 'paused': return 'paused'
    case 'program_specific': return 'program_specific'
    case 'check_cycle': return 'not_yet_open'
    case 'upcoming': return deadline ? 'open' : (startDate ? 'not_yet_open' : 'program_specific')
    case 'deadline_conflict': return deadline ? 'open' : 'not_yet_open'
    default: return 'program_specific'
  }
}

function buildSourceAssessment(row) {
  const parts = []
  if (row['CV fit']) parts.push(`CV fit (source file, not our fit score): ${row['CV fit']}`)
  if (row['Why it fits / does not fit']) parts.push(`Why it fits / does not fit: ${row['Why it fits / does not fit']}`)
  if (row['Missing evidence / entry criteria']) parts.push(`Missing evidence / entry criteria: ${row['Missing evidence / entry criteria']}`)
  if (row['Funding decision for this profile']) parts.push(`Funding decision for this profile: ${row['Funding decision for this profile']}`)
  if (row['Profile assessment']) parts.push(`Profile assessment: ${row['Profile assessment']}`)
  if (row['Eligibility']) parts.push(`Eligibility (source file text): ${row['Eligibility']}`)
  if (row['Work authorization']) parts.push(`Work authorization: ${row['Work authorization']}`)
  if (row['Notes / conflicts']) parts.push(`Notes / conflicts: ${row['Notes / conflicts']}`)
  if (row['Review depth']) parts.push(`Review depth: ${row['Review depth']}`)
  if (row['Type'] === 'employment') parts.push('Note: an employer-target entry, not a confirmed open vacancy.')
  return parts.join('\n\n') || null
}

function buildFunding(row) {
  const notesParts = []
  if (row['Funding / benefits']) notesParts.push(row['Funding / benefits'])
  if (row['Amount basis']) notesParts.push(`Basis: ${row['Amount basis']}`)
  if (row['Funding type']) notesParts.push(`Funding type (source file): ${row['Funding type']}`)
  const notes = notesParts.join(' ') || undefined
  if (row['Amount']) {
    const period = /year|annual/i.test(row['Amount basis'] ?? '') ? 'year' : 'month'
    return { stipend: { amount: Number(row['Amount']), currency: row['Currency'] || 'USD', period }, notes }
  }
  return notes ? { notes } : undefined
}

// ---- Corrections: explicit, hand-verified keyword map (read every one of the 33 rows before writing this) ----
// Each issue maps to OR-groups of AND-within-group keywords: [['a','b'], ['c']]
// matches a title containing (a AND b) OR (c). Matched as whole words
// (see matchesKeywords) — a plain substring check let "ens" match inside
// "Siemens" and "spar" match inside "OwlSpark" (both found and fixed after
// the first run; see the commit message).
const CORRECTION_KEYWORDS = {
  'MBZUAI funding': [['mbzuai']],
  'MATS Residency': [['mats', 'residency']],
  'Yale blanket scholarship': [['yale']],
  'Humboldt rolling claim': [['humboldt']],
  'ISTernship': [['isternship']],
  'EMAI scholarships': [['emai']],
  'Claude Corps experience': [['claude', 'corps']],
  'SPAR and AI-written answers': [['spar']],
  'IMPRS-IS and AI': [['imprs']],
  'Thiel degree restriction': [['thiel']],
  'Eiffel dates': [['eiffel']],
  'Aalto dates': [['aalto']],
  'ENS dates': [['ens']],
  'MBZUAI Computational Biology': [['mbzuai', 'computational']],
  'Banach NAWA nationality': [['banach']],
  'EMBL current status': [['embl']],
  'Capital Factory legacy accelerator': [['capital', 'factory']],
  'OwlSpark and LPI': [['owlspark'], ['lpi']],
  'Rice competition mixed year labels': [['rice']],
  'FDA ORISE residence condition': [['fda'], ['orise']],
  'MPOWER application automation': [['mpower']],
  'Stanford AI+HEALTH 2026': [['stanford']],
  'SMU / Nevada direct PhD': [['smu'], ['nevada']],
  'Brown funding wording': [['brown']],
}
// These are dataset-level/methodology notes with no single matching row —
// intentionally not applied per-row (reported to the user separately).
const GENERAL_CORRECTIONS = new Set([
  'US access', 'Funding types', 'Original verification labels', 'Source coverage',
  'Texas and all-state coverage', 'Partial versus full funding', 'Texas and US event locations',
  'Funding-table scope',
])

// Corrections whose text is an *unresolved conflict* (dates, conflicting pages) rather than a fix — these push verification_level to 'conflicting'.
const CONFLICT_ISSUES = new Set(['Eiffel dates', 'Aalto dates', 'ENS dates', 'MBZUAI Computational Biology', 'Rice competition mixed year labels', 'Stanford AI+HEALTH 2026'])

function matchesKeywords(title, orGroups) {
  const t = title.toLowerCase()
  const hasWord = (k) => new RegExp(`\\b${k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`).test(t)
  return orGroups.some((andGroup) => andGroup.every(hasWord))
}

async function main() {
  // Opportunities sheet has no Institution column of its own (the title is
  // the program/org name). University details carries a real Institution
  // for the rows it links to one specific opportunity — prefer that;
  // everywhere else, fall back to the title itself (duplicated but never
  // fabricated) rather than guessing an org name out of free text.
  const instByExtId = new Map()
  for (const row of data.university_details) {
    const ids = splitList(row['Linked master IDs'])
    if (ids.length === 1 && row['Institution']) instByExtId.set(ids[0], row['Institution'])
  }

  const { data: existing, error: exErr } = await sb.from('opportunities').select('id, title, external_id')
  if (exErr) throw new Error(exErr.message)
  const existingByNorm = new Map(existing.filter((o) => !o.external_id).map((o) => [norm(o.title), o]))
  const existingByExternalId = new Map(existing.filter((o) => o.external_id).map((o) => [o.external_id, o]))

  const results = { inserted: 0, updatedExisting: 0, skippedAlreadyImported: 0, conflicts: [], aiPolicyRows: [], correctionsApplied: [], correctionsUnmatched: [] }

  const idToRowId = new Map() // external_id (OPP-...) -> our opportunities.id, for enrichment merge pass

  for (const row of data.opportunities) {
    const extId = row['ID']
    if (!extId) continue

    if (existingByExternalId.has(extId)) {
      idToRowId.set(extId, existingByExternalId.get(extId).id)
      results.skippedAlreadyImported++
      continue
    }

    const title = row['Opportunity']
    const deadline = toDate(row['Deadline'])
    const opens = toDate(row['Start date'])
    const { track, category } = mapTrackCategory(row['Type'], row['Level'])
    const status = mapStatus(row['Status'], deadline, opens)

    let verification_level = 'unverified'
    const conflictNotes = []
    if (row['Status'] === 'deadline_conflict') { verification_level = 'conflicting'; conflictNotes.push('Source file status: deadline_conflict') }
    if (row['Deadline basis'] === 'official_date_with_conflict') { verification_level = 'conflicting'; conflictNotes.push(`Source conflict: ${row['Notes / conflicts'] ?? 'see source'}`) }
    const isGtc = /nvidia gtc/i.test(title ?? '')
    if (isGtc) {
      verification_level = 'conflicting'
      conflictNotes.push('DATE CONFLICT (flagged on import): this file says the event runs 14-18 March 2027 (confirmed in both the Opportunities and Events sheets). Earlier research (not in this database) said 15-18 March 2027. Unresolved — confirm against the official NVIDIA GTC page before relying on either.')
    }

    const matched = existingByNorm.get(norm(title))

    const basePayload = {
      external_id: extId,
      title,
      track,
      category,
      integrated_phd_fast_track: false,
      institution: instByExtId.get(extId) ?? title, // see instByExtId note above — title fallback when no 1:1 University details link exists
      country: row['Country / scope'] || null,
      region: row['Region'] || null,
      field_tags: splitList(row['Fields']),
      funding: buildFunding(row),
      degree_levels_accepted: mapDegreeLevels(row['Level']),
      eligibility_rules: [], // not auto-classified — see commit message
      requirements: splitList(row['Requirements captured']).map((label) => ({ type: 'other', label, satisfied: false })),
      opens: opens || undefined,
      deadline: deadline || undefined,
      rolling: row['Status'] === 'rolling',
      status,
      tier: 'T3',
      apply_url: (row['Official source'] || '').split(';')[0].trim() || null,
      source_url: (row['Official source'] || '').split(';')[0].trim() || '',
      source_type: 'manual',
      verification_level,
      scam_risk: false,
      origin: 'manual',
      source_assessment: [conflictNotes.join('\n\n'), buildSourceAssessment(row)].filter(Boolean).join('\n\n') || null,
      ai_writing_policy: row['AI writing policy'] || null,
    }

    if (!basePayload.source_url) { console.warn(`Skipping "${title}" (${extId}) — no official source URL, can't satisfy source_url NOT NULL without fabricating one.`); continue }

    if (matched) {
      // Dedupe against an existing pre-import row: enrich it, don't duplicate it.
      const { error } = await sb.from('opportunities').update({
        external_id: extId,
        source_assessment: basePayload.source_assessment,
        ai_writing_policy: basePayload.ai_writing_policy,
        verification_level: verification_level !== 'unverified' ? verification_level : undefined,
      }).eq('id', matched.id)
      if (error) console.error(`Update failed for existing match "${title}":`, error.message)
      idToRowId.set(extId, matched.id)
      results.updatedExisting++
    } else {
      const { data: inserted, error } = await sb.from('opportunities').insert(basePayload).select('id').single()
      if (error) { console.error(`Insert failed for "${title}" (${extId}):`, error.message); continue }
      idToRowId.set(extId, inserted.id)
      results.inserted++
    }

    if (conflictNotes.length) results.conflicts.push({ title, extId, notes: conflictNotes })
    if (basePayload.ai_writing_policy && basePayload.ai_writing_policy !== 'not_checked') results.aiPolicyRows.push({ title, policy: basePayload.ai_writing_policy })
  }

  // ---- Enrichment merge pass ----
  async function appendAssessment(oppId, block) {
    const { data: row } = await sb.from('opportunities').select('source_assessment').eq('id', oppId).single()
    const next = [row?.source_assessment, block].filter(Boolean).join('\n\n')
    await sb.from('opportunities').update({ source_assessment: next }).eq('id', oppId)
  }

  for (const row of data.texas_focus) {
    const oppId = idToRowId.get(row['Stable ID'])
    if (!oppId) continue
    const block = `[Texas focus — ${row['City'] ?? ''}] Profile condition: ${row['Profile condition'] ?? '—'}. Next action: ${row['Next action'] ?? '—'}`
    await appendAssessment(oppId, block)
  }
  for (const row of data.university_details) {
    for (const id of splitList(row['Linked master IDs'])) {
      const oppId = idToRowId.get(id)
      if (!oppId) continue
      const block = `[University details — ${row['Institution'] ?? ''}] Program/route: ${row['Program / route'] ?? '—'}. Funding detail: ${row['Funding detail'] ?? '—'}. Funding conclusion: ${row['Funding conclusion'] ?? '—'}. Preparation needed: ${row['Preparation needed'] ?? '—'}. Next action: ${row['Next action'] ?? '—'}`
      await appendAssessment(oppId, block)
    }
  }
  for (const row of data.employer_targets) {
    const oppId = idToRowId.get(row['Master ID'])
    if (!oppId) continue
    const block = `[Employer target] Role/track: ${row['Role / track'] ?? '—'}. CV connection: ${row['CV connection'] ?? '—'}. Skill/experience gaps: ${row['Skill or experience gaps'] ?? '—'}. Sponsorship evidence: ${row['Sponsorship evidence'] ?? '—'}. Next action: ${row['Next action'] ?? '—'}`
    await appendAssessment(oppId, block)
  }
  for (const row of data.events) {
    const oppId = idToRowId.get(row['Master ID'])
    if (!oppId) continue
    const block = `[Event detail] ${row['Starts'] ?? '?'} to ${row['Ends'] ?? '?'}, ${row['Format'] ?? ''}. Fee: ${row['Registration cost detail'] ?? '—'}. Travel/scholarship support: ${row['Travel / scholarship support'] ?? '—'}. Attendance requirements: ${row['Attendance requirements'] ?? '—'}`
    await appendAssessment(oppId, block)
  }

  // ---- Corrections pass ----
  for (const row of data.corrections) {
    const issue = row['Issue']
    const text = `CORRECTION — ${issue}: ${row['Correction / research finding']} (source: ${row['Source']})`
    if (GENERAL_CORRECTIONS.has(issue)) { results.correctionsUnmatched.push(issue); continue }
    const keywords = CORRECTION_KEYWORDS[issue]
    if (!keywords) { results.correctionsUnmatched.push(issue); continue }

    const { data: candidates } = await sb.from('opportunities').select('id, title, funding, verification_level').not('external_id', 'is', null)
    const matches = (candidates ?? []).filter((o) => matchesKeywords(o.title, keywords))
    if (matches.length === 0) { results.correctionsUnmatched.push(issue); continue }

    for (const m of matches) {
      const patch = { verified_correction: text }
      if (CONFLICT_ISSUES.has(issue)) patch.verification_level = 'conflicting'
      if (issue === 'ISTernship') patch.status = 'paused'
      if (issue === 'Humboldt rolling claim') { patch.status = 'not_yet_open'; patch.opens = '2026-11-15'; patch.rolling = false }
      const { error } = await sb.from('opportunities').update(patch).eq('id', m.id)
      if (error) { console.error(`Correction apply failed for "${m.title}":`, error.message); continue }
      results.correctionsApplied.push({ issue, title: m.title })
    }
  }

  console.log(JSON.stringify(results, null, 2))
}

main().catch((err) => { console.error(err); process.exit(1) })
