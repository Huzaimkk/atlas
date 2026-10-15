import 'server-only'
import { supabaseAdmin } from '@/lib/supabase'
import { computeGapPriority } from '@/lib/atlas-format'
import type {
  AggregatedGap,
  ArchiveEntry,
  InboxLead,
  Opportunity,
  ProfileSnapshot,
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
}

/** Server-only real data read. RLS denies the anon key on every table by design (Phase 1) — this must run server-side using the service-role client, never in a client component. */
export async function fetchAtlasData(): Promise<AtlasData> {
  const [{ data: opportunities }, { data: verdicts }, { data: gapQueue }, { data: profile }] = await Promise.all([
    supabaseAdmin.from('opportunities').select('*'),
    supabaseAdmin.from('verdicts').select('*'),
    supabaseAdmin.from('gap_queue').select('*'),
    supabaseAdmin.from('profile_snapshots').select('*').eq('is_current', true).maybeSingle(),
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
    inbox: [], // manual ingest pipeline (Phase beyond this session) not built yet
    profile: profile ?? null,
    archive,
  }
}
