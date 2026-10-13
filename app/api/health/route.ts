import { NextResponse } from 'next/server'
import { checkSupabaseHealth } from '@/lib/health-check'

export async function GET() {
  const supabase = await checkSupabaseHealth()
  if (!supabase.ok) {
    return NextResponse.json({ ok: false, supabase }, { status: 503 })
  }
  return NextResponse.json({ ok: true, supabase })
}
