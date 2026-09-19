'use client'

import { AnimatePresence, motion } from 'motion/react'
import { ListChecks, ExternalLink, AlertTriangle } from 'lucide-react'
import type { Opportunity, Verdict } from '@/types/atlas'
import { EmptyState } from '@/components/atlas/empty-state'
import { VerdictBadge, TierBadge } from '@/components/atlas/verdict-badge'
import { formatDeadline, formatFunding } from '@/lib/atlas-format'
import { Button } from '@/components/ui/button'

export function ActionQueueView({ opportunities, verdicts }: { opportunities: Opportunity[]; verdicts: Verdict[] }) {
  const byId = new Map(opportunities.map((o) => [o.id, o]))
  const rows = verdicts
    .filter((v) => v.type === 'READY' || v.type === 'LATE_WINDOW')
    .map((v) => ({ verdict: v, opp: byId.get(v.opportunity_id) }))
    .filter((r): r is { verdict: Verdict; opp: Opportunity } => !!r.opp)
    .sort((a, b) => {
      if (a.verdict.type !== b.verdict.type) return a.verdict.type === 'LATE_WINDOW' ? -1 : 1
      if (!a.opp.deadline) return 1
      if (!b.opp.deadline) return -1
      return a.opp.deadline.localeCompare(b.opp.deadline)
    })

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Action Queue</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Rows with every requirement already satisfied, sorted by deadline. Late-window rows surface first.
        </p>
      </header>

      {rows.length === 0 ? (
        <EmptyState
          icon={ListChecks}
          title="Nothing ready to act on yet"
          description="Once opportunities in the pool pass eligibility with no outstanding requirements, they land here — sorted by deadline, with late-window rows flagged first."
        />
      ) : (
        <ul className="divide-y divide-border rounded-lg border border-border">
          <AnimatePresence initial={false}>
            {rows.map(({ verdict, opp }) => (
              <motion.li
                key={opp.id}
                layout
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ layout: { duration: 0.25, ease: 'easeOut' }, opacity: { duration: 0.15 } }}
                className="flex items-center gap-4 px-4 py-3.5"
              >
                {verdict.type === 'LATE_WINDOW' && (
                  <AlertTriangle className="size-4 shrink-0 text-verdict-late" strokeWidth={1.75} />
                )}
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-medium text-foreground">{opp.title}</p>
                    <TierBadge tier={opp.tier} />
                  </div>
                  <p className="truncate text-xs text-muted-foreground">
                    {opp.institution}
                    {opp.supervisor ? ` · ${opp.supervisor.name}` : ''}
                  </p>
                  {verdict.type === 'LATE_WINDOW' && verdict.reason && (
                    <p className="text-xs text-verdict-late">{verdict.reason}</p>
                  )}
                </div>
                <div className="hidden shrink-0 text-right font-mono text-xs text-muted-foreground sm:block">
                  {formatFunding(opp.funding?.stipend)}
                </div>
                <div className="w-32 shrink-0 text-right font-mono text-xs text-muted-foreground">
                  {formatDeadline(opp.deadline)}
                </div>
                <VerdictBadge verdict={verdict.type} className="shrink-0" />
                {opp.apply_url && (
                  <Button asChild size="icon" variant="ghost" className="size-7 shrink-0">
                    <a href={opp.apply_url} target="_blank" rel="noreferrer">
                      <ExternalLink className="size-3.5" />
                    </a>
                  </Button>
                )}
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      )}
    </div>
  )
}
