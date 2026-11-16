import type { AtlasData } from '@/lib/fetch-atlas-data'
import {
  mockOpportunities,
  mockVerdicts,
  mockAggregatedGaps,
  mockActions,
  mockWatchlist,
  mockInbox,
  mockProfile,
  mockArchive,
  mockApplications,
  mockGapClosures,
  mockReferees,
  mockMissedDeadlines,
} from '@/data/mock/atlas-mock'

/**
 * /demo is on in development and off in production unless
 * ATLAS_PUBLIC_DEMO=1 is set. It stays off by default because the fixture
 * in atlas-mock.ts names real academics (one with an email address) and a
 * real referee — fine on a developer's machine, not something to publish
 * without replacing those rows with invented ones first.
 */
export const DEMO_ENABLED = process.env.NODE_ENV !== 'production' || process.env.ATLAS_PUBLIC_DEMO === '1'

// The fixture was written as if "today" were this date. Shifting every
// date by (real today − this) keeps its deadlines, ages and statuses
// consistent with each other no matter when the demo is opened.
const FIXTURE_TODAY = '2026-10-15'
const DATE_PREFIX = /^(\d{4}-\d{2}-\d{2})(.*)$/

function shiftDate(date: string, days: number): string {
  const d = new Date(date + 'T00:00:00Z')
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

function rebase<T>(value: T, days: number): T {
  if (typeof value === 'string') {
    const m = DATE_PREFIX.exec(value)
    return (m ? shiftDate(m[1], days) + m[2] : value) as T
  }
  if (Array.isArray(value)) return value.map((v) => rebase(v, days)) as T
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, rebase(v, days)])) as T
  }
  return value
}

export function demoData(now = new Date()): AtlasData {
  const today = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()))
  const days = Math.round((today.getTime() - new Date(FIXTURE_TODAY + 'T00:00:00Z').getTime()) / 86_400_000)
  return rebase(
    {
      opportunities: mockOpportunities,
      verdicts: mockVerdicts,
      gaps: mockAggregatedGaps,
      actions: mockActions,
      watchlist: mockWatchlist,
      inbox: mockInbox,
      profile: mockProfile,
      archive: mockArchive,
      applications: mockApplications,
      gapClosures: mockGapClosures,
      referees: mockReferees,
      missedDeadlines: mockMissedDeadlines,
    },
    days
  )
}
