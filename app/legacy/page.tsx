import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getSessionUser } from '@/lib/auth-server'
import LegacyApp from '@/components/legacy/legacy-app'

export const metadata: Metadata = { title: 'Legacy toolkit', robots: { index: false } }
export const dynamic = 'force-dynamic'

// The v1 toolkit used to be the public root page. It hardcodes one
// person's profile, so it now sits behind the same session check as the
// dashboard instead of being the first thing an anonymous visitor sees.
export default async function LegacyPage() {
  try {
    await getSessionUser()
  } catch {
    redirect('/sign-in')
  }
  return <LegacyApp />
}
