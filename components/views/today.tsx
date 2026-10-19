'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { AlertTriangle, Clock, Hourglass, Target, ChevronDown, ChevronRight, Mail } from 'lucide-react'
import type { AggregatedGap, Application, GapClosure, MissedDeadline, Opportunity, Referee, RefereeStatus, Verdict } from '@/types/atlas'
import { APPLICATION_TERMINAL_STATUSES } from '@/types/atlas'
import { EmptyState } from '@/components/atlas/empty-state'
import { VerdictBadge } from '@/components/atlas/verdict-badge'
import { daysUntil, daysSince, formatDeadline } from '@/lib/atlas-format'
import { cn } from '@/lib/utils'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const DEADLINE_WINDOW_DAYS = 21
// "Haven't moved" — no status change in two weeks while actively in
// progress (not_started hasn't begun, and the three terminal states have
// nowhere left to go). Same two-week heuristic the rest of the app already
// uses for urgency (URGENT_DAYS in app-shell, urgencyBand in atlas-format).
const OVERDUE_THRESHOLD_DAYS = 14
// The open item in profile-snapshot-v5.md is "name the three" — 5
// candidates are on the roster, but the target slot count is fixed at 3
// regardless of how many candidates exist.
const REFEREE_TARGET = 3

const REFEREE_STATUS_LABELS: Record<RefereeStatus, string> = {
  not_contacted: 'Not contacted',
  contacted: 'Contacted',
  agreed: 'Agreed',
  declined: 'Declined',
  letter_submitted: 'Letter submitted',
}

function monthStart(): Date {
  const d = new Date()
  d.setDate(1)
  d.setHours(0, 0, 0, 0)
  return d
}

/** Stat tile — headline number, label, optional click-to-expand detail. */
function CounterTile({
  icon: Icon,
  label,
  value,
  tone,
  expandable,
  expanded,
  onToggle,
  children,
}: {
  icon: React.ElementType
  label: string
  value: string
  tone?: 'late'
  expandable?: boolean
  expanded?: boolean
  onToggle?: () => void
  children?: React.ReactNode
}) {
  return (
    <div className="rounded-lg border border-border p-4">
      <button
        type="button"
        onClick={expandable ? onToggle : undefined}
        className={cn('flex w-full items-start justify-between gap-2 text-left', expandable && 'cursor-pointer')}
      >
        <div className="space-y-1">
          <p className={cn('font-mono text-2xl font-semibold tabular-nums', tone === 'late' ? 'text-verdict-late' : 'text-foreground')}>
            {value}
          </p>
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Icon className="size-3.5 shrink-0" strokeWidth={1.75} />
            {label}
          </p>
        </div>
        {expandable &&
          (expanded ? (
            <ChevronDown className="size-4 shrink-0 text-muted-foreground" strokeWidth={1.75} />
          ) : (
            <ChevronRight className="size-4 shrink-0 text-muted-foreground" strokeWidth={1.75} />
          ))}
      </button>
      {expandable && expanded && <div className="mt-3 border-t border-border pt-3">{children}</div>}
    </div>
  )
}

/**
 * Today — replaces Home as the default view. Permanent counters (item 3)
 * sit above the four accountability blocks (item 1) — the counters never
 * reset and are never hidden, independent of whether the blocks below have
 * anything in them right now.
 */
export function TodayView({
  opportunities,
  verdicts,
  gaps,
  applications,
  gapClosures,
  referees,
  missedDeadlines,
}: {
  opportunities: Opportunity[]
  verdicts: Verdict[]
  gaps: AggregatedGap[]
  applications: Application[]
  gapClosures: GapClosure[]
  referees: Referee[]
  missedDeadlines: MissedDeadline[]
}) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [expandedCounter, setExpandedCounter] = useState<'missed' | 'gaps' | 'referees' | null>(null)
  const [pendingReferee, setPendingReferee] = useState<string | null>(null)

  const oppById = new Map(opportunities.map((o) => [o.id, o]))
  const verdictByOpp = new Map(verdicts.map((v) => [v.opportunity_id, v]))

  const deadlinesSoon = opportunities
    .map((opp) => ({ opp, verdict: verdictByOpp.get(opp.id), days: daysUntil(opp.deadline) }))
    .filter(({ verdict, days }) => {
      if (!verdict || !['READY', 'GAP', 'LATE_WINDOW'].includes(verdict.type)) return false
      return days !== null && days >= 0 && days <= DEADLINE_WINDOW_DAYS
    })
    .sort((a, b) => (a.days ?? 0) - (b.days ?? 0))

  const overdueCommitments = applications
    .filter((a) => a.status !== 'not_started' && !APPLICATION_TERMINAL_STATUSES.has(a.status))
    .map((a) => ({ app: a, opp: oppById.get(a.opportunity_id), staleDays: daysSince(a.status_changed_at) }))
    .filter((r): r is typeof r & { opp: Opportunity } => !!r.opp && (r.staleDays ?? 0) >= OVERDUE_THRESHOLD_DAYS)
    .sort((a, b) => (b.staleDays ?? 0) - (a.staleDays ?? 0))

  const agingReady = opportunities
    .map((opp) => ({ opp, verdict: verdictByOpp.get(opp.id) }))
    .filter((r): r is { opp: Opportunity; verdict: Verdict } => r.verdict?.type === 'READY' && !!r.verdict.ready_since)
    .map((r) => ({ ...r, ageDays: daysSince(r.verdict.ready_since) ?? 0, daysLeft: daysUntil(r.opp.deadline) }))
    .sort((a, b) => b.ageDays - a.ageDays)

  const topGaps = [...gaps].sort((a, b) => b.unblock_count - a.unblock_count).slice(0, 3)

  const nothingAtAll = deadlinesSoon.length === 0 && overdueCommitments.length === 0 && agingReady.length === 0 && topGaps.length === 0

  // Counters
  const monthCutoff = useMemo(() => monthStart().toISOString(), [])
  const appsSubmittedThisMonth = applications.reduce(
    (count, a) => count + a.status_history.filter((e) => e.status === 'submitted' && e.at >= monthCutoff).length,
    0
  )
  const gapsClosedSatisfied = gapClosures.filter((c) => c.cause === 'satisfied')
  const gapsClosedOther = gapClosures.filter((c) => c.cause !== 'satisfied')
  const lettersSecured = referees.filter((r) => r.status === 'letter_submitted').length

  async function changeRefereeStatus(id: string, status: RefereeStatus) {
    setPendingReferee(id)
    try {
      await fetch('/api/referees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status }),
      })
      startTransition(() => router.refresh())
    } finally {
      setPendingReferee(null)
    }
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Today</h1>
        <p className="mt-1 text-sm text-muted-foreground">What did you do about it — not what exists.</p>
      </header>

      {/* Permanent counters — never reset, never hidden, independent of the blocks below. */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <CounterTile
          icon={AlertTriangle}
          label="Deadlines passed while READY"
          value={String(missedDeadlines.length)}
          tone="late"
          expandable
          expanded={expandedCounter === 'missed'}
          onToggle={() => setExpandedCounter((c) => (c === 'missed' ? null : 'missed'))}
        >
          {missedDeadlines.length === 0 ? (
            <p className="text-xs text-faint-foreground">None on record.</p>
          ) : (
            <ul className="space-y-2">
              {missedDeadlines.map((m) => (
                <li key={m.opportunity_id} className="text-xs">
                  <p className="font-medium text-foreground">{m.title}</p>
                  <p className="text-muted-foreground">
                    {formatDeadline(m.deadline)}
                    {m.daysReady !== null ? ` · sat READY for ${m.daysReady}d before it expired` : ' · READY duration unknown (expired before tracking started)'}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </CounterTile>

        <CounterTile icon={Clock} label="Applications submitted this month" value={String(appsSubmittedThisMonth)} />

        <CounterTile
          icon={Target}
          label="Gaps closed this month"
          value={String(gapsClosedSatisfied.length)}
          expandable
          expanded={expandedCounter === 'gaps'}
          onToggle={() => setExpandedCounter((c) => (c === 'gaps' ? null : 'gaps'))}
        >
          <div className="space-y-3">
            <div>
              <p className="mb-1 text-2xs font-semibold uppercase tracking-wide text-muted-foreground">Satisfied</p>
              {gapsClosedSatisfied.length === 0 ? (
                <p className="text-xs text-faint-foreground">None this month.</p>
              ) : (
                <ul className="space-y-1">
                  {gapsClosedSatisfied.map((c) => (
                    <li key={c.id} className="text-xs text-foreground">
                      {c.label ?? c.gap_type} — {oppById.get(c.opportunity_id)?.title ?? c.opportunity_id}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            {gapsClosedOther.length > 0 && (
              <div>
                <p className="mb-1 text-2xs font-semibold uppercase tracking-wide text-muted-foreground">Not progress (didn&apos;t close, stopped mattering)</p>
                <ul className="space-y-1">
                  {gapsClosedOther.map((c) => (
                    <li key={c.id} className="text-xs text-muted-foreground">
                      {c.label ?? c.gap_type} — {oppById.get(c.opportunity_id)?.title ?? c.opportunity_id}
                      <span className="ml-1 rounded border border-border-strong px-1 py-0.5 font-mono text-2xs">{c.cause.replace('_', ' ')}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </CounterTile>

        <CounterTile
          icon={Mail}
          label="Letters secured"
          value={`${lettersSecured} of ${REFEREE_TARGET}`}
          expandable
          expanded={expandedCounter === 'referees'}
          onToggle={() => setExpandedCounter((c) => (c === 'referees' ? null : 'referees'))}
        >
          <ul className="space-y-2">
            {referees.map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-xs font-medium text-foreground">{r.name}</p>
                  {r.relationship && <p className="truncate text-2xs text-muted-foreground">{r.relationship}</p>}
                </div>
                <Select value={r.status} onValueChange={(v) => changeRefereeStatus(r.id, v as RefereeStatus)} disabled={pendingReferee === r.id}>
                  <SelectTrigger size="sm" className="h-7 w-36 shrink-0 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(REFEREE_STATUS_LABELS) as RefereeStatus[]).map((s) => (
                      <SelectItem key={s} value={s}>
                        {REFEREE_STATUS_LABELS[s]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </li>
            ))}
          </ul>
        </CounterTile>
      </div>

      {nothingAtAll ? (
        <EmptyState
          icon={Clock}
          title="Nothing demanding attention right now"
          description="No deadlines inside 21 days, no stalled commitments, no aging READY rows, and no outstanding gaps."
        />
      ) : (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <section className="space-y-2 rounded-lg border border-border p-4">
            <h2 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-foreground">
              <Clock className="size-3.5" strokeWidth={1.75} />
              Deadlines inside {DEADLINE_WINDOW_DAYS} days
              <span className="font-mono text-2xs text-muted-foreground">{deadlinesSoon.length}</span>
            </h2>
            {deadlinesSoon.length === 0 ? (
              <p className="text-xs text-faint-foreground">Nothing closing soon.</p>
            ) : (
              <ul className="divide-y divide-border">
                {deadlinesSoon.map(({ opp, verdict, days }) => (
                  <li key={opp.id} className="flex items-center justify-between gap-3 py-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">{opp.title}</p>
                      <p className="truncate text-xs text-muted-foreground">{opp.institution}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      {verdict && <VerdictBadge verdict={verdict.type} />}
                      <span className="w-14 text-right font-mono text-xs text-muted-foreground">
                        {days === 0 ? 'today' : `${days}d`}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="space-y-2 rounded-lg border border-border p-4">
            <h2 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-foreground">
              <AlertTriangle className="size-3.5 text-verdict-late" strokeWidth={1.75} />
              Overdue commitments
              <span className="font-mono text-2xs text-muted-foreground">{overdueCommitments.length}</span>
            </h2>
            {overdueCommitments.length === 0 ? (
              <p className="text-xs text-faint-foreground">Nothing marked started has gone stale.</p>
            ) : (
              <ul className="divide-y divide-border">
                {overdueCommitments.map(({ app, opp, staleDays }) => (
                  <li key={app.id} className="flex items-center justify-between gap-3 py-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">{opp.title}</p>
                      <p className="truncate text-xs text-muted-foreground">Status: {app.status.replace('_', ' ')}</p>
                    </div>
                    <span className="shrink-0 font-mono text-xs text-verdict-late">{staleDays}d unchanged</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="space-y-2 rounded-lg border border-border p-4 lg:col-span-2">
            <h2 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-foreground">
              <Hourglass className="size-3.5" strokeWidth={1.75} />
              Aging READY rows — actionable with nothing done
              <span className="font-mono text-2xs text-muted-foreground">{agingReady.length}</span>
            </h2>
            {agingReady.length === 0 ? (
              <p className="text-xs text-faint-foreground">No READY row has been sitting untouched.</p>
            ) : (
              <ul className="divide-y divide-border">
                {agingReady.map(({ opp, ageDays, daysLeft }) => (
                  <li key={opp.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                    <span className="min-w-0 truncate font-medium text-foreground">{opp.title}</span>
                    <span className="shrink-0 font-mono text-xs text-muted-foreground">
                      READY for {ageDays}d
                      {daysLeft !== null && (
                        <span className={cn(daysLeft <= 14 && 'text-verdict-late')}> · {daysLeft}d left</span>
                      )}
                      {' · no action taken'}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="space-y-2 rounded-lg border border-border p-4 lg:col-span-2">
            <h2 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-foreground">
              <Target className="size-3.5" strokeWidth={1.75} />
              This week&apos;s gaps — top 3 by unblock count
            </h2>
            {topGaps.length === 0 ? (
              <p className="text-xs text-faint-foreground">No outstanding gaps.</p>
            ) : (
              <ul className="divide-y divide-border">
                {topGaps.map((gap) => (
                  <li key={gap.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                    <span className="min-w-0 truncate font-medium text-foreground">{gap.label}</span>
                    <span className="shrink-0 font-mono text-xs text-muted-foreground">
                      unblocks {gap.unblock_count} · {gap.time_estimate} · {gap.cost_estimate}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
    </div>
  )
}
