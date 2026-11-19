import type { Opportunity, Status } from '@/types/atlas'

/**
 * An opportunity's status, computed from its dates against today — never
 * read from the stored column (spec §4: "computed daily, never hand-set").
 * The stored value is only used where there is no date to compute from.
 *
 * Mirrored in scripts/lib/opportunity-status.mjs for the plain-JS scripts;
 * lib/opportunity-status.test.ts holds both to the same answers.
 *
 *   paused            stays paused — a programme pause is not a date
 *   rolling           rolling
 *   deadline < today  expired
 *   opens > today     not_yet_open
 *   ≤14 days left     closing_soon
 *   otherwise dated   open
 *   undated           the stored value, except 'closing_soon', which
 *                     cannot be true without a date and becomes 'open'
 *
 * `opens` is only trusted as an application-opening date when it falls on
 * or before the deadline, and never for conferences: the pool stores an
 * event's own date there (SREcon27's registration closes 19 Nov, its event
 * is in March), and reading that as "applications open later" would hide a
 * live deadline. Undated events that have already happened cannot be
 * detected from the data at all — they need a deadline recorded.
 */
export const CLOSING_SOON_DAYS = 14

const DAY_MS = 86_400_000

type StatusInput = Pick<Opportunity, 'status' | 'deadline' | 'opens' | 'rolling'> & { track?: Opportunity['track'] }

function applicationOpens(opp: StatusInput): string | undefined {
  if (!opp.opens || opp.track === 'conference') return undefined
  if (opp.deadline && opp.opens > opp.deadline) return undefined
  return opp.opens
}

export function computeStatus(opp: StatusInput, today: string): Status {
  if (opp.status === 'paused') return 'paused'
  if (opp.rolling) return 'rolling'
  const opens = applicationOpens(opp)
  if (opp.deadline) {
    if (opp.deadline < today) return 'expired'
    if (opens && opens > today) return 'not_yet_open'
    const daysLeft = Math.round((Date.parse(opp.deadline + 'T00:00:00Z') - Date.parse(today + 'T00:00:00Z')) / DAY_MS)
    return daysLeft <= CLOSING_SOON_DAYS ? 'closing_soon' : 'open'
  }
  if (opens) {
    if (opens > today) return 'not_yet_open'
    return opp.status === 'program_specific' ? 'program_specific' : 'open'
  }
  return opp.status === 'closing_soon' ? 'open' : opp.status
}

/** True when the status above came from a date rather than the stored column. */
export function isDateDerived(opp: StatusInput): boolean {
  return opp.status !== 'paused' && !opp.rolling && !!(opp.deadline || applicationOpens(opp))
}

/** Local calendar date as YYYY-MM-DD — the "today" every status and verdict is computed against. */
export function todayISO(now = new Date()): string {
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}
