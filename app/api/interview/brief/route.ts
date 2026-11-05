import { NextResponse } from 'next/server'
import { getSessionUserId } from '@/lib/auth-server'

// Real route, placeholder internals (spec §4.2's interview stage, P3
// scope). The interview is what turns a CV parse into a profile a verdict
// can rely on — it needs the parser (also P3) feeding it before there is
// anything to ask about.
export async function POST() {
  const userId = await getSessionUserId().catch(() => null)
  if (!userId) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })

  return NextResponse.json({
    stub: true,
    message: "The interview arrives with CV parsing in a future update — it's what fills in what a CV can't say on its own.",
  })
}
