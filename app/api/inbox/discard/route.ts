import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const leadId = String(body.leadId ?? '')
  if (!leadId) return NextResponse.json({ error: 'Missing leadId' }, { status: 400 })

  const { data: lead } = await supabaseAdmin.from('inbox_leads').select('confidence').eq('id', leadId).maybeSingle()
  if (lead?.confidence === 'resolved') return NextResponse.json({ error: 'Already saved — nothing to discard' }, { status: 409 })

  const { error } = await supabaseAdmin.from('inbox_leads').delete().eq('id', leadId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
