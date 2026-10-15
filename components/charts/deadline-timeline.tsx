'use client'

import { motion } from 'motion/react'
import type { Opportunity, Verdict } from '@/types/atlas'
import { VERDICT_META } from '@/lib/atlas-format'
import { daysUntil } from '@/lib/atlas-format'
import { EmptyState } from '@/components/atlas/empty-state'
import { CalendarRange } from 'lucide-react'

const WINDOW_DAYS = 90
const TICKS = [0, 30, 60, 90]

// One axis (time, 0-90 days out) — each row is a single opportunity, its
// mark positioned by days-until-deadline. Status (verdict) carries color,
// reusing the same reserved verdict palette every other view already
// uses — never a generic categorical hue for what is fundamentally status.
export function DeadlineTimelineChart({ opportunities, verdicts }: { opportunities: Opportunity[]; verdicts: Verdict[] }) {
  const verdictById = new Map(verdicts.map((v) => [v.opportunity_id, v]))

  const rows = opportunities
    .map((o) => ({ opp: o, verdict: verdictById.get(o.id), days: daysUntil(o.deadline) }))
    .filter((r): r is { opp: Opportunity; verdict: Verdict | undefined; days: number } => r.days !== null && r.days >= 0 && r.days <= WINDOW_DAYS)
    .filter((r) => !r.verdict || !['EXPIRED', 'BLOCKED', 'IRRELEVANT'].includes(r.verdict.type))
    .sort((a, b) => a.days - b.days)

  return (
    <div className="space-y-3 rounded-lg border border-border p-4">
      <h2 className="text-sm font-semibold text-foreground">Next {WINDOW_DAYS} days</h2>

      {rows.length === 0 ? (
        <EmptyState icon={CalendarRange} title="Nothing due" description="No actionable row has a deadline in the next 90 days." />
      ) : (
        <div className="space-y-2">
          <div className="relative ml-40 h-4 border-b border-border text-2xs text-faint-foreground">
            {TICKS.map((d) => (
              <span key={d} className="absolute -translate-x-1/2 font-mono" style={{ left: `${(d / WINDOW_DAYS) * 100}%` }}>
                {d === 0 ? 'today' : `${d}d`}
              </span>
            ))}
          </div>
          <ul className="space-y-1.5">
            {rows.map(({ opp, verdict, days }) => {
              const meta = verdict ? VERDICT_META[verdict.type] : null
              return (
                <li key={opp.id} className="flex items-center gap-3">
                  <p className="w-40 shrink-0 truncate text-xs text-muted-foreground" title={opp.title}>
                    {opp.title}
                  </p>
                  <div className="relative h-4 flex-1">
                    <div className="absolute top-1/2 h-px w-full -translate-y-1/2 bg-border" />
                    <motion.div
                      className="absolute top-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full"
                      style={{ left: `${(days / WINDOW_DAYS) * 100}%`, background: meta?.colorVar ?? 'var(--muted-foreground)' }}
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ duration: 0.25, ease: 'easeOut' }}
                      title={`${opp.title} — ${days}d — ${meta?.label ?? 'no verdict'}`}
                    />
                  </div>
                  <span className="w-10 shrink-0 text-right font-mono text-2xs text-muted-foreground">{days}d</span>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}
