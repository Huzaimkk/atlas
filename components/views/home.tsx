'use client'

import { useMemo } from 'react'
import { motion } from 'motion/react'
import { ArrowRight, Sparkles } from 'lucide-react'
import type { AggregatedAction, Opportunity, ProfileSnapshot, Verdict } from '@/types/atlas'
import { GAP_TYPE_LABELS } from '@/types/atlas'
import { EmptyState } from '@/components/atlas/empty-state'
import { PostDegreeHoursChart } from '@/components/charts/post-degree-hours'
import { DeadlineTimelineChart } from '@/components/charts/deadline-timeline'

const ENHANCER_SIZE = 5

/**
 * The Gap Queue inverted (spec §4.1): instead of "this opportunity needs
 * these things," lead with "closing these things unlocks this many rows."
 * The headline number is the union of opportunity_ids across the top N
 * actions, not their summed unblock_count — an opportunity blocked on two
 * of the top-5 actions only counts once toward "unlocks N rows."
 *
 * Ranks by ACTION (sit IELTS, request transcripts), not by each row's own
 * verbatim requirement label — several rows' genuinely different
 * requirements (Berkeley rejects Duolingo, UCSD accepts it at exactly
 * 120) can still share one satisfying action. The Gap Queue page keeps
 * the per-requirement view unmerged; only this widget groups by action.
 */
function ProfileEnhancer({ actions }: { actions: AggregatedAction[] }) {
  const top = useMemo(() => [...actions].sort((a, b) => b.unblock_count - a.unblock_count).slice(0, ENHANCER_SIZE), [actions])
  const totalUnlocked = useMemo(() => new Set(top.flatMap((a) => a.opportunity_ids)).size, [top])

  if (top.length === 0) {
    return (
      <EmptyState
        icon={Sparkles}
        title="Nothing blocking you right now"
        description="Once the pool is diagnosed against your profile, the handful of things most worth closing — ranked by how many rows each one unlocks — show up here first."
      />
    )
  }

  return (
    <div className="space-y-4 rounded-xl border border-border-strong bg-surface-2/50 p-6">
      <div className="flex items-baseline gap-2">
        <span className="text-3xl font-semibold tracking-tight text-foreground">{top.length}</span>
        <p className="text-sm text-muted-foreground">
          thing{top.length === 1 ? '' : 's'} to close unlock{top.length === 1 ? 's' : ''}{' '}
          <span className="font-medium text-foreground">{totalUnlocked}</span> row{totalUnlocked === 1 ? '' : 's'} in
          the pool.
        </p>
      </div>

      <ul className="space-y-2.5">
        {top.map((action, i) => (
          <motion.li
            key={action.id}
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.04, duration: 0.25, ease: 'easeOut' }}
            className="flex items-center gap-3 rounded-lg bg-background/40 px-3.5 py-3"
          >
            <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-surface-3 font-mono text-2xs text-muted-foreground">
              {i + 1}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm text-foreground">{action.action_label}</p>
              <p className="text-2xs text-faint-foreground">{GAP_TYPE_LABELS[action.type]}</p>
            </div>
            <span className="shrink-0 text-right text-xs text-muted-foreground">
              unlocks <span className="font-medium text-foreground">{action.unblock_count}</span>
              {i === 0 ? ' on its own' : ''}
            </span>
            <ArrowRight className="size-3.5 shrink-0 text-faint-foreground" strokeWidth={1.75} />
          </motion.li>
        ))}
      </ul>
    </div>
  )
}

/**
 * Three numbers, never collapsed into one: a GAP row with
 * verification_required is READY-if-the-entry-route-checks-out, but it is
 * never counted as READY until that's actually confirmed (migration
 * 0013) — "pending verification" is its own bucket everywhere a count of
 * READY rows is shown, starting here.
 */
function VerdictSummary({ verdicts }: { verdicts: Verdict[] }) {
  const verifiedReady = verdicts.filter((v) => v.type === 'READY').length
  const pendingVerification = verdicts.filter((v) => v.type === 'GAP' && v.verification_required).length
  const realGap = verdicts.filter((v) => v.type === 'GAP' && !v.verification_required).length

  return (
    <div className="flex flex-wrap items-baseline gap-x-5 gap-y-1 text-sm text-muted-foreground">
      <span>
        <span className="font-semibold text-foreground">{verifiedReady}</span> verified READY
      </span>
      <span>
        <span className="font-semibold text-foreground">{pendingVerification}</span> pending verification
      </span>
      <span>
        <span className="font-semibold text-foreground">{realGap}</span> GAP
      </span>
    </div>
  )
}

export function HomeView({
  profile,
  opportunities,
  verdicts,
  actions,
}: {
  profile: ProfileSnapshot | null
  opportunities: Opportunity[]
  verdicts: Verdict[]
  actions: AggregatedAction[]
}) {
  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Home</h1>
        <p className="mt-1 text-sm text-muted-foreground">Where things stand, and what to close next.</p>
      </header>

      <VerdictSummary verdicts={verdicts} />

      <ProfileEnhancer actions={actions} />

      <div className="space-y-6">
        <PostDegreeHoursChart profile={profile} />
        <DeadlineTimelineChart opportunities={opportunities} verdicts={verdicts} />
      </div>
    </div>
  )
}
