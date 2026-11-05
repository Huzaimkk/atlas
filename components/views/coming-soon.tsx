'use client'

import { useEffect, useState } from 'react'
import type { LucideIcon } from 'lucide-react'
import { EmptyState } from '@/components/atlas/empty-state'

/**
 * Shared shell for the three surfaces that are real routes with
 * placeholder internals (spec §8 / P2 scope): email crafter, intake
 * interview, network. Each calls its own real API route on mount and
 * shows whatever that route actually says, rather than a static message
 * baked into the component — so this stays honest if the route's answer
 * ever changes.
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
  const [note, setNote] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    fetch(endpoint, { method })
      .then((r) => r.json())
      .then((data) => {
        if (active) setNote(data.message ?? null)
      })
      .catch(() => {})
    return () => {
      active = false
    }
  }, [endpoint, method])

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-1 max-w-xl text-sm text-muted-foreground">{description}</p>
      </header>
      <EmptyState icon={icon} title="Not built yet" description={note ?? 'Checking…'} />
    </div>
  )
}
