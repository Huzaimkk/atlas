import 'server-only'
import { supabaseAdmin } from '@/lib/supabase'
import { computeGapPriority, daysBetween, daysUntil } from '@/lib/atlas-format'
import { diagnoseOne, loadProfileFacts } from '@/lib/diagnostic-engine'
import type {
  AggregatedAction,
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
  /** Home's ProfileEnhancer only — grouped by satisfying action, not by verbatim requirement label. See migration 0013. */
  actions: AggregatedAction[]
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
  profile: (ProfileSnapshot & { id: string }) | null,
  userId: string
): Promise<MissedDeadline[]> {
  if (!profile) return []
  const facts = await loadProfileFacts(profile, userId)
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

/**
 * Server-only real data read, scoped to one user. supabaseAdmin (service
 * role) bypasses RLS entirely, so the database provides no backstop here —
 * every per-user table query below carries an explicit .eq('user_id', ...)
 * because this code path is the only thing standing between one user's
 * data and another's. `opportunities` and `page_snapshots` stay
 * unscoped — they're the shared pool, not per-user.
 */
export async function fetchAtlasData(userId: string): Promise<AtlasData> {
  const monthStart = new Date()
  monthStart.setDate(1)
  monthStart.setHours(0, 0, 0, 0)

  const [
    { data: opportunities },
    { data: verdicts },
    { data: gapQueue },
    { data: actionQueue },
    { data: profile },
    { data: inboxRows },
    { data: applications },
    { data: gapClosureRows },
    { data: refereeRows },
  ] = await Promise.all([
    supabaseAdmin.from('opportunities').select('*'),
    supabaseAdmin.from('verdicts').select('*').eq('user_id', userId),
    supabaseAdmin.from('gap_queue').select('*').eq('user_id', userId),
    supabaseAdmin.from('action_queue').select('*').eq('user_id', userId),
    supabaseAdmin.from('profile_snapshots').select('*').eq('is_current', true).eq('user_id', userId).maybeSingle(),
    supabaseAdmin.from('inbox_leads').select('*').eq('user_id', userId).neq('confidence', 'resolved').order('dropped_at', { ascending: false }),
    supabaseAdmin.from('applications').select('*').eq('user_id', userId),
    supabaseAdmin.from('gap_closures').select('*').eq('user_id', userId).gte('closed_at', monthStart.toISOString()).order('closed_at', { ascending: false }),
    supabaseAdmin.from('referees').select('*').eq('user_id', userId).order('created_at', { ascending: true }),
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

  const actions: AggregatedAction[] = (actionQueue ?? []).map((a) => ({
    id: `${a.type}:${a.action_label}`,
    type: a.type,
    action_label: a.action_label,
    unblock_count: a.unblock_count,
    opportunity_ids: a.opportunity_ids,
    time_estimate: a.time_estimate ?? '',
    cost_estimate: a.cost_estimate ?? '',
    priority: computeGapPriority(a.type, a.unblock_count),
  }))

  const verdictByOpportunityId = new Map((verdicts ?? []).map((v) => [v.opportunity_id, v]))
  // Withdrawn (item 4 — decline) takes priority over an EXPIRED verdict:
  // an opportunity someone explicitly declined belongs in Archive for that
  // reason even if it also happens to have since expired.
  const withdrawnOppIds = new Set((applications ?? []).filter((a) => a.status === 'withdrawn').map((a) => a.opportunity_id))
  const applicationByOpportunityId = new Map((applications ?? []).map((a) => [a.opportunity_id, a]))
  const archive: ArchiveEntry[] = (opportunities ?? [])
    .filter((o) => withdrawnOppIds.has(o.id) || verdictByOpportunityId.get(o.id)?.type === 'EXPIRED')
    .map((o): ArchiveEntry | null => {
      const verdict = verdictByOpportunityId.get(o.id)
      const withdrawn = withdrawnOppIds.has(o.id)
      return verdict
        ? {
            opportunity: o,
            verdict,
            archived_reason: withdrawn ? ('withdrawn' as const) : ('expired' as const),
            archived_at: withdrawn ? applicationByOpportunityId.get(o.id)!.status_changed_at : verdict.computed_at,
          }
        : null
    })
    .filter((e): e is ArchiveEntry => e !== null)

  return {
    opportunities: opportunities ?? [],
    verdicts: verdicts ?? [],
    gaps,
    actions,
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
    missedDeadlines: await computeMissedDeadlines(opportunities ?? [], verdicts ?? [], profile ?? null, userId),
  }
}
