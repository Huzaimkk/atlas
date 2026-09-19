'use client'

import { useState } from 'react'
import {
  ListChecks,
  Target,
  Database,
  RadioTower,
  Inbox as InboxIcon,
  UserCircle,
  Archive as ArchiveIcon,
  FlaskConical,
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
import { ActionQueueView } from '@/components/views/action-queue'
import { GapQueueView } from '@/components/views/gap-queue'
import { PoolView } from '@/components/views/pool'
import { WatchlistView } from '@/components/views/watchlist'
import { InboxView } from '@/components/views/inbox'
import { ProfileView } from '@/components/views/profile'
import { ArchiveView } from '@/components/views/archive'

const VIEWS = [
  { id: 'action-queue', label: 'Action Queue', icon: ListChecks },
  { id: 'gap-queue', label: 'Gap Queue', icon: Target },
  { id: 'pool', label: 'Pool', icon: Database },
  { id: 'watchlist', label: 'Watchlist', icon: RadioTower },
  { id: 'inbox', label: 'Inbox', icon: InboxIcon },
  { id: 'profile', label: 'Profile', icon: UserCircle },
  { id: 'archive', label: 'Archive', icon: ArchiveIcon },
] as const

type ViewId = (typeof VIEWS)[number]['id']

export function AppShell() {
  const [active, setActive] = useState<ViewId>('action-queue')
  const [preview, setPreview] = useState(false)

  const opportunities = preview ? mockOpportunities : []
  const verdicts = preview ? mockVerdicts : []
  const gaps = preview ? mockAggregatedGaps : []
  const watchlist = preview ? mockWatchlist : []
  const inbox = preview ? mockInbox : []
  const archive = preview ? mockArchive : []
  const profile = preview ? mockProfile : null

  return (
    <div className="flex h-screen w-full overflow-hidden">
      <aside className="flex w-56 shrink-0 flex-col border-r border-border bg-surface">
        <div className="flex items-center gap-2 px-4 py-4">
          <div className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground font-mono text-xs font-bold">
            A
          </div>
          <span className="text-sm font-semibold tracking-tight">Atlas</span>
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
                {view.label}
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
        <div className="mx-auto max-w-6xl px-8 py-8">
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
