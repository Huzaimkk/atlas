import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { extractFromText, fetchRawText, findDedupeMatch, previewDiagnosis } from '@/lib/manual-ingest'
import type { Origin } from '@/types/atlas'

const URL_RE = /^https?:\/\/\S+$/i

export async function POST(req: NextRequest) {
  const body = await req.json()
  const raw = String(body.raw ?? '').trim()
  if (!raw) return NextResponse.json({ error: 'Nothing pasted' }, { status: 400 })

  const isUrl = URL_RE.test(raw)
  const sourceUrl = isUrl ? raw : null
  const origin: Origin = isUrl ? 'manual' : 'txt'

  let rawText: string
  if (isUrl) {
    try {
      rawText = await fetchRawText(raw)
    } catch (err) {
      const { data: lead } = await supabaseAdmin
        .from('inbox_leads')
        .insert({ origin, raw_excerpt: raw, extracted: {}, confidence: 'unverified', extraction_error: `Could not fetch that URL: ${String(err)}`, source_url: sourceUrl })
        .select('*')
        .single()
      return NextResponse.json({ leadId: lead?.id, error: `Could not fetch that URL: ${String(err)}` })
    }
  } else {
    rawText = raw
  }

  const { extracted, error } = await extractFromText(rawText, sourceUrl)
  if (error || !extracted) {
    const { data: lead } = await supabaseAdmin
      .from('inbox_leads')
      .insert({ origin, raw_excerpt: raw.slice(0, 2000), extracted: {}, confidence: 'unverified', extraction_error: error ?? 'Extraction failed', source_url: sourceUrl })
      .select('*')
      .single()
    return NextResponse.json({ leadId: lead?.id, error: error ?? 'Extraction failed' })
  }

  const dedupeMatchId = await findDedupeMatch(extracted.title ?? '', sourceUrl)
  const verdictPreview = await previewDiagnosis(extracted, sourceUrl)

  const { data: lead, error: insertErr } = await supabaseAdmin
    .from('inbox_leads')
    .insert({
      origin,
      raw_excerpt: raw.slice(0, 2000),
      extracted,
      confidence: dedupeMatchId ? 'conflicting' : 'resolving',
      dedupe_match_id: dedupeMatchId,
      source_url: sourceUrl,
      verdict_preview: verdictPreview,
    })
    .select('*')
    .single()
  if (insertErr) return NextResponse.json({ error: insertErr.message }, { status: 500 })

  return NextResponse.json({ leadId: lead.id, extracted, verdictPreview, dedupeMatchId, sourceUrl })
}
