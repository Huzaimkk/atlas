'use client'

import { AnimatePresence, motion } from 'motion/react'
import { Target } from 'lucide-react'
import { GAP_TYPE_LABELS, type AggregatedGap } from '@/types/atlas'
import { EmptyState } from '@/components/atlas/empty-state'
import { GAP_PRIORITY_LABELS } from '@/lib/atlas-format'
import { cn } from '@/lib/utils'

const PRIORITY_STYLE: Record<AggregatedGap['priority'], string> = {
  start_now: 'text-verdict-ready',
  agent_assisted: 'text-verdict-watch',
  low_priority: 'text-faint-foreground',
}

export function GapQueueView({ gaps }: { gaps: AggregatedGap[] }) {
  const sorted = [...gaps].sort((a, b) => b.unblock_count - a.unblock_count)
  const max = sorted[0]?.unblock_count ?? 1

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Gap Queue</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Every missing item, aggregated across the pool, ranked by how many rows it unblocks.
        </p>
      </header>

      {sorted.length === 0 ? (
        <EmptyState
          icon={Target}
          title="No gaps to close yet"
          description="Once the pool is seeded and diagnosed against your profile, every missing requirement is aggregated here and ranked by unblock count — the top row is the single highest-leverage thing to do next."
        />
      ) : (
        // Bar chart as the centrepiece — one axis (unblock_count), one hue
        // (this is a single series, not categories needing distinct colors),
        // shared scale across every bar so lengths are directly comparable.
        <div className="space-y-1 rounded-lg border border-border p-4">
          <AnimatePresence initial={false}>
            {sorted.map((gap) => (
              <motion.div
                key={gap.id}
                layout
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ layout: { duration: 0.25, ease: 'easeOut' }, opacity: { duration: 0.15 } }}
                className="space-y-1 py-2"
              >
                <div className="flex items-baseline justify-between gap-3">
                  <div className="flex min-w-0 items-baseline gap-2">
                    <span className="truncate text-sm font-medium text-foreground">{gap.label}</span>
                    <span className="shrink-0 rounded border border-border-strong px-1.5 py-0.5 font-mono text-2xs text-muted-foreground">
                      {GAP_TYPE_LABELS[gap.type]}
                    </span>
                  </div>
                  <span className={cn('shrink-0 font-mono text-xs font-semibold uppercase tracking-wide', PRIORITY_STYLE[gap.priority])}>
                    {GAP_PRIORITY_LABELS[gap.priority]}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-2">
                    <motion.div
                      className="h-full rounded-full bg-primary"
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.max(3, (gap.unblock_count / max) * 100)}%` }}
                      transition={{ duration: 0.35, ease: 'easeOut' }}
                    />
                  </div>
                  <span className="w-6 shrink-0 text-right font-mono text-xs text-foreground">{gap.unblock_count}</span>
                </div>

                <div className="flex items-center gap-4 font-mono text-2xs text-muted-foreground">
                  <span>{gap.time_estimate}</span>
                  <span>{gap.cost_estimate}</span>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}
