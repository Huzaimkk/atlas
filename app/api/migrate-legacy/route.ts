import { NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { supabaseAdmin } from '@/lib/supabase'
import type { LegacyPayload } from '@/lib/migrate-legacy-storage'

// One-time migration off the pre-v2 localStorage trackers (spec §7:
// "Migrate existing localStorage state on first run rather than
// discarding it"). POST the payload collectLegacyStorage() produces.
//
// Nothing here is trusted as verified: every migrated opportunity gets
// verification_level 'conflicting' and migrated_legacy true, and a
// placeholder legacy://... source_url (opportunities.source_url is
// NOT NULL and legacy Kanban/deadline rows never had a real one) — the
// Pool view surfaces these for manual re-verification rather than
// letting them masquerade as checked rows.
//
// GRE practice sessions and the exam date are deliberately NOT written
// into profile_snapshots — v5 already models GRE as a pending item with
// no score yet (§4 requirement 3), and overwriting that with old
// diagnostic-test numbers would misrepresent it as an achievement. They
// come back in the response summary instead, so nothing is silently lost.

function computeStatus(deadline?: string): 'open' | 'expired' {
  if (!deadline) return 'open'
  return new Date(deadline + 'T00:00:00') < new Date() ? 'expired' : 'open'
}

function tierFromFitScore(fitScore: number): 'T1' | 'T2' | 'T3' {
  if (fitScore >= 8) return 'T1'
  if (fitScore >= 5) return 'T2'
  return 'T3'
}

// Migration 0010 replaced applications.stage (identified/preparing/
// submitted/interview/decision) with the explicit status funnel
// (not_started..offer/rejected/withdrawn). 'decision' (legacy: applied,
// awaiting an outcome) maps to 'submitted', not a fabricated 'interview' —
// the old data never recorded whether an interview actually happened.
const STAGE_MAP = {
  identified: 'not_started',
  emailed: 'researching',
  replied: 'drafting',
  applied: 'submitted',
  decision: 'submitted',
} as const

export async function POST(req: Request) {
  const payload: LegacyPayload = await req.json()
  const summary = {
    professors_migrated: 0,
    email_log_migrated: 0,
    deadlines_migrated: 0,
    gre_sessions_skipped: payload.greSessions.length,
    gre_exam_date_skipped: payload.greExamDate,
    errors: [] as string[],
  }

  const professorIdMap = new Map<string, string>() // legacy Professor.id -> new opportunities.id

  for (const p of payload.professors) {
    const newId = randomUUID()
    const { error } = await supabaseAdmin.from('opportunities').insert({
      id: newId,
      title: p.department ? `${p.department} — ${p.university}` : p.university,
      track: 'phd_funded',
      category: 4,
      institution: p.university,
      supervisor: { name: p.name, email: p.email },
      field_tags: p.research_focus ? [p.research_focus] : [],
      degree_levels_accepted: [],
      eligibility_rules: [],
      requirements: [],
      status: 'open',
      tier: tierFromFitScore(p.fit_score),
      source_url: `legacy://migrated/professors/${p.id}`,
      source_type: 'manual',
      verification_level: 'conflicting',
      origin: 'manual',
      migrated_legacy: true,
    })
    if (error) {
      summary.errors.push(`professor ${p.id}: ${error.message}`)
      continue
    }
    professorIdMap.set(p.id, newId)
    summary.professors_migrated++

    const { error: appError } = await supabaseAdmin.from('applications').insert({
      opportunity_id: newId,
      status: STAGE_MAP[p.stage],
      notes: p.notes ?? null,
      migrated_legacy: true,
    })
    if (appError) summary.errors.push(`application for professor ${p.id}: ${appError.message}`)
  }

  for (const e of payload.emailLog) {
    const { error } = await supabaseAdmin.from('outreach_log').insert({
      opportunity_id: professorIdMap.get(e.professor_id) ?? null,
      contact_name: e.professor_name,
      channel: 'email',
      subject: e.subject,
      body: e.body,
      sent_at: e.sent_at,
      status: e.status,
      migrated_legacy: true,
    })
    if (error) summary.errors.push(`email log ${e.id}: ${error.message}`)
    else summary.email_log_migrated++
  }

  for (const d of payload.deadlines) {
    const newId = randomUUID()
    const { error } = await supabaseAdmin.from('opportunities').insert({
      id: newId,
      title: `${d.program} — ${d.university}`,
      track: 'scholarship', // best-effort guess — Track has no generic "degree program" bucket; flagged conflicting for manual correction
      category: 2,
      institution: d.university,
      degree_levels_accepted: [],
      eligibility_rules: [],
      requirements: d.gre_required ? [{ type: 'gre', label: 'GRE', satisfied: false }] : [],
      deadline: d.deadline,
      status: computeStatus(d.deadline),
      tier: 'T2',
      source_url: `legacy://migrated/deadlines/${d.id}`,
      source_type: 'manual',
      verification_level: 'conflicting',
      origin: 'manual',
      migrated_legacy: true,
    })
    if (error) {
      summary.errors.push(`deadline ${d.id}: ${error.message}`)
      continue
    }
    summary.deadlines_migrated++

    const { error: appError } = await supabaseAdmin.from('applications').insert({
      opportunity_id: newId,
      status: d.applied ? 'submitted' : 'not_started',
      notes: d.notes || d.round ? `${d.round ?? ''} ${d.notes ?? ''}`.trim() : null,
      migrated_legacy: true,
    })
    if (appError) summary.errors.push(`application for deadline ${d.id}: ${appError.message}`)
  }

  return NextResponse.json(summary)
}
