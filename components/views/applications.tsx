'use client'

import { Fragment, useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronDown, ChevronRight, ClipboardList } from 'lucide-react'
import type { Application, ApplicationStatus, Opportunity, ProfileSnapshot, RequiredDocument } from '@/types/atlas'
import { EmptyState } from '@/components/atlas/empty-state'
import { seedRequiredDocuments } from '@/lib/application-documents'
import { formatDeadline, APPLICATION_STATUS_LABELS, APPLICATION_STATUS_ORDER } from '@/lib/atlas-format'
import { cn } from '@/lib/utils'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

interface Row {
  opp: Opportunity
  application: Application | null
  status: ApplicationStatus
  status_changed_at: string | null
}

async function postApplication(body: Record<string, unknown>) {
  const res = await fetch('/api/applications', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error((await res.json()).error ?? 'Request failed')
  return res.json()
}

export function ApplicationsView({
  opportunities,
  applications,
  profile,
}: {
  opportunities: Opportunity[]
  applications: Application[]
  profile: ProfileSnapshot | null
}) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [statusFilter, setStatusFilter] = useState<ApplicationStatus | 'all'>('all')
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [pending, setPending] = useState<Set<string>>(new Set())

  const appByOpp = useMemo(() => new Map(applications.map((a) => [a.opportunity_id, a])), [applications])

  const rows: Row[] = useMemo(
    () =>
      opportunities.map((opp) => {
        const application = appByOpp.get(opp.id) ?? null
        return { opp, application, status: application?.status ?? 'not_started', status_changed_at: application?.status_changed_at ?? null }
      }),
    [opportunities, appByOpp]
  )

  const filtered = useMemo(() => {
    const r = statusFilter === 'all' ? rows : rows.filter((row) => row.status === statusFilter)
    return [...r].sort((a, b) => {
      if (!a.opp.deadline) return 1
      if (!b.opp.deadline) return -1
      return a.opp.deadline.localeCompare(b.opp.deadline)
    })
  }, [rows, statusFilter])

  function toggleExpanded(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function changeStatus(row: Row, status: ApplicationStatus) {
    setPending((p) => new Set(p).add(row.opp.id))
    try {
      await postApplication({ opportunity_id: row.opp.id, status })
      startTransition(() => router.refresh())
    } finally {
      setPending((p) => {
        const next = new Set(p)
        next.delete(row.opp.id)
        return next
      })
    }
  }

  async function toggleDocument(row: Row, docs: RequiredDocument[], doc: RequiredDocument) {
    const next = docs.map((d) => (d.label === doc.label ? { ...d, satisfied: !d.satisfied } : d))
    setPending((p) => new Set(p).add(row.opp.id))
    try {
      await postApplication({ opportunity_id: row.opp.id, required_documents: next })
      startTransition(() => router.refresh())
    } finally {
      setPending((p) => {
        const n = new Set(p)
        n.delete(row.opp.id)
        return n
      })
    }
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Applications</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Every row's own funnel — not_started → researching → drafting → submitted → interview → offer / rejected /
          withdrawn, each change dated and logged.
        </p>
      </header>

      <div className="flex items-center gap-2">
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as ApplicationStatus | 'all')}>
          <SelectTrigger size="sm" className="h-8 w-44 text-xs">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {APPLICATION_STATUS_ORDER.map((s) => (
              <SelectItem key={s} value={s}>
                {APPLICATION_STATUS_LABELS[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="font-mono text-2xs text-muted-foreground">{filtered.length} of {rows.length}</span>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={ClipboardList} title="No rows match this filter" description="Clear the status filter to see every row in the pool." />
      ) : (
        <div className="overflow-hidden rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8" />
                <TableHead>Title</TableHead>
                <TableHead>Deadline</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Since</TableHead>
                <TableHead>Documents</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((row) => {
                const isOpen = expanded.has(row.opp.id)
                // Not yet persisted (status still 'not_started', never touched) —
                // compute the checklist live from the same seeding logic the API
                // uses on first write, so it's visible before any row exists.
                const docs = row.application?.required_documents ?? seedRequiredDocuments(row.opp.requirements, profile)
                const satisfiedCount = docs.filter((d) => d.satisfied).length
                const isPending = pending.has(row.opp.id)
                return (
                  <Fragment key={row.opp.id}>
                    <TableRow>
                      <TableCell className="w-8 cursor-pointer" onClick={() => toggleExpanded(row.opp.id)}>
                        {docs.length > 0 &&
                          (isOpen ? (
                            <ChevronDown className="size-3.5 text-muted-foreground" strokeWidth={1.75} />
                          ) : (
                            <ChevronRight className="size-3.5 text-muted-foreground" strokeWidth={1.75} />
                          ))}
                      </TableCell>
                      <TableCell className="font-medium text-foreground">
                        {row.opp.title}
                        <p className="text-xs font-normal text-muted-foreground">{row.opp.institution}</p>
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">{formatDeadline(row.opp.deadline)}</TableCell>
                      <TableCell>
                        <Select
                          value={row.status}
                          onValueChange={(v) => changeStatus(row, v as ApplicationStatus)}
                          disabled={isPending}
                        >
                          <SelectTrigger size="sm" className="h-7 w-36 text-xs">
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
                      </TableCell>
                      <TableCell className="font-mono text-2xs text-muted-foreground">
                        {row.status_changed_at ? formatDeadline(row.status_changed_at.slice(0, 10)) : '—'}
                      </TableCell>
                      <TableCell className="font-mono text-2xs text-muted-foreground">
                        {docs.length > 0 ? `${satisfiedCount}/${docs.length}` : '—'}
                      </TableCell>
                    </TableRow>
                    {isOpen && docs.length > 0 && (
                      <TableRow key={`${row.opp.id}-docs`} className="bg-surface-2/40">
                        <TableCell />
                        <TableCell colSpan={5}>
                          <ul className="space-y-1.5 py-1">
                            {docs.map((doc) => (
                              <li key={doc.label} className="flex items-center gap-2 text-xs">
                                <input
                                  type="checkbox"
                                  checked={doc.satisfied}
                                  disabled={isPending}
                                  onChange={() => toggleDocument(row, docs, doc)}
                                  className="size-3.5 accent-primary"
                                />
                                <span className={cn(doc.satisfied ? 'text-foreground' : 'text-muted-foreground')}>{doc.label}</span>
                                {doc.inventory_status && (
                                  <span className="rounded border border-border-strong px-1 py-0.5 font-mono text-2xs text-faint-foreground">
                                    profile: {doc.inventory_status}
                                  </span>
                                )}
                              </li>
                            ))}
                          </ul>
                        </TableCell>
                      </TableRow>
                    )}
                  </Fragment>
                )
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
