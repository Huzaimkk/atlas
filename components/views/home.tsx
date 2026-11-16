'use client'

import { useMemo } from 'react'
import { motion } from 'motion/react'
import { ArrowRight, Sparkles } from 'lucide-react'
import type { AggregatedAction, Opportunity, ProfileSnapshot, Verdict } from '@/types/atlas'
import { GAP_TYPE_LABELS } from '@/types/atlas'
import { EmptyState } from '@/components/atlas/empty-state'
import { PageHeader, SectionTitle } from '@/components/atlas/page-header'
import { CountUp } from '@/components/atlas/count-up'
import { PostDegreeHoursChart } from '@/components/charts/post-degree-hours'
import { DeadlineTimelineChart } from '@/components/charts/deadline-timeline'
import { DURATION, EASE, transition } from '@/lib/motion'

const ENHANCER_SIZE = 5

/**
 * Where every row in the pool currently stands, as one bar.
 *
 * "Pending verification" is its own segment and its own number, never
 * folded into Ready: a GAP row with verification_required is
 * ready-if-the-entry-route-checks-out, and is not counted as ready until
 * that is actually confirmed (migration 0013).
 */
function Position({ verdicts }: { verdicts: Verdict[] }) {
  const segments = useMemo(() => {
    const count = (fn: (v: Verdict) => boolean) => verdicts.filter(fn).length
    return [
      { key: 'ready', label: 'Ready', hint: 'every rule passes, nothing missing', color: 'var(--verdict-ready)', value: count((v) => v.type === 'READY') },
      { key: 'late', label: 'Late window', hint: 'deadline passed, still accepting', color: 'var(--verdict-late)', value: count((v) => v.type === 'LATE_WINDOW') },
      {
        key: 'pending',
        label: 'Pending verification',
        hint: 'the page is silent on something — not counted as ready',
        color: 'var(--verdict-gap)',
        striped: true,
        value: count((v) => v.type === 'GAP' && v.verification_required),
      },
      { key: 'gap', label: 'Gap', hint: 'eligible, with named things missing', color: 'var(--verdict-gap)', value: count((v) => v.type === 'GAP' && !v.verification_required) },
      { key: 'upcoming', label: 'Not yet open', hint: 'opens later', color: 'var(--verdict-watch)', value: count((v) => v.type === 'NOT_YET_OPEN') },
      { key: 'blocked', label: 'Blocked', hint: 'a quoted rule you cannot meet', color: 'var(--verdict-blocked)', value: count((v) => v.type === 'BLOCKED' || v.type === 'IRRELEVANT') },
      { key: 'expired', label: 'Expired', hint: 'kept for the next cycle', color: 'var(--verdict-expired)', value: count((v) => v.type === 'EXPIRED') },
    ]
  }, [verdicts])

  const total = verdicts.length
  if (total === 0) return null

  return (
    <section className="space-y-5 rounded-lg border border-border bg-surface p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
        <SectionTitle>Your position</SectionTitle>
        <p className="text-xs text-muted-foreground">
          <CountUp value={total} className="font-mono text-foreground" /> opportunities checked against your profile
        </p>
      </div>

      <div className="flex h-2.5 w-full gap-0.5 overflow-hidden rounded-full" role="img" aria-label={segments.map((s) => `${s.value} ${s.label}`).join(', ')}>
        {segments
          .filter((s) => s.value > 0)
          .map((s, i) => (
            <motion.div
              key={s.key}
              className="h-full min-w-1"
              style={{
                background: s.striped
                  ? `repeating-linear-gradient(135deg, ${s.color} 0 3px, transparent 3px 6px)`
                  : s.color,
              }}
              initial={{ flexGrow: 0, opacity: 0 }}
              animate={{ flexGrow: s.value, opacity: 1 }}
              transition={{ duration: DURATION.slow + 0.2, ease: EASE, delay: i * 0.05 }}
            />
          ))}
      </div>

      <dl className="grid grid-cols-2 gap-x-8 gap-y-4 sm:grid-cols-3 lg:grid-cols-4">
        {segments.map((s) => (
          <div key={s.key} className={s.value === 0 ? 'opacity-45' : undefined}>
            <dt className="flex items-center gap-2 text-xs text-muted-foreground">
              <span
                className="size-2 shrink-0 rounded-full"
                style={{ background: s.striped ? 'transparent' : s.color, boxShadow: s.striped ? `inset 0 0 0 1.5px ${s.color}` : undefined }}
              />
              {s.label}
            </dt>
            <dd className="mt-1 pl-4">
              <CountUp value={s.value} className="font-mono text-xl text-foreground" />
              <p className="mt-0.5 text-2xs text-faint-foreground">{s.hint}</p>
            </dd>
          </div>
        ))}
      </dl>
    </section>
  )
}

/**
 * The gap list inverted (spec §4.1): instead of "this opportunity needs
 * these things," lead with "closing these things unlocks this many rows."
 * The headline number is the union of opportunity_ids across the top N
 * actions, not their summed unblock_count — an opportunity blocked on two
 * of the top-5 actions only counts once toward "unlocks N".
 *
 * Ranks by ACTION (sit IELTS, request transcripts), not by each row's own
 * verbatim requirement label — several rows' genuinely different
 * requirements (Berkeley rejects Duolingo, UCSD accepts it at exactly
 * 120) can still share one satisfying action. The Gaps page keeps the
 * per-requirement view unmerged; only this widget groups by action.
 */
function ProfileEnhancer({ actions, onOpenGaps }: { actions: AggregatedAction[]; onOpenGaps?: () => void }) {
  const top = useMemo(() => [...actions].sort((a, b) => b.unblock_count - a.unblock_count).slice(0, ENHANCER_SIZE), [actions])
  const totalUnlocked = useMemo(() => new Set(top.flatMap((a) => a.opportunity_ids)).size, [top])
  const max = top[0]?.unblock_count ?? 1

  if (top.length === 0) {
    return (
      <EmptyState
        icon={Sparkles}
        title="Nothing is holding you back right now"
        description="When an opportunity is missing something, the few actions that unlock the most opportunities appear here, ranked."
      />
    )
  }

  return (
    <section className="space-y-5 rounded-lg border border-border-strong bg-surface p-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <p className="display max-w-xl text-xl text-foreground">
          {top.length === 1 ? 'One thing' : `${top.length} things`} to close would unlock{' '}
          <CountUp value={totalUnlocked} /> {totalUnlocked === 1 ? 'opportunity' : 'opportunities'}.
        </p>
        {onOpenGaps && (
          <button onClick={onOpenGaps} className="flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground">
            See every gap
            <ArrowRight className="size-3.5" strokeWidth={1.75} />
          </button>
        )}
      </div>

      <ol className="space-y-1">
        {top.map((action, i) => (
          <motion.li
            key={action.id}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...transition.base, delay: 0.08 + i * 0.05 }}
            className="grid grid-cols-[1.5rem_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1.5 border-t border-border py-3 first:border-t-0 sm:grid-cols-[1.5rem_minmax(0,18rem)_minmax(0,1fr)_auto]"
          >
            <span className="font-mono text-xs text-faint-foreground tabular-nums">{i + 1}</span>
            <div className="min-w-0">
              <p className="truncate text-sm text-foreground">{action.action_label}</p>
              <p className="text-2xs text-faint-foreground">
                {GAP_TYPE_LABELS[action.type]}
                {action.time_estimate ? ` · ${action.time_estimate}` : ''}
                {action.cost_estimate ? ` · ${action.cost_estimate}` : ''}
              </p>
            </div>
            <div className="order-last col-span-3 h-1 overflow-hidden rounded-full bg-surface-3 sm:order-none sm:col-span-1">
              <motion.div
                className="h-full rounded-full bg-foreground/70"
                initial={{ width: 0 }}
                animate={{ width: `${Math.max(4, (action.unblock_count / max) * 100)}%` }}
                transition={{ ...transition.slow, delay: 0.12 + i * 0.05 }}
              />
            </div>
            <span className="shrink-0 text-right font-mono text-xs text-muted-foreground tabular-nums">
              unlocks <span className="text-foreground">{action.unblock_count}</span>
            </span>
          </motion.li>
        ))}
      </ol>
    </section>
  )
}

export function HomeView({
  profile,
  opportunities,
  verdicts,
  actions,
  onOpenGaps,
}: {
  profile: ProfileSnapshot | null
  opportunities: Opportunity[]
  verdicts: Verdict[]
  actions: AggregatedAction[]
  onOpenGaps?: () => void
}) {
  return (
    <div className="space-y-8">
      <PageHeader title="Overview" description="Where you stand across every opportunity, and what to close next." />

      <Position verdicts={verdicts} />

      <ProfileEnhancer actions={actions} onOpenGaps={onOpenGaps} />

      <div className="grid gap-5 lg:grid-cols-2">
        <DeadlineTimelineChart opportunities={opportunities} verdicts={verdicts} />
        <PostDegreeHoursChart profile={profile} />
      </div>
    </div>
  )
}
