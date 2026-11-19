// Plain-JS mirror of lib/opportunity-status.ts for the scripts, which
// cannot import TypeScript. lib/opportunity-status.test.ts runs both
// against the same cases — change them together.

export const CLOSING_SOON_DAYS = 14
const DAY_MS = 86_400_000

function applicationOpens(opp) {
  if (!opp.opens || opp.track === 'conference') return undefined
  if (opp.deadline && opp.opens > opp.deadline) return undefined
  return opp.opens
}

export function computeStatus(opp, today) {
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

export function todayISO(now = new Date()) {
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}
