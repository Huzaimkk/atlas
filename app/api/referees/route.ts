import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import type { RefereeStatus, RefereeStatusEvent } from '@/types/atlas'

export const dynamic = 'force-dynamic'

/**
 * POST { id, status } — updates one referee's status, appending to
 * status_history and logging to command_log, same pattern as
 * app/api/applications/route.ts. The headline counter only cares about
 * status === 'letter_submitted' ("letters secured"); every other status is
 * progress toward that, not the thing itself.
 */
export async function POST(req: Request) {
  const body = (await req.json()) as { id?: string; status?: RefereeStatus }
  if (!body.id || !body.status) return NextResponse.json({ error: 'id and status are required' }, { status: 400 })

  const { data: existing } = await supabaseAdmin.from('referees').select('*').eq('id', body.id).maybeSingle()
  if (!existing) return NextResponse.json({ error: `No referee with id ${body.id}` }, { status: 404 })

  if (body.status === existing.status) return NextResponse.json({ referee: existing })

  const now = new Date().toISOString()
  const history: RefereeStatusEvent[] = existing.status_history ?? []
  const status_history = [...history, { status: body.status, at: now }]

  const { data: referee, error } = await supabaseAdmin
    .from('referees')
    .update({ status: body.status, status_changed_at: now, status_history, updated_at: now })
    .eq('id', body.id)
    .select('*')
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await supabaseAdmin.from('command_log').insert({
    prompt: `Referees: ${existing.name} → ${body.status}`,
    actions: [{ tool: 'update_referee_status', input: { id: body.id, status: body.status }, output: { referee_id: referee.id } }],
    status: 'confirmed',
    confirmed_at: now,
  })

  return NextResponse.json({ referee })
}
