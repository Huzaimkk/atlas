import { NextResponse } from 'next/server'
import { getSessionUserId } from '@/lib/auth-server'

// Real route, stubbed internals (spec §4.2 / P2 scope) — accepts the file
// and validates it, but does not parse it. Parse + the interview that
// turns a parse into a trustworthy profile is P3's job: "Parse produces a
// draft, never a profile" — a thin stub here would be worse than an
// honest "not yet" if it pretended to extract anything.
const MAX_BYTES = 15 * 1024 * 1024
const ACCEPTED_TYPES = new Set(['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'])

export async function POST(req: Request) {
  const userId = await getSessionUserId().catch(() => null)
  if (!userId) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })

  const form = await req.formData()
  const file = form.get('file')
  if (!(file instanceof File)) return NextResponse.json({ error: 'No file in the upload' }, { status: 400 })
  if (file.size > MAX_BYTES) return NextResponse.json({ error: 'File is larger than 15MB' }, { status: 400 })
  if (!ACCEPTED_TYPES.has(file.type)) return NextResponse.json({ error: 'Only PDF or .docx files are accepted' }, { status: 400 })

  return NextResponse.json({
    received: { name: file.name, size: file.size, type: file.type },
    status: 'queued',
    message: "Received — parsing isn't built yet. The intake interview that turns this into a real profile is coming in a future update.",
  })
}
