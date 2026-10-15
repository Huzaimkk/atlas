import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { diagnoseOpportunity } from '@/lib/diagnostic-engine'
import type { Opportunity } from '@/types/atlas'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const leadId = String(body.leadId ?? '')
  const sourceUrlOverride = body.sourceUrl ? String(body.sourceUrl).trim() : null
  if (!leadId) return NextResponse.json({ error: 'Missing leadId' }, { status: 400 })

  const { data: lead, error: leadErr } = await supabaseAdmin.from('inbox_leads').select('*').eq('id', leadId).single()
  if (leadErr || !lead) return NextResponse.json({ error: `Lead not found: ${leadErr?.message}` }, { status: 404 })
  if (lead.confidence === 'resolved') return NextResponse.json({ error: 'This lead was already saved' }, { status: 409 })
  if (lead.extraction_error) return NextResponse.json({ error: `Can't save — extraction failed: ${lead.extraction_error}` }, { status: 400 })

  const sourceUrl = lead.source_url ?? sourceUrlOverride
  if (!sourceUrl) {
    return NextResponse.json({ error: 'No source URL on file for this lead — provide one before saving (spec §4: source_url must be the primary source, never fabricated).' }, { status: 400 })
  }

  const extracted = lead.extracted as Partial<Opportunity>
  if (!extracted.title || !extracted.institution) {
    return NextResponse.json({ error: 'Extraction is missing a title or institution — cannot save an incomplete row.' }, { status: 400 })
  }

  const { data: row, error: insertErr } = await supabaseAdmin
    .from('opportunities')
    .insert({
      title: extracted.title,
      track: extracted.track ?? 'scholarship',
      category: extracted.category ?? 2,
      integrated_phd_fast_track: false,
      institution: extracted.institution,
      field_tags: extracted.field_tags ?? [],
      degree_levels_accepted: extracted.degree_levels_accepted ?? [],
      eligibility_rules: extracted.eligibility_rules ?? [],
      requirements: extracted.requirements ?? [],
      opens: extracted.opens,
      deadline: extracted.deadline,
      rolling: extracted.rolling ?? false,
      status: extracted.deadline && new Date(extracted.deadline) < new Date() ? 'expired' : extracted.rolling ? 'rolling' : 'open',
      tier: 'T3',
      apply_url: sourceUrl,
      source_url: sourceUrl,
      source_type: 'manual',
      verification_level: 'unverified',
      scam_risk: false,
      origin: lead.origin,
      funding: extracted.funding,
    })
    .select('*')
    .single()
  if (insertErr) return NextResponse.json({ error: insertErr.message }, { status: 500 })

  const verdict = await diagnoseOpportunity(row.id)

  await supabaseAdmin.from('inbox_leads').update({ confidence: 'resolved', dedupe_match_id: row.id, source_url: sourceUrl }).eq('id', leadId)

  return NextResponse.json({ ok: true, opportunity: row, verdict })
}
