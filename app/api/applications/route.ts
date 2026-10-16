import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { seedRequiredDocuments } from '@/lib/application-documents'
import type { ApplicationStatus, ApplicationStatusEvent, Opportunity, ProfileSnapshot, RequiredDocument } from '@/types/atlas'

export const dynamic = 'force-dynamic'

/**
 * Applications are created lazily, on first write — not pre-seeded for all
 * 323 pool rows. POST body:
 *   { opportunity_id, status?, required_documents?, notes? }
 * A status change (including the implicit first one on row creation) is
 * appended to status_history and logged to command_log with a timestamp —
 * item 2's explicit ask, so every transition is independently auditable,
 * not just reflected in the row's current state.
 */
export async function POST(req: Request) {
  const body = (await req.json()) as {
    opportunity_id?: string
    status?: ApplicationStatus
    required_documents?: RequiredDocument[]
    notes?: string
  }
  const opportunity_id = body.opportunity_id
  if (!opportunity_id) return NextResponse.json({ error: 'opportunity_id is required' }, { status: 400 })

  const { data: existing } = await supabaseAdmin.from('applications').select('*').eq('opportunity_id', opportunity_id).maybeSingle()

  const now = new Date().toISOString()
  const statusChanged = !!body.status && body.status !== existing?.status

  let required_documents = body.required_documents ?? existing?.required_documents
  if (!required_documents) {
    const [{ data: opp }, { data: profile }] = await Promise.all([
      supabaseAdmin.from('opportunities').select('requirements').eq('id', opportunity_id).single(),
      supabaseAdmin.from('profile_snapshots').select('*').eq('is_current', true).maybeSingle(),
    ])
    required_documents = seedRequiredDocuments((opp?.requirements ?? []) as Opportunity['requirements'], (profile as ProfileSnapshot) ?? null)
  }

  const status: ApplicationStatus = body.status ?? existing?.status ?? 'not_started'
  const history: ApplicationStatusEvent[] = existing?.status_history ?? []
  const status_history = statusChanged || !existing ? [...history, { status, at: now }] : history

  const row = {
    opportunity_id,
    status,
    status_changed_at: statusChanged || !existing ? now : (existing?.status_changed_at ?? now),
    status_history,
    required_documents,
    notes: body.notes ?? existing?.notes ?? null,
    updated_at: now,
  }

  const { data: application, error } = await supabaseAdmin
    .from('applications')
    .upsert(row, { onConflict: 'opportunity_id' })
    .select('*')
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (statusChanged || !existing) {
    const { data: opp } = await supabaseAdmin.from('opportunities').select('title').eq('id', opportunity_id).maybeSingle()
    await supabaseAdmin.from('command_log').insert({
      prompt: `Applications: ${opp?.title ?? opportunity_id} → ${status}`,
      actions: [{ tool: 'update_application_status', input: { opportunity_id, status }, output: { application_id: application.id } }],
      status: 'confirmed',
      confirmed_at: now,
    })
  }

  return NextResponse.json({ application })
}
