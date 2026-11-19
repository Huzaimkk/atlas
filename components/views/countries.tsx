'use client'

import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { ChevronDown, Globe2, Search } from 'lucide-react'
import type { Application, Opportunity, Track, Verdict, VerdictType } from '@/types/atlas'
import { EmptyState } from '@/components/atlas/empty-state'
import { PageHeader } from '@/components/atlas/page-header'
import { CountUp } from '@/components/atlas/count-up'
import { VerdictBadge } from '@/components/atlas/verdict-badge'
import { OpportunityDetail } from '@/components/views/pool'
import { ApplyButton } from '@/components/atlas/apply-button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { daysUntil, formatDeadline, formatFunding } from '@/lib/atlas-format'
import { disclose, transition } from '@/lib/motion'
import { cn } from '@/lib/utils'

/**
 * The pool, cut by where the opportunity is. `opportunities.country` is
 * free text from several ingest runs ("United States", "US / UK",
 * "Berkeley, US", "United States; Canada"…), so it is normalised here,
 * for display only, into one or more canonical places per row. A row
 * hosted in two countries appears under both — it is never forced into
 * one. Nothing is written back.
 */
const ALIASES: Record<string, string> = {
  us: 'United States',
  usa: 'United States',
  'u.s.': 'United States',
  'united states': 'United States',
  uk: 'United Kingdom',
  'united kingdom': 'United Kingdom',
  uae: 'United Arab Emirates',
  eu: 'Europe (multi-country)',
  'eu multi-country': 'Europe (multi-country)',
  'europe (multi-country)': 'Europe (multi-country)',
  europe: 'Europe (multi-country)',
  'eu and horizon europe associated countries': 'Europe (multi-country)',
  'eu program locations': 'Europe (multi-country)',
  'europe and partner countries': 'Europe (multi-country)',
}
const INTERNATIONAL = 'International'
const NOT_A_PLACE = /^(global|international|remote|multiple|eligible program regions|member-country hosts|other eligible locations|remote \/ international)$/i
const CITY_PREFIX = /^(london|cambridge|berkeley|bangkok|washington dc)$/i

function placesOf(country: string | null | undefined): string[] {
  if (!country) return [INTERNATIONAL]
  const out = new Set<string>()
  for (const raw of country.split(/[;/,]/)) {
    const part = raw.trim()
    if (!part || CITY_PREFIX.test(part)) continue
    if (NOT_A_PLACE.test(part)) {
      out.add(INTERNATIONAL)
      continue
    }
    out.add(ALIASES[part.toLowerCase()] ?? part)
  }
  return out.size > 0 ? [...out] : [INTERNATIONAL]
}

type AreaId = 'universities' | 'funding' | 'industry' | 'founders' | 'events'

const AREAS: { id: AreaId; label: string; tracks: Track[]; blurb: string }[] = [
  { id: 'universities', label: 'Universities', tracks: ['phd_funded', 'gta', 'ra'], blurb: 'Funded PhD programmes and assistantships, grouped by university' },
  { id: 'funding', label: 'Scholarships & fellowships', tracks: ['scholarship', 'fellowship', 'postdoc'], blurb: 'Money that follows the person rather than the department' },
  { id: 'industry', label: 'Industry & research roles', tracks: ['internship'], blurb: 'Internships, residencies and early-career research roles' },
  { id: 'founders', label: 'Founder programmes', tracks: ['accelerator'], blurb: 'Accelerators, founder fellowships and grants' },
  { id: 'events', label: 'Conferences & events', tracks: ['conference'], blurb: 'Calls for papers, conferences and competitions' },
]

// Lower is better: what you would most want to see first for a university.
const VERDICT_RANK: Record<VerdictType, number> = {
  LATE_WINDOW: 0,
  READY: 1,
  GAP: 2,
  UNEXAMINED: 3,
  NOT_YET_OPEN: 3,
  BLOCKED: 4,
  IRRELEVANT: 5,
  EXPIRED: 6,
}

type Row = { opp: Opportunity; verdict: Verdict | undefined; days: number | null }
type SortKey = 'deadline' | 'name' | 'size'

function upcoming(days: number | null): number {
  return days !== null && days >= 0 ? days : Number.POSITIVE_INFINITY
}

function byDeadline(a: Row, b: Row): number {
  const d = upcoming(a.days) - upcoming(b.days)
  if (d !== 0 && Number.isFinite(d)) return d
  if (upcoming(a.days) !== upcoming(b.days)) return upcoming(a.days) === Number.POSITIVE_INFINITY ? 1 : -1
  return a.opp.title.localeCompare(b.opp.title)
}

function Chip({ selected, onClick, children, count, markerId }: { selected: boolean; onClick: () => void; children: React.ReactNode; count?: number; markerId: string }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        'relative shrink-0 rounded-full border px-3.5 py-1.5 text-sm transition-colors duration-150',
        selected ? 'border-transparent text-primary-foreground' : 'border-border text-muted-foreground hover:border-border-strong hover:text-foreground'
      )}
    >
      {selected && <motion.span layoutId={markerId} transition={transition.layout} className="absolute inset-0 rounded-full bg-primary" />}
      <span className="relative">
        {children}
        {count !== undefined && <span className={cn('ml-1.5 font-mono text-2xs tabular-nums', selected ? 'opacity-70' : 'text-faint-foreground')}>{count}</span>}
      </span>
    </button>
  )
}

function OpportunityRow({ row, onOpen }: { row: Row; onOpen: (o: Opportunity) => void }) {
  const { opp, verdict, days } = row
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onOpen(opp)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onOpen(opp)
        }
      }}
      className="grid w-full cursor-pointer grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2 px-5 py-3 text-left transition-colors duration-150 hover:bg-surface-2 sm:grid-cols-[minmax(0,1fr)_9rem_8.5rem_6.5rem]"
    >
      <span className="min-w-0">
        <span className="block truncate text-sm text-foreground">{opp.title}</span>
        <span className="block truncate text-xs text-muted-foreground">
          {opp.funding?.stipend ? formatFunding(opp.funding.stipend) : opp.funding?.tuition === 'covered' ? 'Tuition covered' : opp.institution}
          {opp.verification_level !== 'verified' && <span className="text-faint-foreground"> · {opp.verification_level === 'pattern' ? 'date not confirmed for this cycle' : opp.verification_level}</span>}
        </span>
      </span>
      <span className={cn('hidden text-right font-mono text-xs tabular-nums sm:block', days !== null && days >= 0 && days <= 21 ? 'text-verdict-late' : 'text-muted-foreground')}>
        {opp.deadline ? formatDeadline(opp.deadline) : 'No date'}
      </span>
      <span className="flex justify-end">{verdict ? <VerdictBadge verdict={verdict.type} /> : <span className="text-xs text-faint-foreground">Not checked</span>}</span>
      <span className="col-span-2 flex justify-start sm:col-span-1 sm:justify-end">
        <ApplyButton opp={opp} />
      </span>
    </div>
  )
}

function UniversityCard({ name, rows, open, onToggle, onOpen }: { name: string; rows: Row[]; open: boolean; onToggle: () => void; onOpen: (o: Opportunity) => void }) {
  const best = rows.reduce<Verdict | undefined>((b, r) => (r.verdict && (!b || VERDICT_RANK[r.verdict.type] < VERDICT_RANK[b.type]) ? r.verdict : b), undefined)
  const next = rows.map((r) => r.days).filter((d): d is number => d !== null && d >= 0).sort((a, b) => a - b)[0]
  return (
    <li className="overflow-hidden rounded-lg border border-border bg-surface">
      <button onClick={onToggle} aria-expanded={open} className="flex w-full items-center gap-4 px-5 py-3.5 text-left transition-colors duration-150 hover:bg-surface-2">
        <span className="min-w-0 flex-1">
          <span className="block truncate text-base text-foreground">{name}</span>
          <span className="block text-xs text-muted-foreground">
            {rows.length} {rows.length === 1 ? 'programme' : 'programmes'}
            {next !== undefined && <span className={cn(next <= 21 && 'text-verdict-late')}> · next deadline in {next === 0 ? '0 days' : `${next}d`}</span>}
          </span>
        </span>
        {best && <VerdictBadge verdict={best.type} className="shrink-0" />}
        <motion.span animate={{ rotate: open ? 180 : 0 }} transition={transition.base} className="shrink-0 text-muted-foreground">
          <ChevronDown className="size-4" strokeWidth={1.75} />
        </motion.span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div variants={disclose} initial="closed" animate="open" exit="closed" className="overflow-hidden">
            <div className="divide-y divide-border border-t border-border">
              {rows.map((r) => (
                <OpportunityRow key={r.opp.id} row={r} onOpen={onOpen} />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </li>
  )
}

export function CountriesView({ opportunities, verdicts, applications = [] }: { opportunities: Opportunity[]; verdicts: Verdict[]; applications?: Application[] }) {
  const [country, setCountry] = useState('United States')
  const [area, setArea] = useState<AreaId>('universities')
  const [query, setQuery] = useState('')
  const [datedOnly, setDatedOnly] = useState(false)
  const [openOnly, setOpenOnly] = useState(false)
  const [sort, setSort] = useState<SortKey>('deadline')
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [selected, setSelected] = useState<Opportunity | null>(null)

  const verdictById = useMemo(() => new Map(verdicts.map((v) => [v.opportunity_id, v])), [verdicts])

  const byCountry = useMemo(() => {
    const map = new Map<string, Row[]>()
    for (const opp of opportunities) {
      const row: Row = { opp, verdict: verdictById.get(opp.id), days: daysUntil(opp.deadline) }
      for (const place of placesOf(opp.country)) {
        if (!map.has(place)) map.set(place, [])
        map.get(place)!.push(row)
      }
    }
    return map
  }, [opportunities, verdictById])

  const countries = useMemo(() => [...byCountry.entries()].map(([name, rows]) => ({ name, count: rows.length })).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name)), [byCountry])

  // The default is the United States; if this pool has none, fall back to its largest country.
  const activeCountry = byCountry.has(country) ? country : (countries[0]?.name ?? country)
  const countryRows = useMemo(() => byCountry.get(activeCountry) ?? [], [byCountry, activeCountry])

  const stats = useMemo(() => {
    const count = (fn: (r: Row) => boolean) => countryRows.filter(fn).length
    return [
      { label: 'Ready', color: 'var(--verdict-ready)', value: count((r) => r.verdict?.type === 'READY' || r.verdict?.type === 'LATE_WINDOW') },
      { label: 'Gap', color: 'var(--verdict-gap)', value: count((r) => r.verdict?.type === 'GAP' && !r.verdict.verification_required) },
      { label: 'Pending verification', color: 'var(--verdict-gap)', hollow: true, value: count((r) => r.verdict?.type === 'GAP' && !!r.verdict.verification_required) },
      { label: 'Unexamined', color: 'var(--verdict-unexamined)', value: count((r) => r.verdict?.type === 'UNEXAMINED') },
      { label: 'Not yet open', color: 'var(--verdict-watch)', value: count((r) => r.verdict?.type === 'NOT_YET_OPEN') },
      { label: 'Blocked', color: 'var(--verdict-blocked)', value: count((r) => r.verdict?.type === 'BLOCKED' || r.verdict?.type === 'IRRELEVANT') },
      { label: 'Expired', color: 'var(--verdict-expired)', value: count((r) => r.verdict?.type === 'EXPIRED') },
    ]
  }, [countryRows])
  const closingSoon = countryRows.filter((r) => r.days !== null && r.days >= 0 && r.days <= 30 && r.verdict && ['READY', 'GAP', 'LATE_WINDOW', 'UNEXAMINED'].includes(r.verdict.type)).length

  const areaCounts = useMemo(() => new Map(AREAS.map((a) => [a.id, countryRows.filter((r) => a.tracks.includes(r.opp.track)).length])), [countryRows])
  const activeArea = AREAS.find((a) => a.id === area)!

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    return countryRows
      .filter((r) => activeArea.tracks.includes(r.opp.track))
      .filter((r) => !datedOnly || !!r.opp.deadline)
      .filter((r) => !openOnly || (r.verdict ? ['READY', 'GAP', 'LATE_WINDOW', 'NOT_YET_OPEN', 'UNEXAMINED'].includes(r.verdict.type) : true))
      .filter((r) => !q || r.opp.title.toLowerCase().includes(q) || r.opp.institution.toLowerCase().includes(q) || r.opp.field_tags.some((t) => t.toLowerCase().includes(q)))
      .sort(byDeadline)
  }, [countryRows, activeArea, datedOnly, openOnly, query])

  const universities = useMemo(() => {
    const groups = new Map<string, Row[]>()
    for (const r of rows) {
      if (!groups.has(r.opp.institution)) groups.set(r.opp.institution, [])
      groups.get(r.opp.institution)!.push(r)
    }
    const list = [...groups.entries()].map(([name, group]) => ({ name, rows: group, next: Math.min(...group.map((r) => upcoming(r.days))) }))
    return list.sort((a, b) => {
      if (sort === 'name') return a.name.localeCompare(b.name)
      if (sort === 'size') return b.rows.length - a.rows.length || a.name.localeCompare(b.name)
      if (a.next !== b.next) return a.next - b.next
      return a.name.localeCompare(b.name)
    })
  }, [rows, sort])

  function toggleUniversity(name: string) {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(name)) next.delete(name)
      else next.add(name)
      return next
    })
  }

  if (opportunities.length === 0) {
    return (
      <div className="space-y-8">
        <PageHeader title="By country" description="Every opportunity, grouped by where it is." />
        <EmptyState icon={Globe2} title="No opportunities yet" description="Countries appear here once opportunities have been verified against their official pages." />
      </div>
    )
  }

  const total = countryRows.length

  return (
    <div className="space-y-7">
      <PageHeader title="By country" description="Every opportunity, grouped by where it is. Pick a country, then the kind of thing you are looking for.">
        <p className="font-mono text-xs text-faint-foreground">{countries.length} places</p>
      </PageHeader>

      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        {countries.map((c) => (
          <Chip
            key={c.name}
            selected={c.name === activeCountry}
            onClick={() => {
              setCountry(c.name)
              setExpanded(new Set())
            }}
            count={c.count}
            markerId="country-marker"
          >
            {c.name}
          </Chip>
        ))}
      </div>

      <section className="space-y-4 rounded-lg border border-border bg-surface p-6">
        <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
          <h2 className="display text-2xl text-foreground">{activeCountry}</h2>
          <p className="text-sm text-muted-foreground">
            <CountUp value={total} className="font-mono text-foreground" /> opportunities
            {closingSoon > 0 && (
              <>
                , <span className="font-mono text-verdict-late">{closingSoon}</span> closing within 30 days
              </>
            )}
          </p>
        </div>
        <div className="flex h-2 w-full gap-0.5 overflow-hidden rounded-full" role="img" aria-label={stats.map((s) => `${s.value} ${s.label}`).join(', ')}>
          {stats
            .filter((s) => s.value > 0)
            .map((s) => (
              <motion.div
                key={`${activeCountry}-${s.label}`}
                className="h-full min-w-1"
                style={{ background: s.hollow ? `repeating-linear-gradient(135deg, ${s.color} 0 3px, transparent 3px 6px)` : s.color }}
                initial={{ flexGrow: 0 }}
                animate={{ flexGrow: s.value }}
                transition={transition.slow}
              />
            ))}
        </div>
        <dl className="flex flex-wrap gap-x-6 gap-y-2">
          {stats.map((s) => (
            <div key={s.label} className={cn('flex items-center gap-2 text-xs', s.value === 0 && 'opacity-45')}>
              <span className="size-2 rounded-full" style={{ background: s.hollow ? 'transparent' : s.color, boxShadow: s.hollow ? `inset 0 0 0 1.5px ${s.color}` : undefined }} />
              <dt className="text-muted-foreground">{s.label}</dt>
              <dd className="font-mono text-foreground tabular-nums">{s.value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <div className="space-y-4">
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
          {AREAS.map((a) => (
            <Chip key={a.id} selected={a.id === area} onClick={() => setArea(a.id)} count={areaCounts.get(a.id) ?? 0} markerId="area-marker">
              {a.label}
            </Chip>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
          <div className="relative min-w-56 flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-faint-foreground" />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={area === 'universities' ? 'Search a university, programme or field' : 'Search a name or field'} className="h-9 pl-8 text-sm" />
          </div>
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <Switch checked={datedOnly} onCheckedChange={setDatedOnly} />
            Has a deadline
          </label>
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <Switch checked={openOnly} onCheckedChange={setOpenOnly} />
            Still possible for me
          </label>
          {area === 'universities' && (
            <div className="flex items-center gap-1 rounded-md border border-border p-0.5 text-xs">
              {(
                [
                  ['deadline', 'Soonest'],
                  ['name', 'A–Z'],
                  ['size', 'Most programmes'],
                ] as [SortKey, string][]
              ).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setSort(key)}
                  aria-pressed={sort === key}
                  className={cn('rounded px-2.5 py-1 transition-colors duration-150', sort === key ? 'bg-surface-3 text-foreground' : 'text-muted-foreground hover:text-foreground')}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>

        <p className="text-xs text-faint-foreground">
          {activeArea.blurb}.{' '}
          {area === 'universities' ? `${universities.length} ${universities.length === 1 ? 'university' : 'universities'}, ${rows.length} ${rows.length === 1 ? 'programme' : 'programmes'}.` : `${rows.length} shown.`}
        </p>

        {rows.length === 0 ? (
          <EmptyState icon={Search} title="Nothing here with these filters" description={`No ${activeArea.label.toLowerCase()} in ${activeCountry} match. Turn a filter off or clear the search.`} />
        ) : area === 'universities' ? (
          <ul className="space-y-2">
            {universities.map((u) => (
              <UniversityCard key={u.name} name={u.name} rows={u.rows} open={expanded.has(u.name)} onToggle={() => toggleUniversity(u.name)} onOpen={setSelected} />
            ))}
          </ul>
        ) : (
          <div className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-surface">
            {rows.map((r) => (
              <OpportunityRow key={r.opp.id} row={r} onOpen={setSelected} />
            ))}
          </div>
        )}
      </div>

      <Sheet open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <SheetContent className="overflow-y-auto sm:max-w-lg">
          <SheetHeader className="sr-only">
            <SheetTitle>{selected?.title}</SheetTitle>
            <SheetDescription>Opportunity detail</SheetDescription>
          </SheetHeader>
          {selected && (
            <div className="px-4 pb-6 pt-10">
              <OpportunityDetail opp={selected} verdict={verdictById.get(selected.id)} application={applications.find((a) => a.opportunity_id === selected.id)} />
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}
