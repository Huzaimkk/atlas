import { redirect } from 'next/navigation'
import { AppShell } from '@/components/atlas/app-shell'
import { fetchAtlasData } from '@/lib/fetch-atlas-data'
import { getSessionUser } from '@/lib/auth-server'

export const dynamic = 'force-dynamic' // pool/verdicts change independently of any deploy

export default async function DashboardPage() {
  let user: { id: string; email: string | null }
  try {
    user = await getSessionUser()
  } catch {
    redirect('/sign-in')
  }
  const data = await fetchAtlasData(user.id)
  return <AppShell realData={data} email={user.email} />
}
