import { NextResponse } from 'next/server'
import { getSessionUserId } from '@/lib/auth-server'

// Real route, placeholder internals (spec §4.4 / P2 scope). The email
// crafter needs a working LLM key to draft anything real — CometAPI quota
// has been at zero for weeks (spec: "blocked on credentials, not code").
// This route exists so the UI has something real to call now, and so P4
// only has to fill in the body, not invent the wiring.
export async function POST() {
  const userId = await getSessionUserId().catch(() => null)
  if (!userId) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })

  return NextResponse.json({
    stub: true,
    message: 'Drafting outreach needs a working LLM key, which is blocked on credentials right now, not on this route.',
  })
}
