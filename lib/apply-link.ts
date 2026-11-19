import type { Opportunity } from '@/types/atlas'

/**
 * Where a row's Apply button goes, and whether that destination is the
 * place you actually submit (a portal) or only a page that explains how
 * to apply. The two are labelled differently on screen — a button that
 * says "Apply" and lands on an admissions FAQ is worse than an honest
 * "How to apply".
 *
 * Order of trust:
 *  1. application_details.portal_url — read off the official page and
 *     recorded by hand (migration 0015).
 *  2. apply_url when its shape is a submission system (portal hosts,
 *     /apply paths, applicant-tracking systems, job postings with an
 *     apply flow). This is a URL-shape judgement, not a verification.
 *  3. apply_url, then source_url, as an information page.
 */
export type ApplyKind = 'portal' | 'info'

export interface ApplyLink {
  href: string
  kind: ApplyKind
  /** True only when a person read the portal URL off the official page. */
  verified: boolean
}

const PORTAL_SHAPE =
  /(^|\.)apply\.|gradapp|gradapply|applyweb|applytexas|applytojob|embark\.com|liaisoncas|engineeringcas|\.slate\.|myworkday|greenhouse\.io|lever\.co|smartrecruiters|submittable\.com\/submit|forms\.gle|docs\.google\.com\/forms|typeform\.com|jobs\.inria\.fr\/public\/classic\/[a-z]+\/offres\/|\/apply(\/|$|\?)|\/application\/?$|\/applications\/?$/i

// Matched the shape above but are, on inspection, information pages.
const NOT_A_PORTAL = /gradapply\.ku\.edu\/afford|onestop\.utsa\.edu\/financialaid|quadfellowship\.org\/apply/i

export function isPortalShaped(url: string): boolean {
  return PORTAL_SHAPE.test(url) && !NOT_A_PORTAL.test(url)
}

export function applyLinkFor(opp: Pick<Opportunity, 'apply_url' | 'source_url' | 'application_details'>): ApplyLink | null {
  const recorded = opp.application_details?.portal_url
  if (recorded) return { href: recorded, kind: 'portal', verified: opp.application_details?.portal_status === 'verified' }
  if (opp.apply_url && isPortalShaped(opp.apply_url)) return { href: opp.apply_url, kind: 'portal', verified: false }
  const info = opp.apply_url || opp.source_url
  return info ? { href: info, kind: 'info', verified: false } : null
}
