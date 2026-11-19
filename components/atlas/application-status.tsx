'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { Application, ApplicationStatus } from '@/types/atlas'
import { APPLICATION_STATUS_LABELS, APPLICATION_STATUS_ORDER } from '@/lib/atlas-format'
import { useReadOnly } from '@/components/atlas/read-only'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

/**
 * One status control used everywhere an opportunity is opened. Every
 * change goes through POST /api/applications, which appends a dated
 * entry to status_history and writes a command_log row; the server is
 * the source of truth, so the page refreshes from it afterwards.
 */
export function ApplicationStatusControl({ opportunityId, application }: { opportunityId: string; application?: Application | null }) {
  const router = useRouter()
  const readOnly = useReadOnly()
  const [, startTransition] = useTransition()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const status: ApplicationStatus = application?.status ?? 'not_started'

  async function change(next: ApplicationStatus) {
    setPending(true)
    setError(null)
    try {
      const res = await fetch('/api/applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ opportunity_id: opportunityId, status: next }),
      })
      const data = await res.json()
      if (!res.ok) setError(data.error ?? 'Could not save the status.')
      else if (data.logged === false) setError('Saved, but the change could not be written to the activity log.')
      startTransition(() => router.refresh())
    } catch {
      setError('Could not reach the server. The status was not changed.')
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-3">
        <Select value={status} onValueChange={(v) => change(v as ApplicationStatus)} disabled={readOnly || pending}>
          <SelectTrigger size="sm" className="h-8 w-40 text-xs" aria-label="Application status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {APPLICATION_STATUS_ORDER.map((s) => (
              <SelectItem key={s} value={s}>
                {APPLICATION_STATUS_LABELS[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="font-mono text-2xs text-faint-foreground">
          {pending
            ? 'Saving…'
            : application?.status_changed_at
              ? `since ${new Date(application.status_changed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
              : 'not tracked yet'}
        </span>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}
