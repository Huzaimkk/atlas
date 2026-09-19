import { Inbox as InboxIcon, Camera, FileText, FileType, Link2, AlertTriangle } from 'lucide-react'
import type { InboxLead, LeadConfidence, Origin } from '@/types/atlas'
import { EmptyState } from '@/components/atlas/empty-state'
import { cn } from '@/lib/utils'

const ORIGIN_ICON: Record<Origin, typeof Camera> = {
  screenshot: Camera,
  pdf: FileType,
  txt: FileText,
  search: Link2,
  manual: FileText,
}

const CONFIDENCE_META: Record<LeadConfidence, { label: string; className: string }> = {
  unverified: { label: 'Unverified', className: 'text-faint-foreground' },
  resolving: { label: 'Resolving', className: 'text-verdict-watch' },
  conflicting: { label: 'Conflicting', className: 'text-verdict-late' },
  resolved: { label: 'Resolved', className: 'text-verdict-ready' },
}

export function InboxView({ leads }: { leads: InboxLead[] }) {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Inbox</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manual drops — screenshots, PDFs, pasted text, or notes. Every drop is a lead, never a fact, until it resolves to a primary source.
        </p>
      </header>

      <div className="rounded-lg border border-dashed border-border px-6 py-8 text-center">
        <p className="text-sm text-muted-foreground">Drop a screenshot, PDF, or paste a note to add a lead.</p>
        <p className="mt-1 text-xs text-faint-foreground">Accepted: PNG, JPEG, PDF, plain text, or a pasted URL.</p>
      </div>

      {leads.length === 0 ? (
        <EmptyState
          icon={InboxIcon}
          title="Inbox is empty"
          description="Nothing dropped yet. This is where LinkedIn posts, screenshots, and anything the automated sweeps can't reach get parsed into a lead and resolved before they're actionable."
        />
      ) : (
        <ul className="space-y-2">
          {leads.map((lead) => {
            const OriginIcon = ORIGIN_ICON[lead.origin]
            const confidence = CONFIDENCE_META[lead.confidence]
            return (
              <li key={lead.id} className="flex items-start gap-3 rounded-lg border border-border p-4">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-surface-2 text-muted-foreground">
                  <OriginIcon className="size-4" strokeWidth={1.75} />
                </div>
                <div className="min-w-0 flex-1 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-foreground">
                      {lead.extracted.title ?? 'Untitled lead'}
                    </p>
                    <span className={cn('font-mono text-2xs font-medium uppercase tracking-wide', confidence.className)}>
                      {confidence.label}
                    </span>
                  </div>
                  {lead.raw_excerpt && <p className="text-xs text-muted-foreground line-clamp-2">&ldquo;{lead.raw_excerpt}&rdquo;</p>}
                  <div className="flex items-center gap-3 font-mono text-2xs text-faint-foreground">
                    <span>dropped {lead.dropped_at}</span>
                    {lead.extracted.institution && <span>{lead.extracted.institution}</span>}
                  </div>
                  {lead.confidence === 'conflicting' && (
                    <p className="flex items-center gap-1.5 text-xs text-verdict-late">
                      <AlertTriangle className="size-3.5" strokeWidth={1.75} />
                      Conflicts with an existing pool row
                      {lead.dedupe_match_id ? ` (${lead.dedupe_match_id})` : ''} — flagged for your decision, not overwritten.
                    </p>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
