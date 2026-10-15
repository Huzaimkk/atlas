import { NextResponse } from 'next/server'
import { checkSupabaseHealth } from '@/lib/health-check'
import { diagnosePool } from '@/lib/diagnostic-engine'

// Re-runs diagnoseOne() against every pool row for the current profile
// snapshot (no new snapshot version, no profile edit — just a refresh).
// Needed whenever the diagnostic engine's own logic changes (a gap-label
// rewrite, a fit-score fix) and the already-stored verdicts/gaps need to
// reflect it, not just opportunities inserted from here on.
export async function POST() {
  const health = await checkSupabaseHealth()
  if (!health.ok) {
    return NextResponse.json({ ok: false, error: `Supabase unreachable, aborting re-diagnosis: ${health.error}` }, { status: 503 })
  }

  try {
    const verdicts = await diagnosePool()
    return NextResponse.json({ ok: true, count: verdicts.length })
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 })
  }
}
