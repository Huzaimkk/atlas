import { redirect } from 'next/navigation'
import { AppShell } from '@/components/atlas/app-shell'
import { fetchAtlasData } from '@/lib/fetch-atlas-data'
import { getSessionUserId } from '@/lib/auth-server'

export const dynamic = 'force-dynamic' // pool/verdicts change independently of any deploy

export default async function DashboardPage() {
  let userId: string
  try {
    userId = await getSessionUserId()
  } catch {
    redirect('/sign-in')
  }
  const data = await fetchAtlasData(userId)
  return <AppShell realData={data} />
}
