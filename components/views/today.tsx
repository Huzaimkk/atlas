import { AlertTriangle, Clock, Hourglass, Target } from 'lucide-react'
import type { Application, AggregatedGap, Opportunity, Verdict } from '@/types/atlas'
import { APPLICATION_TERMINAL_STATUSES } from '@/types/atlas'
import { EmptyState } from '@/components/atlas/empty-state'
import { VerdictBadge } from '@/components/atlas/verdict-badge'
import { daysUntil, daysSince, formatDeadline } from '@/lib/atlas-format'
import { cn } from '@/lib/utils'

const DEADLINE_WINDOW_DAYS = 21
// "Haven't moved" — no status change in two weeks while actively in
// progress (not_started hasn't begun, and the three terminal states have
// nowhere left to go). Same two-week heuristic the rest of the app already
// uses for urgency (URGENT_DAYS in app-shell, urgencyBand in atlas-format).
const OVERDUE_THRESHOLD_DAYS = 14

/**
 * Today — four blocks, nothing else (accountability spec item 1). Replaces
 * Home as the default view: with 323 rows "what exists" stopped being the
 * useful question days ago, so this answers "what did I do about it"
 * instead of surveying the pool again.
 */
export function TodayView({
  opportunities,
  verdicts,
  gaps,
  applications,
}: {
  opportunities: Opportunity[]
  verdicts: Verdict[]
  gaps: AggregatedGap[]
  applications: Application[]
}) {
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

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Today</h1>
        <p className="mt-1 text-sm text-muted-foreground">What did you do about it — not what exists.</p>
      </header>

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
              This week's gaps — top 3 by unblock count
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
