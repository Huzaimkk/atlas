'use client'

import { useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { AnimatePresence, motion } from 'motion/react'
import {
  AlertTriangle,
  Archive as ArchiveIcon,
  CalendarCheck,
  ChevronsUpDown,
  ClipboardList,
  Compass,
  Database,
  FileUp,
  Gauge,
  Globe2,
  Inbox as InboxIcon,
  ListChecks,
  LogOut,
  Mail,
  Menu,
  MessagesSquare,
  RadioTower,
  Settings as SettingsIcon,
  Target,
  UserCircle,
  Users,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { transition, viewSwap } from '@/lib/motion'
import type { AtlasData } from '@/lib/fetch-atlas-data'
import { daysUntil } from '@/lib/atlas-format'
import { AtlasWordmark } from '@/components/atlas/brand'
import { ReadOnlyProvider } from '@/components/atlas/read-only'
import { CommandBar } from '@/components/atlas/command-bar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { TodayView } from '@/components/views/today'
import { HomeView } from '@/components/views/home'
import { ActionQueueView } from '@/components/views/action-queue'
import { ApplicationsView } from '@/components/views/applications'
import { GapQueueView } from '@/components/views/gap-queue'
import { PoolView } from '@/components/views/pool'
import { SectionsView } from '@/components/views/sections'
import { CountriesView } from '@/components/views/countries'
import { WatchlistView } from '@/components/views/watchlist'
import { InboxView } from '@/components/views/inbox'
import { ProfileView } from '@/components/views/profile'
import { CvIntakeView } from '@/components/views/cv-intake'
import { ArchiveView } from '@/components/views/archive'
import { SettingsView } from '@/components/views/settings'
import { ComingSoonView } from '@/components/views/coming-soon'

/**
 * Navigation is the product's vocabulary. Labels here are what a person
 * new to Atlas would call the thing, and each view's page title repeats
 * its label exactly — one name per surface, everywhere.
 *
 * `soon` marks the three surfaces that are real routes with placeholder
 * internals (product spec §8, P2): they are shown, never hidden, and say
 * plainly that they aren't available yet.
 */
type ViewId =
  | 'today'
  | 'home'
  | 'action-queue'
  | 'gap-queue'
  | 'applications'
  | 'pool'
  | 'countries'
  | 'sections'
  | 'watchlist'
  | 'inbox'
  | 'archive'
  | 'profile'
  | 'cv'
  | 'interview'
  | 'email'
  | 'network'
  | 'settings'

interface NavItem {
  id: ViewId
  label: string
  icon: LucideIcon
  soon?: boolean
}

const NAV: { label?: string; items: NavItem[] }[] = [
  {
    items: [
      { id: 'today', label: 'Today', icon: CalendarCheck },
      { id: 'home', label: 'Overview', icon: Gauge },
    ],
  },
  {
    label: 'Act',
    items: [
      { id: 'action-queue', label: 'Ready to apply', icon: ListChecks },
      { id: 'gap-queue', label: 'Gaps to close', icon: Target },
      { id: 'applications', label: 'Applications', icon: ClipboardList },
    ],
  },
  {
    label: 'Opportunities',
    items: [
      { id: 'pool', label: 'All opportunities', icon: Database },
      { id: 'countries', label: 'By country', icon: Globe2 },
      { id: 'sections', label: 'Browse by type', icon: Compass },
      { id: 'watchlist', label: 'Watchlist', icon: RadioTower },
      { id: 'inbox', label: 'Inbox', icon: InboxIcon },
      { id: 'archive', label: 'Archive', icon: ArchiveIcon },
    ],
  },
  {
    label: 'You',
    items: [
      { id: 'profile', label: 'Profile', icon: UserCircle },
      { id: 'cv', label: 'CV intake', icon: FileUp },
      { id: 'interview', label: 'Intake interview', icon: MessagesSquare, soon: true },
    ],
  },
  {
    label: 'Outreach',
    items: [
      { id: 'email', label: 'Email drafts', icon: Mail, soon: true },
      { id: 'network', label: 'Network', icon: Users, soon: true },
    ],
  },
]

const VIEW_IDS = new Set<string>([...NAV.flatMap((g) => g.items.map((i) => i.id)), 'settings'])

const URGENT_DAYS = 14

const EMPTY: AtlasData = {
  opportunities: [],
  verdicts: [],
  gaps: [],
  actions: [],
  watchlist: [],
  inbox: [],
  profile: null,
  archive: [],
  applications: [],
  gapClosures: [],
  referees: [],
  missedDeadlines: [],
}

function SidebarNav({
  active,
  onNavigate,
  counts,
  markerId,
}: {
  active: ViewId
  onNavigate: (id: ViewId) => void
  counts: Partial<Record<ViewId, { value: number; urgent?: boolean }>>
  markerId: string
}) {
  return (
    <nav aria-label="Main" className="flex-1 space-y-5 overflow-y-auto px-2 pb-4">
      {NAV.map((group, gi) => (
        <div key={group.label ?? gi} className="space-y-0.5">
          {group.label && <p className="px-2.5 pb-1 text-xs text-faint-foreground">{group.label}</p>}
          {group.items.map((item) => {
            const Icon = item.icon
            const isActive = active === item.id
            const count = counts[item.id]
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                aria-current={isActive ? 'page' : undefined}
                className={cn(
                  'relative flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-left text-sm transition-colors duration-150',
                  isActive ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {/* One marker, shared across items — it slides to whichever is active. */}
                {isActive && (
                  <motion.span
                    layoutId={markerId}
                    transition={transition.layout}
                    className="absolute inset-0 rounded-md bg-surface-2 ring-1 ring-inset ring-border"
                  />
                )}
                <Icon className="relative size-4 shrink-0" strokeWidth={1.6} />
                <span className="relative flex-1 truncate">{item.label}</span>
                {item.soon && <span className="relative text-2xs text-faint-foreground">Soon</span>}
                {count && count.value > 0 && (
                  <span
                    className={cn(
                      'relative min-w-5 rounded-full px-1.5 text-center font-mono text-2xs tabular-nums',
                      count.urgent ? 'bg-verdict-late-bg text-verdict-late' : 'text-faint-foreground'
                    )}
                  >
                    {count.value}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      ))}
    </nav>
  )
}

function AccountMenu({
  email,
  demo,
  onSettings,
}: {
  email: string | null
  demo: boolean
  onSettings: () => void
}) {
  const router = useRouter()
  const [signingOut, setSigningOut] = useState(false)

  async function signOut() {
    setSigningOut(true)
    await fetch('/api/auth/sign-out', { method: 'POST' })
    router.push('/sign-in')
  }

  if (demo) {
    return (
      <div className="space-y-2 border-t border-border p-3">
        <p className="text-xs text-muted-foreground">Sample data. Nothing you do here is saved.</p>
        <Link
          href="/sign-in"
          className="flex h-8 items-center justify-center rounded-md bg-primary text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
        >
          Create your account
        </Link>
      </div>
    )
  }

  const initial = (email ?? '?').charAt(0).toUpperCase()
  return (
    <div className="border-t border-border p-2">
      <DropdownMenu>
        <DropdownMenuTrigger className="flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-surface-2 data-[state=open]:bg-surface-2">
          <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-surface-3 text-xs font-medium text-foreground">
            {initial}
          </span>
          <span className="min-w-0 flex-1 truncate text-sm text-muted-foreground">{email ?? 'Signed in'}</span>
          <ChevronsUpDown className="size-3.5 shrink-0 text-faint-foreground" strokeWidth={1.75} />
        </DropdownMenuTrigger>
        <DropdownMenuContent side="top" align="start" className="w-56">
          <DropdownMenuLabel className="truncate text-xs font-normal text-muted-foreground">{email ?? 'Signed in'}</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={onSettings}>
            <SettingsIcon className="size-4" strokeWidth={1.6} />
            Settings
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={signOut} disabled={signingOut}>
            <LogOut className="size-4" strokeWidth={1.6} />
            {signingOut ? 'Signing out…' : 'Sign out'}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

/**
 * `data` comes from a server-side Supabase read scoped to the signed-in
 * user (app/dashboard/page.tsx), or from the date-rebased fixture when
 * `demo` is set (app/demo/page.tsx). The shell itself never fetches.
 *
 * The active view lives in the URL (?view=…), so a refresh, the back
 * button, and a shared link all land where you were. It is changed with
 * history.pushState rather than the router on purpose: a router
 * navigation would re-run the dashboard's server fetch on every click.
 */
export function AppShell({ data, email = null, demo = false }: { data?: AtlasData; email?: string | null; demo?: boolean }) {
  const pathname = usePathname()
  const params = useSearchParams()
  const mainRef = useRef<HTMLElement>(null)
  const [mobileOpen, setMobileOpen] = useState(false)

  const requested = params.get('view')
  const active: ViewId = requested && VIEW_IDS.has(requested) ? (requested as ViewId) : 'today'

  function navigate(id: ViewId) {
    setMobileOpen(false)
    if (id === active) return
    const next = new URLSearchParams(params.toString())
    if (id === 'today') next.delete('view')
    else next.set('view', id)
    const qs = next.toString()
    window.history.pushState(null, '', qs ? `${pathname}?${qs}` : pathname)
    mainRef.current?.scrollTo({ top: 0 })
  }

  const { opportunities, verdicts, gaps, actions, watchlist, inbox, archive, profile, applications, gapClosures, referees, missedDeadlines, loadErrors = [] } =
    data ?? EMPTY

  // Deadline alerting: a row inside 14 days surfaces hard. LATE_WINDOW
  // rows count regardless of their raw day count (their whole point is a
  // deadline that has technically passed); every other row needs a real,
  // non-negative day count inside the window. EXPIRED / BLOCKED /
  // IRRELEVANT are excluded — nothing to act on.
  const urgent = useMemo(() => {
    const verdictById = new Map(verdicts.map((v) => [v.opportunity_id, v]))
    return opportunities
      .map((o) => ({ opp: o, verdict: verdictById.get(o.id), days: daysUntil(o.deadline) }))
      .filter(({ verdict, days }) => {
        if (!verdict || !['READY', 'GAP', 'LATE_WINDOW', 'UNEXAMINED'].includes(verdict.type)) return false
        if (verdict.type === 'LATE_WINDOW') return true
        return days !== null && days >= 0 && days <= URGENT_DAYS
      })
      .sort((a, b) => (a.days ?? 0) - (b.days ?? 0))
  }, [opportunities, verdicts])

  const counts = useMemo(() => {
    const ready = verdicts.filter((v) => v.type === 'READY' || v.type === 'LATE_WINDOW').length
    return {
      today: { value: urgent.length, urgent: true },
      'action-queue': { value: ready },
      'gap-queue': { value: gaps.length },
      inbox: { value: inbox.length },
    } satisfies Partial<Record<ViewId, { value: number; urgent?: boolean }>>
  }, [verdicts, gaps, inbox, urgent])

  const sidebar = (markerId: string, withCommandBar: boolean) => (
    <>
      <div className="flex h-14 shrink-0 items-center px-4">
        <Link href={demo ? '/' : '/dashboard'} aria-label="Atlas home">
          <AtlasWordmark />
        </Link>
      </div>
      {/* Mounted once (desktop only): the command bar owns a global ⌘K listener. */}
      {withCommandBar && !demo && (
        <div className="px-2 pb-4">
          <CommandBar />
        </div>
      )}
      <SidebarNav active={active} onNavigate={navigate} counts={counts} markerId={markerId} />
      <AccountMenu email={email} demo={demo} onSettings={() => navigate('settings')} />
    </>
  )

  return (
    <ReadOnlyProvider value={demo}>
      <div className="flex h-dvh w-full overflow-hidden">
        <aside className="hidden w-60 shrink-0 flex-col border-r border-border bg-surface lg:flex">{sidebar('nav-marker', true)}</aside>

        <div className="flex min-w-0 flex-1 flex-col">
          {/* Small screens: the sidebar becomes a drawer. */}
          <div className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-surface px-4 lg:hidden">
            <AtlasWordmark />
            <button
              onClick={() => setMobileOpen(true)}
              aria-label="Open navigation"
              className="flex size-9 items-center justify-center rounded-md text-muted-foreground hover:bg-surface-2 hover:text-foreground"
            >
              <Menu className="size-5" strokeWidth={1.6} />
            </button>
          </div>
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetContent side="left" className="w-72 gap-0 bg-surface p-0" showCloseButton={false}>
              <SheetHeader className="sr-only">
                <SheetTitle>Navigation</SheetTitle>
                <SheetDescription>Move between Atlas views</SheetDescription>
              </SheetHeader>
              {sidebar('nav-marker-mobile', false)}
            </SheetContent>
          </Sheet>

          <main ref={mainRef} className="flex-1 overflow-y-auto">
            {loadErrors.length > 0 && (
              <div role="alert" className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-destructive/30 bg-destructive/10 px-5 py-2 text-xs text-destructive sm:px-8">
                <AlertTriangle className="size-3.5 shrink-0" strokeWidth={1.75} />
                <span>
                  Some of your data did not load ({loadErrors.join(', ')}). What you see may be incomplete — empty lists here are not real.
                </span>
                <button onClick={() => window.location.reload()} className="underline underline-offset-2 hover:opacity-80">
                  Reload
                </button>
              </div>
            )}
            {urgent.length > 0 && (
              <button
                onClick={() => navigate('today')}
                className="sticky top-0 z-10 flex w-full items-center gap-2 border-b border-verdict-late/25 bg-background/85 px-5 py-2 text-left text-xs text-verdict-late backdrop-blur-md sm:px-8"
              >
                <AlertTriangle className="size-3.5 shrink-0" strokeWidth={1.75} />
                <span className="shrink-0 font-medium">
                  {urgent.length} deadline{urgent.length === 1 ? '' : 's'} inside {URGENT_DAYS} days
                </span>
                <span className="truncate text-muted-foreground">
                  {urgent
                    .slice(0, 3)
                    .map((u) => (u.verdict?.type === 'LATE_WINDOW' ? `${u.opp.title} (late window)` : `${u.opp.title} (${u.days}d)`))
                    .join(', ')}
                  {urgent.length > 3 ? `, and ${urgent.length - 3} more` : ''}
                </span>
              </button>
            )}

            <div className="mx-auto max-w-6xl px-5 py-8 sm:px-8 sm:py-10">
              <AnimatePresence mode="wait" initial={false}>
                <motion.div key={active} variants={viewSwap} initial="initial" animate="animate" exit="exit">
                  {active === 'today' && (
                    <TodayView
                      opportunities={opportunities}
                      verdicts={verdicts}
                      gaps={gaps}
                      actions={actions}
                      onOpenGaps={() => navigate('gap-queue')}
                      applications={applications}
                      gapClosures={gapClosures}
                      referees={referees}
                      missedDeadlines={missedDeadlines}
                    />
                  )}
                  {active === 'home' && (
                    <HomeView profile={profile} opportunities={opportunities} verdicts={verdicts} actions={actions} onOpenGaps={() => navigate('gap-queue')} />
                  )}
                  {active === 'action-queue' && <ActionQueueView opportunities={opportunities} verdicts={verdicts} />}
                  {active === 'applications' && <ApplicationsView opportunities={opportunities} applications={applications} profile={profile} />}
                  {active === 'gap-queue' && <GapQueueView gaps={gaps} />}
                  {active === 'pool' && <PoolView opportunities={opportunities} verdicts={verdicts} applications={applications} />}
                  {active === 'countries' && <CountriesView opportunities={opportunities} verdicts={verdicts} applications={applications} />}
                  {active === 'sections' && <SectionsView opportunities={opportunities} verdicts={verdicts} />}
                  {active === 'watchlist' && <WatchlistView labs={watchlist} />}
                  {active === 'inbox' && <InboxView leads={inbox} />}
                  {active === 'profile' && <ProfileView profile={profile} onAddCv={() => navigate('cv')} />}
                  {active === 'cv' && <CvIntakeView />}
                  {active === 'archive' && <ArchiveView entries={archive} />}
                  {active === 'settings' && <SettingsView email={email} profile={profile} />}
                  {active === 'interview' && (
                    <ComingSoonView
                      icon={MessagesSquare}
                      title="Intake interview"
                      description="A CV can't say whether a job during your degree was paid, or whether a paper is submitted or only drafted. The interview asks, so verdicts rest on what is true rather than what was parsed."
                      endpoint="/api/interview/brief"
                    />
                  )}
                  {active === 'email' && (
                    <ComingSoonView
                      icon={Mail}
                      title="Email drafts"
                      description="Outreach to professors, programme officers and referees, drafted from your profile and the opportunity's own page. You send it; Atlas tracks replies, never opens."
                      endpoint="/api/email/draft"
                    />
                  )}
                  {active === 'network' && (
                    <ComingSoonView
                      icon={Users}
                      title="Network"
                      description="Opt-in cohort visibility: how many people with a profile like yours applied to the same programme. Nobody is shown unless they chose to be."
                      endpoint="/api/network/matches"
                      method="GET"
                    />
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
          </main>
        </div>
      </div>
    </ReadOnlyProvider>
  )
}
