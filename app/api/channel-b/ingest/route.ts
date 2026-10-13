import { NextResponse } from 'next/server'
import { checkSupabaseHealth } from '@/lib/health-check'
import { runChannelBIngest } from '@/lib/channel-b/ingest'

// Manual trigger today; becomes the Vercel Cron target for Channel B's
// weekly sweep once a schedule is wired in vercel.ts (spec §6b). Runs on
// demand via POST either way — a cron calling this is just a scheduled
// POST, not a separate code path.
export async function POST() {
  const health = await checkSupabaseHealth()
  if (!health.ok) {
    return NextResponse.json({ ok: false, error: `Supabase unreachable, aborting ingest: ${health.error}` }, { status: 503 })
  }

  try {
    const results = await runChannelBIngest()
    return NextResponse.json({ ok: true, results })
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 })
  }
}
