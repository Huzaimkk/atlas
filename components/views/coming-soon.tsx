'use client'

import { useEffect, useState } from 'react'
import type { LucideIcon } from 'lucide-react'
import { EmptyState } from '@/components/atlas/empty-state'
import { PageHeader } from '@/components/atlas/page-header'
import { useReadOnly } from '@/components/atlas/read-only'

/**
 * Shared shell for the three surfaces that are real routes with
 * placeholder internals (spec §8 / P2 scope): email drafts, intake
 * interview, network. Each calls its own real API route on mount and
 * shows whatever that route actually says, rather than a static message
 * baked into the component — so this stays honest if the route's answer
 * ever changes. In the read-only demo there is no session to call the
 * route with, so it says so instead of waiting on a 401.
 */
export function ComingSoonView({
  icon,
  title,
  description,
  endpoint,
  method = 'POST',
}: {
  icon: LucideIcon
  title: string
  description: string
  endpoint: string
  method?: 'GET' | 'POST'
}) {
  const readOnly = useReadOnly()
  const [note, setNote] = useState<string | null>(null)

  useEffect(() => {
    if (readOnly) return
    let active = true
    fetch(endpoint, { method })
      .then((r) => r.json())
      .then((data) => {
        if (active) setNote(data.message ?? 'This will be switched on in a future update.')
      })
      .catch(() => {
        if (active) setNote('This will be switched on in a future update.')
      })
    return () => {
      active = false
    }
  }, [endpoint, method, readOnly])

  return (
    <div className="space-y-8">
      <PageHeader title={title} description={description} />
      <EmptyState
        icon={icon}
        title="Not available yet"
        description={readOnly ? 'This will be switched on in a future update.' : (note ?? 'Checking…')}
      />
    </div>
  )
}
