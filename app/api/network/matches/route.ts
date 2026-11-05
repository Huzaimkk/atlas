import { NextResponse } from 'next/server'
import { getSessionUserId } from '@/lib/auth-server'

// Real route, placeholder internals (spec §4.6 / P6 scope). Cohort
// visibility is opt-in and needs more than one real user with overlapping
// profiles to mean anything — this returns an honest empty result rather
// than fabricating a cohort.
export async function GET() {
  const userId = await getSessionUserId().catch(() => null)
  if (!userId) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })

  return NextResponse.json({
    stub: true,
    matches: [],
    message: 'Cohort visibility is opt-in and arrives in a future update, once there are enough users to make a match mean anything.',
  })
}
