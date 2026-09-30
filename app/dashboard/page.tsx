import { AppShell } from '@/components/atlas/app-shell'
import { fetchAtlasData } from '@/lib/fetch-atlas-data'

export const dynamic = 'force-dynamic' // pool/verdicts change independently of any deploy

export default async function DashboardPage() {
  const data = await fetchAtlasData()
  return <AppShell realData={data} />
}
