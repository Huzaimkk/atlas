'use client'

import { useMemo, useState } from 'react'
import { Compass } from 'lucide-react'
import type { Category, Opportunity, Verdict } from '@/types/atlas'
import { EmptyState } from '@/components/atlas/empty-state'
import { VerdictBadge, TierBadge } from '@/components/atlas/verdict-badge'
import { formatDeadline } from '@/lib/atlas-format'
import { cn } from '@/lib/utils'

/**
 * Spec §4.3's five groups are a navigation convenience over the existing
 * nine DB categories (types/atlas.ts CATEGORY_LABELS), not a new taxonomy —
 * every category appears in exactly one group below.
 */
const SECTIONS: { slug: string; label: string; categories: Category[] }[] = [
  { slug: 'conferences-cfps', label: 'Conferences & CFPs', categories: [7] },
  { slug: 'phd-masters', label: "PhD & master's", categories: [2, 3] },
  { slug: 'research-directions', label: 'Research directions', categories: [1, 4, 5, 8] },
  { slug: 'founder-vc', label: 'Founder & VC', categories: [6] },
  { slug: 'events-travel', label: 'Events & travel', categories: [9] },
]

export function SectionsView({ opportunities, verdicts }: { opportunities: Opportunity[]; verdicts: Verdict[] }) {
  const [active, setActive] = useState(SECTIONS[0].slug)
  const verdictById = useMemo(() => new Map(verdicts.map((v) => [v.opportunity_id, v])), [verdicts])

  const countBySection = useMemo(() => {
    const counts = new Map<string, number>()
    for (const section of SECTIONS) {
      counts.set(section.slug, opportunities.filter((o) => section.categories.includes(o.category)).length)
    }
    return counts
  }, [opportunities])

  const section = SECTIONS.find((s) => s.slug === active)!
  const rows = useMemo(
    () =>
      opportunities
        .filter((o) => section.categories.includes(o.category))
        .sort((a, b) => {
          if (!a.deadline) return 1
          if (!b.deadline) return -1
          return a.deadline.localeCompare(b.deadline)
        }),
    [opportunities, section]
  )

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Browse by type</h1>
        <p className="mt-1 text-sm text-muted-foreground">The pool, organized the way you'd actually look for it.</p>
      </header>

      <div className="flex flex-wrap gap-2">
        {SECTIONS.map((s) => (
          <button
            key={s.slug}
            onClick={() => setActive(s.slug)}
            className={cn(
              'rounded-full border px-3.5 py-1.5 text-sm transition-colors',
              active === s.slug
                ? 'border-primary bg-primary/15 text-foreground'
                : 'border-border text-muted-foreground hover:border-border-strong hover:text-foreground'
            )}
          >
            {s.label}
            <span className="ml-1.5 font-mono text-2xs text-faint-foreground">{countBySection.get(s.slug)}</span>
          </button>
        ))}
      </div>

      {rows.length === 0 ? (
        <EmptyState
          icon={Compass}
          title={`Nothing in ${section.label} yet`}
          description="This section fills as the pool grows — nothing has landed here yet."
        />
      ) : (
        <ul className="divide-y divide-border rounded-lg border border-border">
          {rows.map((o) => {
            const v = verdictById.get(o.id)
            return (
              <li key={o.id} className="flex items-center gap-4 px-4 py-3.5">
                <div className="min-w-0 flex-1 space-y-0.5">
                  <p className="truncate text-sm font-medium text-foreground">{o.title}</p>
                  <p className="truncate text-xs text-muted-foreground">{o.institution}</p>
                </div>
                <TierBadge tier={o.tier} className="shrink-0" />
                <span className="hidden w-28 shrink-0 text-right font-mono text-xs text-muted-foreground sm:inline">
                  {formatDeadline(o.deadline)}
                </span>
                {v ? <VerdictBadge verdict={v.type} className="shrink-0" /> : null}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
