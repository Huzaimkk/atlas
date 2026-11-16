'use client'

import { motion } from 'motion/react'
import { RadioTower, ExternalLink, AlertCircle } from 'lucide-react'
import type { WatchlistLab, WatchlistStatus } from '@/types/atlas'
import { EmptyState } from '@/components/atlas/empty-state'
import { PageHeader } from '@/components/atlas/page-header'
import { cn } from '@/lib/utils'

const STATUS_META: Record<WatchlistStatus, { label: string; className: string }> = {
  watching: { label: 'Watching', className: 'text-verdict-watch' },
  change_detected: { label: 'Change detected', className: 'text-verdict-gap' },
  stale: { label: 'Not checked in over 21 days', className: 'text-faint-foreground' },
}

export function WatchlistView({ labs }: { labs: WatchlistLab[] }) {
  return (
    <div className="space-y-6">
      <PageHeader title="Watchlist" description="Lab pages checked weekly for changes. A highlighted lab has changed since the last check." />

      {labs.length === 0 ? (
        <EmptyState
          icon={RadioTower}
          title="No labs on your watchlist yet"
          description="Atlas will suggest labs from your research areas and check their pages every week for new openings. This is not switched on yet."
        />
      ) : (
        <ul className="space-y-2">
          {labs.map((lab) => {
            const meta = STATUS_META[lab.status]
            const content = (
              <li
                className={cn(
                  'rounded-lg border bg-surface p-5',
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
                    <span className={cn('text-xs font-medium', meta.className)}>
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
