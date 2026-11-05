import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSessionUserId } from '@/lib/auth-server'

/**
 * Item 4 — decline an opportunity. Sets the application to 'withdrawn' (an
 * application is created if one didn't exist yet) and records a
 * gap_closures row with cause 'opportunity_declined' for every gap
 * currently open on it, which is the one cause diagnostic-engine.ts's
 * classifyGapClosureCause never infers on its own — it's set here, by the
 * explicit user action, not detected from a diagnosis run. The row then
 * shows up in Archive via its application status, not its verdict.
 */
export async function POST(req: Request) {
  const userId = await getSessionUserId().catch(() => null)
  if (!userId) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })

  const body = (await req.json()) as { opportunity_id?: string }
  const opportunity_id = body.opportunity_id
  if (!opportunity_id) return NextResponse.json({ error: 'opportunity_id is required' }, { status: 400 })

  const now = new Date().toISOString()
  const { data: existing } = await supabaseAdmin.from('applications').select('*').eq('opportunity_id', opportunity_id).eq('user_id', userId).maybeSingle()

  const history = existing?.status_history ?? []
  const { data: application, error } = await supabaseAdmin
    .from('applications')
    .upsert(
      {
        user_id: userId,
        opportunity_id,
        status: 'withdrawn',
        status_changed_at: now,
        status_history: [...history, { status: 'withdrawn', at: now }],
        required_documents: existing?.required_documents ?? [],
        notes: existing?.notes ? `${existing.notes}\nDeclined.` : 'Declined.',
        updated_at: now,
      },
      { onConflict: 'user_id,opportunity_id' }
    )
    .select('*')
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const { data: openGaps } = await supabaseAdmin.from('gaps').select('type, label').eq('opportunity_id', opportunity_id).eq('user_id', userId)
  if (openGaps && openGaps.length > 0) {
    const closures = openGaps.map((g) => ({
      user_id: userId,
      opportunity_id,
      gap_type: g.type,
      label: g.label,
      cause: 'opportunity_declined' as const,
      closed_at: now,
    }))
    const { error: closureErr } = await supabaseAdmin.from('gap_closures').insert(closures)
    if (closureErr) console.error('[decline] gap_closures insert failed:', closureErr.message)
  }

  return NextResponse.json({ application })
}
