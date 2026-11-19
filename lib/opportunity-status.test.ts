import { describe, expect, it } from 'vitest'
import { computeStatus } from './opportunity-status'
import { computeStatus as computeStatusMjs } from '../scripts/lib/opportunity-status.mjs'

const TODAY = '2026-11-19'

const CASES: [string, Parameters<typeof computeStatus>[0], string][] = [
  ['stored open, deadline passed', { status: 'open', deadline: '2026-10-30' }, 'expired'],
  ['stored expired, deadline in the future', { status: 'expired', deadline: '2027-01-15' }, 'open'],
  ['deadline today is still open', { status: 'open', deadline: TODAY }, 'closing_soon'],
  ['14 days left', { status: 'open', deadline: '2026-12-03' }, 'closing_soon'],
  ['15 days left', { status: 'open', deadline: '2026-12-04' }, 'open'],
  ['opens later', { status: 'open', deadline: '2027-03-01', opens: '2026-12-15' }, 'not_yet_open'],
  ['opened, stored not_yet_open', { status: 'not_yet_open', deadline: '2027-03-01', opens: '2026-11-01' }, 'open'],
  ['rolling wins over dates', { status: 'open', deadline: '2026-01-01', rolling: true }, 'rolling'],
  ['paused stays paused', { status: 'paused', deadline: '2027-01-01' }, 'paused'],
  ['undated keeps stored value', { status: 'program_specific' }, 'program_specific'],
  ['undated expired stays expired', { status: 'expired' }, 'expired'],
  ['undated closing_soon cannot be true', { status: 'closing_soon' }, 'open'],
  ['opens only, in the past', { status: 'not_yet_open', opens: '2026-10-01' }, 'open'],
  ['opens only, in the future', { status: 'open', opens: '2027-07-01' }, 'not_yet_open'],
  ['conference: opens is the event date, deadline still governs', { status: 'open', track: 'conference', deadline: TODAY, opens: '2027-03-24' }, 'closing_soon'],
  ['conference with only an event date keeps stored status', { status: 'open', track: 'conference', opens: '2027-01-06' }, 'open'],
  ['opens after the deadline is not an opening date', { status: 'open', deadline: '2026-11-30', opens: '2027-02-01' }, 'closing_soon'],
]

describe('computeStatus', () => {
  for (const [name, opp, expected] of CASES) {
    it(name, () => {
      expect(computeStatus(opp, TODAY)).toBe(expected)
      expect(computeStatusMjs(opp, TODAY)).toBe(expected)
    })
  }
})
