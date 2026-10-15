'use client'

import { useMemo, useState } from 'react'
import {
  Home as HomeIcon,
  ListChecks,
  Target,
  Database,
  RadioTower,
  Inbox as InboxIcon,
  UserCircle,
  Archive as ArchiveIcon,
  FlaskConical,
  AlertTriangle,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Switch } from '@/components/ui/switch'
import {
  mockOpportunities,
  mockVerdicts,
  mockAggregatedGaps,
  mockWatchlist,
  mockInbox,
  mockProfile,
  mockArchive,
} from '@/data/mock/atlas-mock'
import type { AtlasData } from '@/lib/fetch-atlas-data'
import { daysUntil } from '@/lib/atlas-format'
import { CommandBar } from '@/components/atlas/command-bar'
import { HomeView } from '@/components/views/home'
import { ActionQueueView } from '@/components/views/action-queue'
import { GapQueueView } from '@/components/views/gap-queue'
import { PoolView } from '@/components/views/pool'
import { WatchlistView } from '@/components/views/watchlist'
import { InboxView } from '@/components/views/inbox'
import { ProfileView } from '@/components/views/profile'
import { ArchiveView } from '@/components/views/archive'

const VIEWS = [
  { id: 'home', label: 'Home', icon: HomeIcon },
  { id: 'action-queue', label: 'Action Queue', icon: ListChecks },
  { id: 'gap-queue', label: 'Gap Queue', icon: Target },
  { id: 'pool', label: 'Pool', icon: Database },
  { id: 'watchlist', label: 'Watchlist', icon: RadioTower },
  { id: 'inbox', label: 'Inbox', icon: InboxIcon },
  { id: 'profile', label: 'Profile', icon: UserCircle },
  { id: 'archive', label: 'Archive', icon: ArchiveIcon },
] as const

type ViewId = (typeof VIEWS)[number]['id']

const URGENT_DAYS = 14

const EMPTY: AtlasData = { opportunities: [], verdicts: [], gaps: [], watchlist: [], inbox: [], profile: null, archive: [] }

/**
 * `realData` comes from a server-side Supabase read (RLS denies the anon
 * key entirely — see lib/fetch-atlas-data.ts). The "Mock data" toggle
 * previews the fixture in data/mock/atlas-mock.ts instead; it defaults
 * off, so the real pool is what's shown by default.
 */
export function AppShell({ realData }: { realData?: AtlasData }) {
  const [active, setActive] = useState<ViewId>('home')
  const [preview, setPreview] = useState(false)

  const live = realData ?? EMPTY
  const opportunities = preview ? mockOpportunities : live.opportunities
  const verdicts = preview ? mockVerdicts : live.verdicts
  const gaps = preview ? mockAggregatedGaps : live.gaps
  const watchlist = preview ? mockWatchlist : live.watchlist
  const inbox = preview ? mockInbox : live.inbox
  const archive = preview ? mockArchive : live.archive
  const profile = preview ? mockProfile : live.profile

  // Deadline alerting (Phase D): a row inside 14 days surfaces hard —
  // Knight-Hennessy closed while sitting in the pool with nothing warning
  // about it. LATE_WINDOW rows count regardless of their raw day count
  // (their whole point is a deadline that's already technically passed);
  // every other row needs a real, non-negative day count inside the
  // window. EXPIRED/BLOCKED/IRRELEVANT are excluded — nothing to act on.
  const urgent = useMemo(() => {
    const verdictById = new Map(verdicts.map((v) => [v.opportunity_id, v]))
    return opportunities
      .map((o) => ({ opp: o, verdict: verdictById.get(o.id), days: daysUntil(o.deadline) }))
      .filter(({ verdict, days }) => {
        if (!verdict || !['READY', 'GAP', 'LATE_WINDOW'].includes(verdict.type)) return false
        if (verdict.type === 'LATE_WINDOW') return true
        return days !== null && days >= 0 && days <= URGENT_DAYS
      })
      .sort((a, b) => (a.days ?? 0) - (b.days ?? 0))
  }, [opportunities, verdicts])

  return (
    <div className="flex h-screen w-full overflow-hidden">
      <aside className="flex w-56 shrink-0 flex-col border-r border-border bg-surface">
        <div className="flex items-center gap-2 px-4 py-4">
          <div className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground font-mono text-xs font-bold">
            A
          </div>
          <span className="text-sm font-semibold tracking-tight">Atlas</span>
        </div>

        <div className="px-2 pb-2">
          <CommandBar />
        </div>

        <nav className="flex-1 space-y-0.5 px-2">
          {VIEWS.map((view) => {
            const Icon = view.icon
            const isActive = active === view.id
            return (
              <button
                key={view.id}
                onClick={() => setActive(view.id)}
                className={cn(
                  'flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-sm transition-colors',
                  isActive
                    ? 'bg-surface-2 text-foreground'
                    : 'text-muted-foreground hover:bg-surface-2/60 hover:text-foreground'
                )}
              >
                <Icon className="size-4" strokeWidth={1.75} />
                <span className="flex-1">{view.label}</span>
                {view.id === 'action-queue' && urgent.length > 0 && (
                  <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-verdict-late text-2xs font-semibold text-white">
                    {urgent.length}
                  </span>
                )}
              </button>
            )
          })}
        </nav>

        <div className="flex items-center justify-between gap-2 border-t border-border px-3 py-3">
          <label htmlFor="preview-toggle" className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <FlaskConical className="size-3.5" strokeWidth={1.75} />
            Mock data
          </label>
          <Switch id="preview-toggle" checked={preview} onCheckedChange={setPreview} />
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto">
        {urgent.length > 0 && (
          <div className="sticky top-0 z-10 flex items-center gap-2 border-b border-verdict-late/30 bg-verdict-late-bg px-8 py-2 text-xs text-verdict-late">
            <AlertTriangle className="size-3.5 shrink-0" strokeWidth={1.75} />
            <span className="font-medium">
              {urgent.length} row{urgent.length === 1 ? '' : 's'} inside {URGENT_DAYS} days:
            </span>
            <span className="truncate">
              {urgent
                .slice(0, 3)
                .map((u) => (u.verdict?.type === 'LATE_WINDOW' ? `${u.opp.title} (late window)` : `${u.opp.title} (${u.days}d)`))
                .join(' · ')}
              {urgent.length > 3 ? ` · +${urgent.length - 3} more` : ''}
            </span>
          </div>
        )}
        <div className="mx-auto max-w-6xl px-8 py-8">
          {active === 'home' && <HomeView profile={profile} opportunities={opportunities} verdicts={verdicts} />}
          {active === 'action-queue' && <ActionQueueView opportunities={opportunities} verdicts={verdicts} />}
          {active === 'gap-queue' && <GapQueueView gaps={gaps} />}
          {active === 'pool' && <PoolView opportunities={opportunities} verdicts={verdicts} />}
          {active === 'watchlist' && <WatchlistView labs={watchlist} />}
          {active === 'inbox' && <InboxView leads={inbox} />}
          {active === 'profile' && <ProfileView profile={profile} />}
          {active === 'archive' && <ArchiveView entries={archive} />}
        </div>
      </main>
    </div>
  )
}
