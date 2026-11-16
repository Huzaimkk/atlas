'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { AnimatePresence, motion } from 'motion/react'
import { AlertTriangle, Clock, Hourglass, Target } from 'lucide-react'
import type { AggregatedGap, Application, GapClosure, MissedDeadline, Opportunity, Referee, RefereeStatus, Verdict } from '@/types/atlas'
import { APPLICATION_TERMINAL_STATUSES } from '@/types/atlas'
import { EmptyState } from '@/components/atlas/empty-state'
import { PageHeader, SectionTitle } from '@/components/atlas/page-header'
import { CountUp } from '@/components/atlas/count-up'
import { useReadOnly } from '@/components/atlas/read-only'
import { VerdictBadge } from '@/components/atlas/verdict-badge'
import { daysUntil, daysSince, formatDeadline, APPLICATION_STATUS_LABELS } from '@/lib/atlas-format'
import { disclose, transition } from '@/lib/motion'
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

type CounterId = 'missed' | 'submitted' | 'gaps' | 'referees'

function monthStart(): Date {
  const d = new Date()
  d.setDate(1)
  d.setHours(0, 0, 0, 0)
  return d
}

/**
 * One cell of the counter strip. The four counters are a single ledger
 * line, not four cards: they share one border and one baseline, and the
 * detail for whichever is selected opens as one panel underneath.
 */
function Counter({
  label,
  selected,
  onSelect,
  tone,
  children,
}: {
  label: string
  selected?: boolean
  onSelect?: () => void
  tone?: 'late'
  children: React.ReactNode
}) {
  const body = (
    <>
      <p className={cn('font-mono text-2xl tabular-nums', tone === 'late' ? 'text-verdict-late' : 'text-foreground')}>{children}</p>
      <p className="mt-1 text-xs text-muted-foreground">{label}</p>
      {selected && (
        <motion.span layoutId="today-counter-marker" transition={transition.layout} className="absolute inset-x-0 bottom-0 h-px bg-foreground" />
      )}
    </>
  )
  const cell = 'relative bg-surface px-5 py-4 text-left'
  return onSelect ? (
    <button type="button" onClick={onSelect} aria-expanded={selected} className={cn(cell, 'transition-colors duration-150 hover:bg-surface-2')}>
      {body}
    </button>
  ) : (
    <div className={cell}>{body}</div>
  )
}

function Panel({ className, children }: { className?: string; children: React.ReactNode }) {
  return <section className={cn('space-y-3 rounded-lg border border-border bg-surface p-5', className)}>{children}</section>
}

function Quiet({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-faint-foreground">{children}</p>
}

/**
 * Today — the default view. Permanent counters sit above the four
 * accountability blocks: the counters never reset and are never hidden,
 * independent of whether the blocks below have anything in them.
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
  const readOnly = useReadOnly()
  const [, startTransition] = useTransition()
  const [openCounter, setOpenCounter] = useState<CounterId | null>(null)
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
  const maxUnblock = topGaps[0]?.unblock_count ?? 1

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

  const toggle = (id: CounterId) => setOpenCounter((c) => (c === id ? null : id))

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
    <div className="space-y-8">
      <PageHeader title="Today" description="What needs you now, and what you have done about it so far.">
        <p className="font-mono text-xs text-faint-foreground">
          {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
        </p>
      </PageHeader>

      {/* Permanent counters — never reset, never hidden, independent of the blocks below. */}
      <div className="overflow-hidden rounded-lg border border-border bg-surface">
        <div className="grid grid-cols-2 gap-px bg-border lg:grid-cols-4">
          <Counter label="Deadlines missed while ready" tone={missedDeadlines.length > 0 ? 'late' : undefined} selected={openCounter === 'missed'} onSelect={() => toggle('missed')}>
            <CountUp value={missedDeadlines.length} />
          </Counter>
          <Counter label="Applications submitted this month">
            <CountUp value={appsSubmittedThisMonth} />
          </Counter>
          <Counter label="Gaps closed this month" selected={openCounter === 'gaps'} onSelect={() => toggle('gaps')}>
            <CountUp value={gapsClosedSatisfied.length} />
          </Counter>
          <Counter label="Reference letters secured" selected={openCounter === 'referees'} onSelect={() => toggle('referees')}>
            <CountUp value={lettersSecured} />
            <span className="text-base text-faint-foreground"> of {REFEREE_TARGET}</span>
          </Counter>
        </div>

        <AnimatePresence initial={false} mode="wait">
          {openCounter && (
            <motion.div key={openCounter} variants={disclose} initial="closed" animate="open" exit="closed" className="overflow-hidden">
              <div className="border-t border-border px-5 py-4">
                {openCounter === 'missed' &&
                  (missedDeadlines.length === 0 ? (
                    <Quiet>No deadline has passed on something you were ready for.</Quiet>
                  ) : (
                    <ul className="space-y-2.5">
                      {missedDeadlines.map((m) => (
                        <li key={m.opportunity_id} className="flex flex-wrap items-baseline justify-between gap-x-4 text-sm">
                          <span className="text-foreground">{m.title}</span>
                          <span className="font-mono text-xs text-muted-foreground">
                            {formatDeadline(m.deadline)}
                            {m.daysReady !== null ? ` · ready for ${m.daysReady}d before it closed` : ' · closed before tracking began'}
                          </span>
                        </li>
                      ))}
                    </ul>
                  ))}

                {openCounter === 'gaps' && (
                  <div className="space-y-4">
                    {gapsClosedSatisfied.length === 0 ? (
                      <Quiet>Nothing closed yet this month.</Quiet>
                    ) : (
                      <ul className="space-y-1.5">
                        {gapsClosedSatisfied.map((c) => (
                          <li key={c.id} className="flex flex-wrap items-baseline justify-between gap-x-4 text-sm">
                            <span className="text-foreground">{c.label ?? c.gap_type}</span>
                            <span className="text-xs text-muted-foreground">{oppById.get(c.opportunity_id)?.title ?? c.opportunity_id}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                    {gapsClosedOther.length > 0 && (
                      <div className="space-y-1.5">
                        <p className="text-xs text-faint-foreground">Not counted — these stopped mattering rather than being closed</p>
                        <ul className="space-y-1.5">
                          {gapsClosedOther.map((c) => (
                            <li key={c.id} className="flex flex-wrap items-baseline justify-between gap-x-4 text-sm text-muted-foreground">
                              <span>
                                {c.label ?? c.gap_type}, {oppById.get(c.opportunity_id)?.title ?? c.opportunity_id}
                              </span>
                              <span className="font-mono text-2xs text-faint-foreground">{c.cause.replaceAll('_', ' ')}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}

                {openCounter === 'referees' &&
                  (referees.length === 0 ? (
                    <Quiet>No referees on your list yet.</Quiet>
                  ) : (
                    <ul className="grid gap-x-10 gap-y-2.5 sm:grid-cols-2">
                      {referees.map((r) => (
                        <li key={r.id} className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm text-foreground">{r.name}</p>
                            {r.relationship && <p className="truncate text-xs text-muted-foreground">{r.relationship}</p>}
                          </div>
                          <Select
                            value={r.status}
                            onValueChange={(v) => changeRefereeStatus(r.id, v as RefereeStatus)}
                            disabled={readOnly || pendingReferee === r.id}
                          >
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
                  ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {nothingAtAll ? (
        <EmptyState
          icon={Clock}
          title="Nothing needs you today"
          description="No deadline inside 21 days, nothing you started has stalled, nothing ready is sitting untouched, and there are no open gaps."
        />
      ) : (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <Panel>
            <SectionTitle icon={Clock} count={deadlinesSoon.length}>
              Closing in the next {DEADLINE_WINDOW_DAYS} days
            </SectionTitle>
            {deadlinesSoon.length === 0 ? (
              <Quiet>Nothing closes soon.</Quiet>
            ) : (
              <ul className="divide-y divide-border">
                {deadlinesSoon.map(({ opp, verdict, days }) => (
                  <li key={opp.id} className="flex items-center justify-between gap-3 py-2.5">
                    <div className="min-w-0">
                      <p className="truncate text-sm text-foreground">{opp.title}</p>
                      <p className="truncate text-xs text-muted-foreground">{opp.institution}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      {verdict && <VerdictBadge verdict={verdict.type} />}
                      <span className={cn('w-12 text-right font-mono text-xs tabular-nums', (days ?? 99) <= 7 ? 'text-verdict-late' : 'text-muted-foreground')}>
                        {days === 0 ? 'today' : `${days}d`}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel>
            <SectionTitle icon={AlertTriangle} count={overdueCommitments.length}>
              Started, then stalled
            </SectionTitle>
            {overdueCommitments.length === 0 ? (
              <Quiet>Everything you started has moved in the last two weeks.</Quiet>
            ) : (
              <ul className="divide-y divide-border">
                {overdueCommitments.map(({ app, opp, staleDays }) => (
                  <li key={app.id} className="flex items-center justify-between gap-3 py-2.5">
                    <div className="min-w-0">
                      <p className="truncate text-sm text-foreground">{opp.title}</p>
                      <p className="truncate text-xs text-muted-foreground">{APPLICATION_STATUS_LABELS[app.status]}</p>
                    </div>
                    <span className="shrink-0 font-mono text-xs text-verdict-late tabular-nums">{staleDays}d without a change</span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel className="lg:col-span-2">
            <SectionTitle icon={Hourglass} count={agingReady.length}>
              Ready, and waiting on you
            </SectionTitle>
            {agingReady.length === 0 ? (
              <Quiet>Nothing ready has been left sitting.</Quiet>
            ) : (
              <ul className="divide-y divide-border">
                {agingReady.map(({ opp, ageDays, daysLeft }) => (
                  <li key={opp.id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-2.5 text-sm">
                    <span className="min-w-0 truncate text-foreground">{opp.title}</span>
                    <span className="shrink-0 font-mono text-xs text-muted-foreground tabular-nums">
                      ready for {ageDays}d
                      {daysLeft !== null && <span className={cn(daysLeft <= 14 && 'text-verdict-late')}> · {daysLeft}d left</span>}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel className="lg:col-span-2">
            <SectionTitle icon={Target}>The three gaps worth closing first</SectionTitle>
            {topGaps.length === 0 ? (
              <Quiet>No open gaps.</Quiet>
            ) : (
              <ul className="space-y-3 pt-1">
                {topGaps.map((gap) => (
                  <li key={gap.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1.5 sm:grid-cols-[minmax(0,16rem)_minmax(0,1fr)_auto]">
                    <span className="truncate text-sm text-foreground">{gap.label}</span>
                    <div className="order-last col-span-2 h-1 overflow-hidden rounded-full bg-surface-3 sm:order-none sm:col-span-1">
                      <motion.div
                        className="h-full rounded-full bg-foreground/70"
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.max(4, (gap.unblock_count / maxUnblock) * 100)}%` }}
                        transition={transition.slow}
                      />
                    </div>
                    <span className="shrink-0 text-right font-mono text-xs text-muted-foreground tabular-nums">
                      unlocks {gap.unblock_count}
                      {gap.time_estimate ? ` · ${gap.time_estimate}` : ''}
                      {gap.cost_estimate ? ` · ${gap.cost_estimate}` : ''}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      )}
    </div>
  )
}
