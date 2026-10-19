import 'server-only'
import { supabaseAdmin } from '@/lib/supabase'
import { computeGapPriority, daysBetween, daysUntil } from '@/lib/atlas-format'
import { diagnoseOne, loadProfileFacts } from '@/lib/diagnostic-engine'
import type {
  AggregatedGap,
  Application,
  ArchiveEntry,
  GapClosure,
  InboxLead,
  MissedDeadline,
  Opportunity,
  ProfileSnapshot,
  Referee,
  Verdict,
  WatchlistLab,
} from '@/types/atlas'

export interface AtlasData {
  opportunities: Opportunity[]
  verdicts: Verdict[]
  gaps: AggregatedGap[]
  watchlist: WatchlistLab[]
  inbox: InboxLead[]
  profile: ProfileSnapshot | null
  archive: ArchiveEntry[]
  applications: Application[]
  /** This calendar month's closures, every cause — the Today headline counter filters to cause === 'satisfied' itself; the rest are for the detail view. */
  gapClosures: GapClosure[]
  referees: Referee[]
  missedDeadlines: MissedDeadline[]
}

/**
 * Rows whose deadline has already passed but that would have diagnosed as
 * READY if the deadline hadn't (item 3's "deadlines passed while READY"
 * counter — the accountability number). Computed live, not from historical
 * tracking: a row that expired before migration 0010 added ready_since has
 * no record of when it became ready, so daysReady is null there rather
 * than a fabricated guess — only rows with a real ready_since on the
 * current verdict get a real day-count.
 */
async function computeMissedDeadlines(
  opportunities: Opportunity[],
  verdicts: Verdict[],
  profile: (ProfileSnapshot & { id: string }) | null
): Promise<MissedDeadline[]> {
  if (!profile) return []
  const facts = await loadProfileFacts(profile)
  const verdictByOpp = new Map(verdicts.map((v) => [v.opportunity_id, v]))

  const missed: MissedDeadline[] = []
  for (const opp of opportunities) {
    if (!opp.deadline) continue
    const days = daysUntil(opp.deadline)
    if (days === null || days >= 0) continue // not actually past yet

    const counterfactual = diagnoseOne({ ...opp, status: 'open' }, facts)
    if (counterfactual.type !== 'READY') continue

    const readySince = verdictByOpp.get(opp.id)?.ready_since ?? null
    missed.push({
      opportunity_id: opp.id,
      title: opp.title,
      institution: opp.institution,
      deadline: opp.deadline,
      ready_since: readySince,
      daysReady: readySince ? daysBetween(readySince, opp.deadline) : null,
    })
  }
  return missed.sort((a, b) => (b.daysReady ?? -1) - (a.daysReady ?? -1))
}

/** Server-only real data read. RLS denies the anon key on every table by design (Phase 1) — this must run server-side using the service-role client, never in a client component. */
export async function fetchAtlasData(): Promise<AtlasData> {
  const monthStart = new Date()
  monthStart.setDate(1)
  monthStart.setHours(0, 0, 0, 0)

  const [
    { data: opportunities },
    { data: verdicts },
    { data: gapQueue },
    { data: profile },
    { data: inboxRows },
    { data: applications },
    { data: gapClosureRows },
    { data: refereeRows },
  ] = await Promise.all([
    supabaseAdmin.from('opportunities').select('*'),
    supabaseAdmin.from('verdicts').select('*'),
    supabaseAdmin.from('gap_queue').select('*'),
    supabaseAdmin.from('profile_snapshots').select('*').eq('is_current', true).maybeSingle(),
    supabaseAdmin.from('inbox_leads').select('*').neq('confidence', 'resolved').order('dropped_at', { ascending: false }),
    supabaseAdmin.from('applications').select('*'),
    supabaseAdmin.from('gap_closures').select('*').gte('closed_at', monthStart.toISOString()).order('closed_at', { ascending: false }),
    supabaseAdmin.from('referees').select('*').order('created_at', { ascending: true }),
  ])

  const gaps: AggregatedGap[] = (gapQueue ?? []).map((g) => ({
    id: `${g.type}:${g.label}`,
    type: g.type,
    label: g.label,
    unblock_count: g.unblock_count,
    opportunity_ids: g.opportunity_ids,
    time_estimate: g.time_estimate ?? '',
    cost_estimate: g.cost_estimate ?? '',
    priority: computeGapPriority(g.type, g.unblock_count),
  }))

  const verdictByOpportunityId = new Map((verdicts ?? []).map((v) => [v.opportunity_id, v]))
  const archive: ArchiveEntry[] = (opportunities ?? [])
    .filter((o) => verdictByOpportunityId.get(o.id)?.type === 'EXPIRED')
    .map((o) => ({
      opportunity: o,
      verdict: verdictByOpportunityId.get(o.id)!,
      archived_reason: 'expired' as const,
      archived_at: verdictByOpportunityId.get(o.id)!.computed_at,
    }))

  return {
    opportunities: opportunities ?? [],
    verdicts: verdicts ?? [],
    gaps,
    watchlist: [], // Channel C (Phase 6) not built yet
    inbox: (inboxRows ?? []).map((r) => ({
      id: r.id,
      origin: r.origin,
      raw_excerpt: r.raw_excerpt,
      extracted: r.extracted ?? {},
      confidence: r.confidence,
      dropped_at: r.dropped_at,
      dedupe_match_id: r.dedupe_match_id ?? undefined,
      source_url: r.source_url ?? undefined,
      extraction_error: r.extraction_error ?? undefined,
      verdict_preview: r.verdict_preview ?? undefined,
    })),
    profile: profile ?? null,
    archive,
    applications: applications ?? [],
    gapClosures: gapClosureRows ?? [],
    referees: refereeRows ?? [],
    missedDeadlines: await computeMissedDeadlines(opportunities ?? [], verdicts ?? [], profile ?? null),
  }
}
