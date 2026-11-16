import { Archive as ArchiveIcon } from 'lucide-react'
import type { ArchiveEntry } from '@/types/atlas'
import { EmptyState } from '@/components/atlas/empty-state'
import { PageHeader } from '@/components/atlas/page-header'
import { TierBadge } from '@/components/atlas/verdict-badge'
import { formatDeadline } from '@/lib/atlas-format'

const REASON_LABELS: Record<ArchiveEntry['archived_reason'], string> = {
  expired: 'Expired, no late route',
  t1_cap_displaced: 'Set aside: five reach applications already active',
  withdrawn: 'Withdrawn',
}

export function ArchiveView({ entries }: { entries: ArchiveEntry[] }) {
  return (
    <div className="space-y-6">
      <PageHeader title="Archive" description="Expired and withdrawn opportunities, kept rather than deleted. Most programmes recur yearly, so an archived row is next cycle’s early warning." />

      {entries.length === 0 ? (
        <EmptyState
          icon={ArchiveIcon}
          title="Nothing archived yet"
          description="An opportunity moves here when its deadline passes with no late route, or when you decline it. Nothing is ever deleted."
        />
      ) : (
        <ul className="divide-y divide-border rounded-lg border border-border bg-surface">
          {entries.map(({ opportunity, archived_reason, archived_at }) => (
            <li key={opportunity.id} className="flex items-center gap-4 px-4 py-3.5">
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-medium text-foreground">{opportunity.title}</p>
                  <TierBadge tier={opportunity.tier} />
                </div>
                <p className="truncate text-xs text-muted-foreground">{opportunity.institution}</p>
              </div>
              <div className="hidden w-48 shrink-0 text-xs text-muted-foreground sm:block">
                {REASON_LABELS[archived_reason]}
              </div>
              <div className="w-32 shrink-0 text-right font-mono text-xs text-muted-foreground">
                {formatDeadline(opportunity.deadline)}
              </div>
              <div className="w-28 shrink-0 text-right font-mono text-2xs text-faint-foreground">
                archived {archived_at}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
