'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { AnimatePresence, motion } from 'motion/react'
import { AlertTriangle, ArrowRight, CalendarClock, ChevronDown, Clock, Hourglass, Target } from 'lucide-react'
import type { AggregatedAction, AggregatedGap, Application, GapClosure, MissedDeadline, Opportunity, Referee, RefereeStatus, Verdict } from '@/types/atlas'
import { APPLICATION_TERMINAL_STATUSES } from '@/types/atlas'
import { EmptyState } from '@/components/atlas/empty-state'
import { PageHeader, SectionTitle } from '@/components/atlas/page-header'
import { CountUp } from '@/components/atlas/count-up'
import { useReadOnly } from '@/components/atlas/read-only'
import { VerdictBadge } from '@/components/atlas/verdict-badge'
import { ApplyButton } from '@/components/atlas/apply-button'
import { UnlockCount } from '@/components/atlas/unlock-count'
import { GAP_TYPE_LABELS } from '@/types/atlas'
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
// Real data puts 40+ rows in this block; the rest are one click away, never dropped.
const READY_PREVIEW = 8

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
 * The single most useful sentence the system produces: the one action
 * that opens the most opportunities. It leads the page, with a button that
 * shows exactly which opportunities it opens.
 */
function TopAction({
  action,
  opportunities,
  verdictByOpp,
  onOpenGaps,
}: {
  action: AggregatedAction
  opportunities: Map<string, Opportunity>
  verdictByOpp: Map<string, Verdict>
  onOpenGaps?: () => void
}) {
  const [open, setOpen] = useState(false)
  const rank = (d: number | null) => (d !== null && d >= 0 ? d : 1e9)
  const unlocked = action.opportunity_ids
    .map((id) => opportunities.get(id))
    .filter((o): o is Opportunity => !!o)
    .map((opp) => ({ opp, verdict: verdictByOpp.get(opp.id), days: daysUntil(opp.deadline) }))
    .sort((a, b) => rank(a.days) - rank(b.days))
  const nextDeadline = unlocked.find((u) => u.days !== null && u.days >= 0)

  return (
    <section className="overflow-hidden rounded-xl border border-border-strong bg-surface">
      <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-5 p-6 sm:p-7">
        <div className="min-w-0 max-w-2xl space-y-3">
          <p className="text-xs text-muted-foreground">The one thing that opens the most</p>
          <p className="display text-3xl leading-tight text-foreground">{action.action_label}</p>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <UnlockCount count={action.unblock_count} />
            <span className="text-xs text-muted-foreground">
              {GAP_TYPE_LABELS[action.type]}
              {action.time_estimate ? ` · ${action.time_estimate}` : ''}
              {action.cost_estimate ? ` · ${action.cost_estimate}` : ''}
            </span>
          </div>
          {nextDeadline && (
            <p className="text-sm text-muted-foreground">
              The soonest of them closes in{' '}
              <span className={cn('font-mono', (nextDeadline.days ?? 99) <= 14 ? 'text-verdict-late' : 'text-foreground')}>{nextDeadline.days}d</span>:{' '}
              {nextDeadline.opp.title}.
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            className="inline-flex h-10 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
          >
            {open ? 'Hide' : 'Show'} the {action.unblock_count} it opens
            <motion.span animate={{ rotate: open ? 180 : 0 }} transition={transition.base}>
              <ChevronDown className="size-4" strokeWidth={2} />
            </motion.span>
          </button>
          {onOpenGaps && (
            <button
              onClick={onOpenGaps}
              className="inline-flex h-10 items-center gap-1.5 rounded-md border border-border-strong px-4 text-sm text-foreground transition-colors hover:bg-surface-2"
            >
              All gaps
              <ArrowRight className="size-3.5" strokeWidth={1.75} />
            </button>
          )}
        </div>
      </div>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div variants={disclose} initial="closed" animate="open" exit="closed" className="overflow-hidden">
            <ul className="divide-y divide-border border-t border-border">
              {unlocked.map(({ opp, verdict, days }) => (
                <li key={opp.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-6 py-3 sm:px-7">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-foreground">{opp.title}</p>
                    <p className="truncate text-xs text-muted-foreground">{opp.institution}</p>
                  </div>
                  <span className={cn('w-20 text-right font-mono text-xs tabular-nums', days !== null && days >= 0 && days <= 14 ? 'text-verdict-late' : 'text-muted-foreground')}>
                    {days === null ? 'no date' : days < 0 ? 'closed' : days === 0 ? 'today' : `${days}d`}
                  </span>
                  {verdict && <VerdictBadge verdict={verdict.type} />}
                  <ApplyButton opp={opp} />
                </li>
              ))}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  )
}

type DeadlineRow = { opp: Opportunity; verdict: Verdict | undefined; days: number | null }

/**
 * Deadlines grouped by day, soonest first. The nearest day is the headline
 * because that is the clock the whole week runs on.
 */
function DeadlineCountdown({ rows: allRows }: { rows: DeadlineRow[] }) {
  // The headline is your tracks — degrees, scholarships, fellowships, roles.
  // Conferences and events close constantly and would otherwise lead every
  // day; they get their own line underneath.
  const rows = allRows.filter((r) => r.opp.track !== 'conference')
  const events = allRows.filter((r) => r.opp.track === 'conference')
  const byDay = new Map<string, DeadlineRow[]>()
  for (const r of rows) {
    const key = r.opp.deadline as string
    if (!byDay.has(key)) byDay.set(key, [])
    byDay.get(key)!.push(r)
  }
  const days = [...byDay.entries()].sort((a, b) => a[0].localeCompare(b[0]))
  if (days.length === 0) {
    return (
      <section className="rounded-lg border border-border bg-surface p-5">
        <SectionTitle icon={CalendarClock}>Deadlines</SectionTitle>
        <p className="mt-2 text-sm text-faint-foreground">Nothing you can still apply to closes in the next {DEADLINE_WINDOW_DAYS} days.</p>
      </section>
    )
  }
  const [[firstDate, firstRows], ...rest] = days
  const firstDays = firstRows[0].days ?? 0
  const label = (iso: string) => new Date(iso + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'long', day: 'numeric' })

  return (
    <section className="overflow-hidden rounded-lg border border-border bg-surface">
      <div className="grid gap-x-8 gap-y-4 p-6 sm:grid-cols-[auto_minmax(0,1fr)]">
        <div className="sm:min-w-44">
          <p className="text-xs text-muted-foreground">Next deadline</p>
          <p className={cn('mt-1 font-mono text-5xl leading-none tabular-nums', firstDays <= 7 ? 'text-verdict-late' : 'text-foreground')}>
            {firstDays}
            <span className="ml-1 text-lg text-muted-foreground">{firstDays === 1 ? 'day' : 'days'}</span>
          </p>
          <p className="mt-2 text-sm text-foreground">{label(firstDate)}</p>
          <p className="text-xs text-muted-foreground">
            {firstRows.length} {firstRows.length === 1 ? 'programme closes' : 'programmes close'} that day
          </p>
        </div>
        <ul className="divide-y divide-border self-start rounded-md border border-border">
          {firstRows.map(({ opp, verdict }) => (
            <li key={opp.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-2.5">
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm text-foreground">{opp.title}</span>
                <span className="block truncate text-xs text-muted-foreground">{opp.institution}</span>
              </span>
              {verdict && <VerdictBadge verdict={verdict.type} />}
              <ApplyButton opp={opp} />
            </li>
          ))}
        </ul>
      </div>
      {events.length > 0 && (
        <div className="border-t border-border px-6 py-3 text-sm">
          <span className="text-xs text-muted-foreground">Conferences and events inside {DEADLINE_WINDOW_DAYS} days: </span>
          <span className="text-foreground">{events.map((e) => `${e.opp.title} (${e.days === 0 ? 'today' : `${e.days}d`})`).join(', ')}</span>
        </div>
      )}
      {rest.length > 0 && (
        <div className="border-t border-border px-6 py-4">
          <p className="mb-2 text-xs text-muted-foreground">After that, inside {DEADLINE_WINDOW_DAYS} days</p>
          <ul className="space-y-1.5">
            {rest.map(([date, group]) => (
              <li key={date} className="grid grid-cols-[3.5rem_minmax(0,1fr)] items-baseline gap-x-3 text-sm">
                <span className="font-mono text-xs text-muted-foreground tabular-nums">{group[0].days}d</span>
                <span className="min-w-0 truncate text-foreground">
                  <span className="text-muted-foreground">{label(date)}: </span>
                  {group.map((g) => g.opp.title).join(', ')}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
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
  actions = [],
  applications,
  gapClosures,
  referees,
  missedDeadlines,
  onOpenGaps,
}: {
  opportunities: Opportunity[]
  verdicts: Verdict[]
  gaps: AggregatedGap[]
  actions?: AggregatedAction[]
  onOpenGaps?: () => void
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
  const [showAllReady, setShowAllReady] = useState(false)

  const oppById = new Map(opportunities.map((o) => [o.id, o]))
  const verdictByOpp = new Map(verdicts.map((v) => [v.opportunity_id, v]))

  const deadlinesSoon = opportunities
    .map((opp) => ({ opp, verdict: verdictByOpp.get(opp.id), days: daysUntil(opp.deadline) }))
    .filter(({ verdict, days }) => {
      if (!verdict || !['READY', 'GAP', 'LATE_WINDOW', 'UNEXAMINED'].includes(verdict.type)) return false
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

  // Ranked by satisfying action (one IELTS sitting clears many differently
  // worded English rules), falling back to per-requirement gaps when no
  // action ranking exists.
  const rankedActions: AggregatedAction[] = (actions.length > 0 ? [...actions] : gaps.map((g) => ({ ...g, action_label: g.label }))).sort(
    (a, b) => b.unblock_count - a.unblock_count
  )
  const topAction = rankedActions[0]
  const topGaps = rankedActions.slice(1, 4)

  const nothingAtAll = overdueCommitments.length === 0 && agingReady.length === 0 && topGaps.length === 0

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

      {topAction && <TopAction action={topAction} opportunities={oppById} verdictByOpp={verdictByOpp} onOpenGaps={onOpenGaps} />}

      <DeadlineCountdown rows={deadlinesSoon} />

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
          title="Nothing else needs you today"
          description="Nothing you started has stalled, nothing ready is sitting untouched, and there are no other open gaps."
        />
      ) : (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
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
                {(showAllReady ? agingReady : agingReady.slice(0, READY_PREVIEW)).map(({ opp, ageDays, daysLeft }) => (
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
            {agingReady.length > READY_PREVIEW && (
              <button
                onClick={() => setShowAllReady((v) => !v)}
                className="text-sm text-muted-foreground underline-offset-2 transition-colors hover:text-foreground hover:underline"
              >
                {showAllReady ? `Show the first ${READY_PREVIEW}` : `Show all ${agingReady.length}`}
              </button>
            )}
          </Panel>

          <Panel className="lg:col-span-2">
            <SectionTitle icon={Target}>After that, the next three</SectionTitle>
            {topGaps.length === 0 ? (
              <Quiet>No other open gaps.</Quiet>
            ) : (
              <ul className="space-y-3 pt-1">
                {topGaps.map((gap) => (
                  <li key={gap.id} className="flex flex-wrap items-center justify-between gap-x-6 gap-y-1.5">
                    <span className="min-w-0 flex-1 truncate text-sm text-foreground">{gap.action_label}</span>
                    <span className="hidden text-xs text-muted-foreground md:inline">
                      {gap.time_estimate}
                      {gap.cost_estimate ? ` · ${gap.cost_estimate}` : ''}
                    </span>
                    <UnlockCount count={gap.unblock_count} />
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
