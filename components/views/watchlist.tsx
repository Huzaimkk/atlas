'use client'

import { motion } from 'motion/react'
import { RadioTower, ExternalLink, AlertCircle } from 'lucide-react'
import type { WatchlistLab, WatchlistStatus } from '@/types/atlas'
import { EmptyState } from '@/components/atlas/empty-state'
import { cn } from '@/lib/utils'

const STATUS_META: Record<WatchlistStatus, { label: string; className: string }> = {
  watching: { label: 'Watching', className: 'text-verdict-watch' },
  change_detected: { label: 'Change detected', className: 'text-verdict-gap' },
  stale: { label: 'Stale — past 21-day SLA', className: 'text-faint-foreground' },
}

export function WatchlistView({ labs }: { labs: WatchlistLab[] }) {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Watchlist</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Channel C — lab pages polled weekly and diffed against the last snapshot. Highlighted rows changed since the last fetch.
        </p>
      </header>

      {labs.length === 0 ? (
        <EmptyState
          icon={RadioTower}
          title="No labs being watched yet"
          description="The watchlist is built from your research fingerprint via Channel C1 — recent publications in your subfields, resolved to a corresponding author and lab URL. It starts at ~50 labs, pilot scale, once Layer 1 is complete."
        />
      ) : (
        <ul className="space-y-2">
          {labs.map((lab) => {
            const meta = STATUS_META[lab.status]
            const content = (
              <li
                className={cn(
                  'rounded-lg border p-4',
                  lab.status === 'change_detected' ? 'border-verdict-gap/40 bg-verdict-gap-bg' : 'border-border'
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-foreground">{lab.supervisor.name}</p>
                      <span className="text-xs text-muted-foreground">{lab.institution}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{lab.field_tags.join(' · ')}</p>
                    {lab.change_summary && (
                      <p className="flex items-center gap-1.5 pt-1 text-xs text-verdict-gap">
                        <AlertCircle className="size-3.5" strokeWidth={1.75} />
                        {lab.change_summary}
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1.5">
                    <span className={cn('font-mono text-2xs font-medium uppercase tracking-wide', meta.className)}>
                      {meta.label}
                    </span>
                    <a
                      href={lab.page_url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1 text-2xs text-muted-foreground hover:text-foreground"
                    >
                      lab page <ExternalLink className="size-3" />
                    </a>
                    {lab.last_fetched_at && (
                      <span className="font-mono text-2xs text-faint-foreground">fetched {lab.last_fetched_at}</span>
                    )}
                  </div>
                </div>
              </li>
            )

            if (lab.status !== 'change_detected') return <div key={lab.id}>{content}</div>

            return (
              <motion.div
                key={lab.id}
                initial={{ boxShadow: '0 0 0 3px var(--verdict-gap-bg)' }}
                animate={{ boxShadow: '0 0 0 0px var(--verdict-gap-bg)' }}
                transition={{ duration: 1.8, ease: 'easeOut' }}
                className="rounded-lg"
              >
                {content}
              </motion.div>
            )
          })}
        </ul>
      )}
    </div>
  )
}
