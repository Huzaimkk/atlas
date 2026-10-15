'use client'

import { useMemo, useState } from 'react'
import { ArrowUpDown, ChevronDown, ChevronRight, Database, Search } from 'lucide-react'
import { CATEGORY_LABELS, type Opportunity, type Tier, type Verdict, type VerdictType } from '@/types/atlas'
import { EmptyState } from '@/components/atlas/empty-state'
import { VerdictBadge, TierBadge } from '@/components/atlas/verdict-badge'
import { formatDeadline, STATUS_LABELS } from '@/lib/atlas-format'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
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

type SortKey = 'title' | 'deadline' | 'tier'
type SectionId = 'live' | 'upcoming' | 'past'

const SECTIONS: { id: SectionId; label: string; description: string }[] = [
  { id: 'live', label: 'Live', description: 'Open, closing soon, or in a late-application window' },
  { id: 'upcoming', label: 'Upcoming', description: 'Not yet open' },
  { id: 'past', label: 'Past', description: 'Expired, blocked, or marked irrelevant — kept visible, not deleted' },
]

/**
 * Nothing disappears (spec instruction, same principle as BLOCKED rows) —
 * every row lands in exactly one of these three sections, never dropped.
 * Verdict type takes priority over raw status: a BLOCKED or IRRELEVANT row
 * is "closed off" to the user regardless of the opportunity's own open/
 * closing_soon status, and a LATE_WINDOW row is still actionable even
 * though its underlying status is 'expired'.
 */
function sectionFor(opp: Opportunity, verdict: Verdict | undefined): SectionId {
  if (verdict?.type === 'LATE_WINDOW') return 'live'
  if (verdict?.type === 'BLOCKED' || verdict?.type === 'IRRELEVANT') return 'past'
  if (opp.status === 'expired') return 'past'
  if (opp.status === 'not_yet_open') return 'upcoming'
  return 'live'
}

export function PoolView({ opportunities, verdicts }: { opportunities: Opportunity[]; verdicts: Verdict[] }) {
  const [query, setQuery] = useState('')
  const [tierFilter, setTierFilter] = useState<Tier | 'all'>('all')
  const [sortKey, setSortKey] = useState<SortKey>('deadline')
  const [collapsed, setCollapsed] = useState<Set<SectionId>>(new Set())

  const verdictById = new Map(verdicts.map((v) => [v.opportunity_id, v]))

  const filtered = useMemo(() => {
    let rows = opportunities
    if (tierFilter !== 'all') rows = rows.filter((o) => o.tier === tierFilter)
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
  }, [opportunities, tierFilter, query, sortKey])

  const bySection = useMemo(() => {
    const groups: Record<SectionId, Opportunity[]> = { live: [], upcoming: [], past: [] }
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

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Pool</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Every opportunity across all nine categories, grouped by where it stands — nothing hidden, everything
          reachable.
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
                                <TableRow key={o.id} className={cn(section.id === 'past' && 'opacity-70')}>
                                  <TableCell className="font-medium text-foreground">{o.title}</TableCell>
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
    </div>
  )
}
