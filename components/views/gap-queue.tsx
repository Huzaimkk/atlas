'use client'

import { AnimatePresence, motion } from 'motion/react'
import { Target } from 'lucide-react'
import { GAP_TYPE_LABELS, type AggregatedGap } from '@/types/atlas'
import { EmptyState } from '@/components/atlas/empty-state'
import { PageHeader } from '@/components/atlas/page-header'
import { GAP_PRIORITY_LABELS } from '@/lib/atlas-format'
import { cn } from '@/lib/utils'
import { UnlockCount } from '@/components/atlas/unlock-count'

const PRIORITY_STYLE: Record<AggregatedGap['priority'], string> = {
  start_now: 'text-verdict-ready',
  agent_assisted: 'text-verdict-watch',
  low_priority: 'text-faint-foreground',
}

export function GapQueueView({ gaps }: { gaps: AggregatedGap[] }) {
  const sorted = [...gaps].sort((a, b) => b.unblock_count - a.unblock_count)
  
  return (
    <div className="space-y-6">
      <PageHeader title="Gaps to close" description="Every missing item across all your opportunities, ranked by how many each one unlocks." />

      {sorted.length === 0 ? (
        <EmptyState
          icon={Target}
          title="No gaps to close"
          description="When an opportunity you are eligible for is missing something, it is listed here, ranked by how many opportunities it unlocks. The top row is the single most useful thing to do next."
        />
      ) : (
        // One mark per opportunity a gap would unlock — a count, not a
        // progress bar. (The old bar was scaled to the largest gap, so a
        // gap with nothing done on it looked ~90% complete.)
        <div className="space-y-1 rounded-lg border border-border bg-surface p-5">
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
                  <span className={cn('shrink-0 text-xs font-medium', PRIORITY_STYLE[gap.priority])}>
                    {GAP_PRIORITY_LABELS[gap.priority]}
                  </span>
                </div>

                <UnlockCount count={gap.unblock_count} />

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
