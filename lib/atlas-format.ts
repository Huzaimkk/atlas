import type { GapType, Status, Tier, VerdictType } from '@/types/atlas'

export const VERDICT_META: Record<VerdictType, { label: string; colorVar: string; bgVar: string }> = {
  READY: { label: 'Ready', colorVar: 'var(--verdict-ready)', bgVar: 'var(--verdict-ready-bg)' },
  GAP: { label: 'Gap', colorVar: 'var(--verdict-gap)', bgVar: 'var(--verdict-gap-bg)' },
  LATE_WINDOW: { label: 'Late window', colorVar: 'var(--verdict-late)', bgVar: 'var(--verdict-late-bg)' },
  BLOCKED: { label: 'Blocked', colorVar: 'var(--verdict-blocked)', bgVar: 'var(--verdict-blocked-bg)' },
  IRRELEVANT: { label: 'Irrelevant', colorVar: 'var(--verdict-blocked)', bgVar: 'var(--verdict-blocked-bg)' },
  EXPIRED: { label: 'Expired', colorVar: 'var(--verdict-expired)', bgVar: 'var(--verdict-expired-bg)' },
  NOT_YET_OPEN: { label: 'Not yet open', colorVar: 'var(--verdict-watch)', bgVar: 'var(--verdict-watch-bg)' },
}

export const TIER_META: Record<Tier, { label: string }> = {
  T1: { label: 'T1 · Reach' },
  T2: { label: 'T2 · Realistic' },
  T3: { label: 'T3 · Volume' },
}

export const STATUS_LABELS: Record<Status, string> = {
  not_yet_open: 'Not yet open',
  open: 'Open',
  closing_soon: 'Closing soon',
  expired: 'Expired',
  rolling: 'Rolling',
}

export const GAP_PRIORITY_LABELS: Record<'start_now' | 'agent_assisted' | 'low_priority', string> = {
  start_now: 'Start now',
  agent_assisted: 'Agent-assisted',
  low_priority: 'Low priority',
}

export function daysUntil(dateStr?: string): number | null {
  if (!dateStr) return null
  const target = new Date(dateStr + 'T00:00:00')
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  return Math.round((target.getTime() - now.getTime()) / 86_400_000)
}

/**
 * Action Queue urgency band (lower = more urgent) — primary sort key for
 * dated rows, so a programme closing in 3 days never sits below one
 * closing in 90 just because the comparison used raw fit_score or
 * day-count first. 0: inside two weeks. 1: inside a month. 2: inside a
 * quarter. 3: everything further out (or already past, defensively).
 */
export function urgencyBand(dateStr?: string): number {
  const d = daysUntil(dateStr)
  if (d === null) return 3
  if (d <= 14) return 0
  if (d <= 30) return 1
  if (d <= 90) return 2
  return 3
}

export function formatDeadline(dateStr?: string): string {
  if (!dateStr) return '—'
  const n = daysUntil(dateStr)
  const formatted = new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
  if (n === null) return formatted
  if (n < 0) return `${formatted} (${Math.abs(n)}d ago)`
  if (n === 0) return `${formatted} (today)`
  return `${formatted} (${n}d)`
}

export function formatFunding(stipend?: { amount: number; currency: string; period: 'year' | 'month' }): string {
  if (!stipend) return '—'
  return `${stipend.currency} ${stipend.amount.toLocaleString()}/${stipend.period}`
}

const AVG_MONTH_SECONDS = 2629800

/**
 * Mirrors the post_degree_hours() SQL function (supabase/migrations/0001)
 * for client-side display — same average-month approximation, evaluated
 * against "now" rather than stored. Kept in sync manually; the database
 * function is the source of truth verdicts are actually computed against.
 */
export function postDegreeHours(degreeCompletedOn: string | null, fullTimeHoursPerMonth: number, asOf = new Date()): number {
  if (!degreeCompletedOn) return 0
  const completed = new Date(degreeCompletedOn + 'T00:00:00')
  if (completed > asOf) return 0
  const months = (asOf.getTime() - completed.getTime()) / (AVG_MONTH_SECONDS * 1000)
  return Math.round(months * fullTimeHoursPerMonth * 10) / 10
}

/**
 * The date the linear hours-accrual model (above) crosses a given
 * threshold — anchored at degree_completed_on, same model, so it can't
 * drift from whatever postDegreeHours() currently reports. Returns null
 * only when there's no completion date or no accrual rate to project
 * from (never a guessed date).
 */
export function projectedCrossingDate(degreeCompletedOn: string | null, fullTimeHoursPerMonth: number, thresholdHours: number): Date | null {
  if (!degreeCompletedOn || fullTimeHoursPerMonth <= 0) return null
  const completed = new Date(degreeCompletedOn + 'T00:00:00')
  const monthsToThreshold = thresholdHours / fullTimeHoursPerMonth
  return new Date(completed.getTime() + monthsToThreshold * AVG_MONTH_SECONDS * 1000)
}

/**
 * Gap Queue triage heuristic (spec §5.3's worked example doesn't reduce to
 * a pure function of gap type — IELTS and GRE are both 'credential' but
 * land at opposite ends). Endorsements and contacts front-load because
 * they depend on other people's time; documents are agent-assisted;
 * everything else scales with how many rows it actually unblocks.
 */
export function computeGapPriority(type: GapType, unblockCount: number): 'start_now' | 'agent_assisted' | 'low_priority' {
  if (type === 'endorsement') return 'start_now'
  if (type === 'document' || type === 'contact') return 'agent_assisted'
  return unblockCount >= 3 ? 'start_now' : 'low_priority'
}
