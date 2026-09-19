import type { Status, Tier, VerdictType } from '@/types/atlas'

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
