import { Suspense } from 'react'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { AppShell } from '@/components/atlas/app-shell'
import { DEMO_ENABLED, demoData } from '@/data/mock/demo'

export const metadata: Metadata = { title: 'Demo', robots: { index: false } }
export const dynamic = 'force-dynamic' // fixture dates are rebased onto today's date per request

// The whole product on sample data, read-only, no account. Off in
// production unless ATLAS_PUBLIC_DEMO=1 — see data/mock/demo.ts for why.
export default function DemoPage() {
  if (!DEMO_ENABLED) notFound()
  return (
    <Suspense fallback={null}>
      <AppShell data={demoData()} demo />
    </Suspense>
  )
}
