'use client'

import { useMemo, useState } from 'react'
import { ArrowUpDown, ChevronDown, ChevronRight, Database, Search, PenOff, ExternalLink, Quote, X } from 'lucide-react'
import {
  CATEGORY_LABELS,
  type Application,
  type Opportunity,
  type Status,
  type Tier,
  type Track,
  type Verdict,
  type VerdictType,
} from '@/types/atlas'
import { EmptyState } from '@/components/atlas/empty-state'
import { VerdictBadge, TierBadge } from '@/components/atlas/verdict-badge'
import { formatDeadline, formatFunding, STATUS_LABELS, hasAiWritingPolicy } from '@/lib/atlas-format'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet'

type SortKey = 'title' | 'deadline' | 'tier'
type SectionId = 'live' | 'upcoming' | 'reference' | 'past'

const SECTIONS: { id: SectionId; label: string; description: string }[] = [
  { id: 'live', label: 'Live', description: 'Open, closing soon, or in a late-application window' },
  { id: 'upcoming', label: 'Upcoming', description: 'Not yet open' },
  { id: 'reference', label: 'Reference', description: 'Background material, no specific call or deadline — not an action' },
  { id: 'past', label: 'Past', description: 'Expired, blocked, or marked irrelevant — kept visible, not deleted' },
]

const TRACK_LABELS: Record<Track, string> = {
  phd_funded: 'Funded PhD',
  gta: 'Graduate TA',
  ra: 'Research assistantship',
  postdoc: 'Postdoc',
  scholarship: 'Scholarship',
  fellowship: 'Fellowship',
  conference: 'Conference',
  internship: 'Internship',
  accelerator: 'Accelerator',
}

/**
 * Nothing disappears (spec instruction, same principle as BLOCKED rows) —
 * every row lands in exactly one of these four sections, never dropped.
 * Verdict type takes priority over raw status: a BLOCKED or IRRELEVANT row
 * is "closed off" to the user regardless of the opportunity's own open/
 * closing_soon status, and a LATE_WINDOW row is still actionable even
 * though its underlying status is 'expired'. 'program_specific' with no
 * deadline is background, not an action (bulk-import instruction) — it
 * only overrides a stronger "closed off" or "late window" signal, never
 * the other way around.
 */
function sectionFor(opp: Opportunity, verdict: Verdict | undefined): SectionId {
  if (verdict?.type === 'LATE_WINDOW') return 'live'
  if (verdict?.type === 'BLOCKED' || verdict?.type === 'IRRELEVANT') return 'past'
  if (opp.status === 'expired' || opp.status === 'paused') return 'past'
  if (opp.status === 'program_specific' && !opp.deadline) return 'reference'
  if (opp.status === 'not_yet_open') return 'upcoming'
  return 'live'
}

function DetailPanel({
  opp,
  verdict,
  declined,
  onDecline,
  declining,
}: {
  opp: Opportunity
  verdict: Verdict | undefined
  declined: boolean
  declining: boolean
  onDecline: () => void
}) {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-lg font-medium text-foreground">{opp.title}</p>
            <p className="text-sm text-muted-foreground">{opp.institution}</p>
          </div>
          {verdict && <VerdictBadge verdict={verdict.type} className="shrink-0" />}
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <TierBadge tier={opp.tier} />
          <span>{CATEGORY_LABELS[opp.category]}</span>
          <span>·</span>
          <span>{TRACK_LABELS[opp.track]}</span>
          {opp.deadline && (
            <>
              <span>·</span>
              <span className="font-mono">{formatDeadline(opp.deadline)}</span>
            </>
          )}
        </div>
      </div>

      {verdict?.reason && (
        <div className="space-y-2 rounded-lg border border-border bg-surface-2/60 p-4">
          <p className="text-sm text-foreground">{verdict.reason}</p>
          {verdict.blocking_rule_quote && (
            <div className="flex gap-2 rounded-md bg-background/60 p-3">
              <Quote className="size-3.5 shrink-0 text-faint-foreground" strokeWidth={1.75} />
              <div className="space-y-1">
                <p className="font-mono text-2xs leading-relaxed text-muted-foreground">&ldquo;{verdict.blocking_rule_quote}&rdquo;</p>
                {verdict.blocking_rule_source_url && (
                  <a
                    href={verdict.blocking_rule_source_url}
                    target="_blank"
                    rel="noreferrer"
                    className="font-mono text-2xs text-faint-foreground underline underline-offset-2 hover:text-muted-foreground"
                  >
                    {verdict.blocking_rule_source_url}
                  </a>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {hasAiWritingPolicy(opp.ai_writing_policy) && (
        <p className="flex items-center gap-1.5 text-xs text-verdict-late">
          <PenOff className="size-3.5 shrink-0" strokeWidth={1.75} />
          AI writing policy: {opp.ai_writing_policy}
        </p>
      )}

      {opp.funding && (
        <div className="space-y-1">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Funding</h3>
          <p className="text-sm text-foreground">{formatFunding(opp.funding.stipend) || 'Not stated'}</p>
          {opp.funding.notes && <p className="text-xs text-muted-foreground">{opp.funding.notes}</p>}
        </div>
      )}

      {opp.eligibility_rules.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Eligibility rules</h3>
          <ul className="space-y-2">
            {opp.eligibility_rules.map((r, i) => (
              <li key={i} className="space-y-1 rounded-md border border-border p-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm text-foreground">{r.rule_text}</p>
                  <span
                    className={cn(
                      'shrink-0 rounded border px-1.5 py-0.5 font-mono text-2xs',
                      r.rule_type === 'mechanical' ? 'border-border-strong text-muted-foreground' : 'border-border text-faint-foreground'
                    )}
                  >
                    {r.rule_type}
                  </span>
                </div>
                {r.source_quote && <p className="font-mono text-2xs text-faint-foreground">&ldquo;{r.source_quote}&rdquo;</p>}
              </li>
            ))}
          </ul>
        </div>
      )}

      {opp.requirements.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Requirements</h3>
          <ul className="space-y-1.5">
            {opp.requirements.map((r, i) => (
              <li key={i} className="flex items-center gap-2 text-sm">
                <span className={cn('size-1.5 shrink-0 rounded-full', r.satisfied ? 'bg-verdict-ready' : 'bg-verdict-gap')} />
                <span className={cn(r.satisfied ? 'text-muted-foreground' : 'text-foreground')}>{r.label}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex gap-2 pt-2">
        {opp.apply_url && (
          <Button asChild variant="secondary" className="flex-1">
            <a href={opp.apply_url} target="_blank" rel="noreferrer">
              View programme page
              <ExternalLink className="size-3.5" />
            </a>
          </Button>
        )}
        <Button variant="outline" onClick={onDecline} disabled={declined || declining} className="shrink-0">
          <X className="size-3.5" />
          {declined ? 'Declined' : declining ? 'Declining…' : 'Decline'}
        </Button>
      </div>
    </div>
  )
}

export function PoolView({
  opportunities,
  verdicts,
  applications = [],
}: {
  opportunities: Opportunity[]
  verdicts: Verdict[]
  applications?: Application[]
}) {
  const [query, setQuery] = useState('')
  const [tierFilter, setTierFilter] = useState<Tier | 'all'>('all')
  const [trackFilter, setTrackFilter] = useState<Track | 'all'>('all')
  const [statusFilter, setStatusFilter] = useState<Status | 'all'>('all')
  const [sortKey, setSortKey] = useState<SortKey>('deadline')
  const [collapsed, setCollapsed] = useState<Set<SectionId>>(new Set())
  const [selected, setSelected] = useState<Opportunity | null>(null)
  const [declinedIds, setDeclinedIds] = useState<Set<string>>(
    () => new Set(applications.filter((a) => a.status === 'withdrawn').map((a) => a.opportunity_id))
  )
  const [decliningId, setDecliningId] = useState<string | null>(null)

  const verdictById = useMemo(() => new Map(verdicts.map((v) => [v.opportunity_id, v])), [verdicts])

  const filtered = useMemo(() => {
    let rows = opportunities
    if (tierFilter !== 'all') rows = rows.filter((o) => o.tier === tierFilter)
    if (trackFilter !== 'all') rows = rows.filter((o) => o.track === trackFilter)
    if (statusFilter !== 'all') rows = rows.filter((o) => o.status === statusFilter)
    if (query.trim()) {
      const q = query.toLowerCase()
      rows = rows.filter(
        (o) =>
          o.title.toLowerCase().includes(q) ||
          o.institution.toLowerCase().includes(q) ||
          o.field_tags.some((t) => t.toLowerCase().includes(q))
      )
    }
    return [...rows].sort((a, b) => {
      if (sortKey === 'title') return a.title.localeCompare(b.title)
      if (sortKey === 'tier') return a.tier.localeCompare(b.tier)
      if (!a.deadline) return 1
      if (!b.deadline) return -1
      return a.deadline.localeCompare(b.deadline)
    })
  }, [opportunities, tierFilter, trackFilter, statusFilter, query, sortKey])

  const bySection = useMemo(() => {
    const groups: Record<SectionId, Opportunity[]> = { live: [], upcoming: [], reference: [], past: [] }
    for (const o of filtered) groups[sectionFor(o, verdictById.get(o.id))].push(o)
    return groups
  }, [filtered, verdictById])

  function toggle(id: SectionId) {
    setCollapsed((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function decline(opportunityId: string) {
    setDecliningId(opportunityId)
    try {
      const res = await fetch('/api/applications/decline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ opportunity_id: opportunityId }),
      })
      if (res.ok) setDeclinedIds((prev) => new Set(prev).add(opportunityId))
    } finally {
      setDecliningId(null)
    }
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Pool</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Every opportunity across all nine categories, grouped by where it stands — nothing hidden, everything
          reachable. Click a row for the full case: eligibility rules, quotes, sources.
        </p>
      </header>

      {opportunities.length === 0 ? (
        <EmptyState
          icon={Database}
          title="The pool is empty"
          description="Nothing has been ingested yet. The pool fills from Channel B sweeps, Channel C lab-page monitoring, and manual drops in the Inbox — none of that has run yet."
        />
      ) : (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-48">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-faint-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search title, institution, field..."
                className="h-8 pl-8 text-xs"
              />
            </div>
            <Select value={trackFilter} onValueChange={(v) => setTrackFilter(v as Track | 'all')}>
              <SelectTrigger size="sm" className="h-8 w-40 text-xs">
                <SelectValue placeholder="Track" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All tracks</SelectItem>
                {(Object.keys(TRACK_LABELS) as Track[]).map((t) => (
                  <SelectItem key={t} value={t}>
                    {TRACK_LABELS[t]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as Status | 'all')}>
              <SelectTrigger size="sm" className="h-8 w-36 text-xs">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {(Object.keys(STATUS_LABELS) as Status[]).map((s) => (
                  <SelectItem key={s} value={s}>
                    {STATUS_LABELS[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={tierFilter} onValueChange={(v) => setTierFilter(v as Tier | 'all')}>
              <SelectTrigger size="sm" className="h-8 w-32 text-xs">
                <SelectValue placeholder="Tier" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All tiers</SelectItem>
                <SelectItem value="T1">T1 · Reach</SelectItem>
                <SelectItem value="T2">T2 · Realistic</SelectItem>
                <SelectItem value="T3">T3 · Volume</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sortKey} onValueChange={(v) => setSortKey(v as SortKey)}>
              <SelectTrigger size="sm" className="h-8 w-36 text-xs">
                <ArrowUpDown className="size-3.5" />
                <SelectValue placeholder="Sort" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="deadline">Sort: deadline</SelectItem>
                <SelectItem value="title">Sort: title</SelectItem>
                <SelectItem value="tier">Sort: tier</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {filtered.length === 0 ? (
            <EmptyState icon={Search} title="No matches" description="No row matches this search and filter combination." />
          ) : (
            SECTIONS.map((section) => {
              const rows = bySection[section.id]
              const isCollapsed = collapsed.has(section.id)
              return (
                <div key={section.id} className="space-y-2">
                  <button
                    onClick={() => toggle(section.id)}
                    className="flex w-full items-center gap-2 text-left"
                  >
                    {isCollapsed ? (
                      <ChevronRight className="size-3.5 text-muted-foreground" strokeWidth={1.75} />
                    ) : (
                      <ChevronDown className="size-3.5 text-muted-foreground" strokeWidth={1.75} />
                    )}
                    <h2 className="text-xs font-semibold uppercase tracking-wide text-foreground">{section.label}</h2>
                    <span className="font-mono text-2xs text-muted-foreground">{rows.length}</span>
                    <span className="hidden text-2xs text-faint-foreground sm:inline">{section.description}</span>
                  </button>

                  {!isCollapsed &&
                    (rows.length === 0 ? (
                      <p className="pl-5 text-xs text-faint-foreground">Nothing here.</p>
                    ) : (
                      <div className="overflow-hidden rounded-lg border border-border">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Title</TableHead>
                              <TableHead>Category</TableHead>
                              <TableHead>Institution</TableHead>
                              <TableHead>Tier</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead>Deadline</TableHead>
                              <TableHead>Verdict</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {rows.map((o) => {
                              const v = verdictById.get(o.id)
                              return (
                                <TableRow
                                  key={o.id}
                                  className={cn('cursor-pointer', section.id === 'past' && 'opacity-70')}
                                  onClick={() => setSelected(o)}
                                >
                                  <TableCell className="font-medium text-foreground">
                                    <span className="flex items-center gap-1.5">
                                      {o.title}
                                      {hasAiWritingPolicy(o.ai_writing_policy) && (
                                        <span title={o.ai_writing_policy}>
                                          <PenOff className="size-3 shrink-0 text-verdict-late" strokeWidth={1.75} />
                                        </span>
                                      )}
                                    </span>
                                  </TableCell>
                                  <TableCell className="text-muted-foreground">{CATEGORY_LABELS[o.category]}</TableCell>
                                  <TableCell className="text-muted-foreground">{o.institution}</TableCell>
                                  <TableCell>
                                    <TierBadge tier={o.tier} />
                                  </TableCell>
                                  <TableCell className="text-muted-foreground">{STATUS_LABELS[o.status]}</TableCell>
                                  <TableCell className="font-mono text-xs text-muted-foreground">
                                    {formatDeadline(o.deadline)}
                                  </TableCell>
                                  <TableCell>{v ? <VerdictBadge verdict={v.type as VerdictType} /> : '—'}</TableCell>
                                </TableRow>
                              )
                            })}
                          </TableBody>
                        </Table>
                      </div>
                    ))}
                </div>
              )
            })
          )}
        </div>
      )}

      <Sheet open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <SheetContent className="overflow-y-auto sm:max-w-lg">
          <SheetHeader className="sr-only">
            <SheetTitle>{selected?.title}</SheetTitle>
            <SheetDescription>Opportunity detail</SheetDescription>
          </SheetHeader>
          {selected && (
            <div className="px-4 pb-6">
              <DetailPanel
                opp={selected}
                verdict={verdictById.get(selected.id)}
                declined={declinedIds.has(selected.id)}
                declining={decliningId === selected.id}
                onDecline={() => decline(selected.id)}
              />
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}
