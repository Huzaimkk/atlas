import 'server-only'
import { supabaseAdmin } from '@/lib/supabase'
import { diagnoseOpportunity, diagnosePool } from '@/lib/diagnostic-engine'
import { formatDeadline } from '@/lib/atlas-format'

// Every tool here is either READ (safe, auto-executes, no primary-source
// concerns since it only reads what's already in the pool) or WRITE
// (requires user confirmation before it touches the database — see
// app/api/chat/route.ts's confirm flow).
//
// The hard rule from this session's instructions: an AI-originated write
// is a lead, never a fact. None of the WRITE tools below let the model
// invent a deadline, eligibility rule, or funding figure from its own
// recall — self-attested tools (mark_requirement_satisfied,
// update_profile_credential) only record what the USER told it about
// their OWN state, and add_opportunity_from_search refuses to write
// anything beyond source_type:'manual', verification_level:'unverified'
// unless it can quote real fetched content.

export const TOOL_DEFS = [
  {
    name: 'query_deadlines',
    description: "List opportunities with a deadline in the next N days, soonest first, with each row's current verdict.",
    input_schema: {
      type: 'object' as const,
      properties: { days: { type: 'number', description: 'Look-ahead window in days' } },
      required: ['days'],
    },
  },
  {
    name: 'explain_verdict',
    description: 'Get the full verdict (type, reason, quoted blocking rule + source if BLOCKED, gaps if GAP) for one opportunity, matched by title.',
    input_schema: {
      type: 'object' as const,
      properties: { opportunity_title: { type: 'string', description: 'Title or partial title of the opportunity' } },
      required: ['opportunity_title'],
    },
  },
  {
    name: 'query_gap_queue',
    description: 'List the top gaps ranked by unblock count — the highest-leverage things to close right now.',
    input_schema: {
      type: 'object' as const,
      properties: { limit: { type: 'number', description: 'Max rows to return, default 10' } },
      required: [],
    },
  },
  {
    name: 'search_pool',
    description: 'Search/filter the opportunity pool by free-text query, track, category, or tier.',
    input_schema: {
      type: 'object' as const,
      properties: {
        query: { type: 'string', description: 'Free-text match against title, institution, field_tags' },
        track: { type: 'string' },
        tier: { type: 'string', enum: ['T1', 'T2', 'T3'] },
      },
      required: [],
    },
  },
  {
    name: 'mark_requirement_satisfied',
    description: "WRITE (requires confirmation). Mark one of an opportunity's requirements as satisfied — e.g. \"the SOP is done for Gates Cambridge.\" Re-diagnoses that opportunity afterward, since this can flip a GAP to READY.",
    input_schema: {
      type: 'object' as const,
      properties: {
        opportunity_title: { type: 'string' },
        requirement_label: { type: 'string', description: 'The requirement label to mark satisfied, e.g. "Statement of purpose"' },
      },
      required: ['opportunity_title', 'requirement_label'],
    },
  },
  {
    name: 'update_profile_credential',
    description: 'WRITE (requires confirmation). Record a self-attested credential update — e.g. "I got IELTS 7.0" or "GRE booked for Nov 12." Creates a new profile snapshot version and re-diagnoses the entire pool against it (spec §5.5).',
    input_schema: {
      type: 'object' as const,
      properties: {
        item: { type: 'string', description: 'Which pending item this resolves, e.g. "IELTS or TOEFL official score"' },
        status: { type: 'string', enum: ['in_progress', 'taken'] },
        score_or_detail: { type: 'string', description: 'e.g. "7.0" — stored as a note, not parsed into a typed score field' },
        expected_completion: { type: 'string', description: 'YYYY-MM-DD if the user gave one; omit rather than guess' },
      },
      required: ['item', 'status'],
    },
  },
  {
    name: 'add_opportunity_from_search',
    description: "WRITE (requires confirmation). Search the web for a specific opportunity (e.g. \"Commonwealth Shared Scholarship 2027 deadline\") and, only if a real source is found, draft a new pool row from it. The row is always saved as source_type:'manual', verification_level:'unverified' — never presented as confirmed fact. If no usable source is found, no row is created.",
    input_schema: {
      type: 'object' as const,
      properties: { query: { type: 'string' } },
      required: ['query'],
    },
  },
]

export type ToolName = (typeof TOOL_DEFS)[number]['name']
export const WRITE_TOOLS = new Set<ToolName>(['mark_requirement_satisfied', 'update_profile_credential', 'add_opportunity_from_search'])

export async function executeReadTool(name: ToolName, input: Record<string, unknown>) {
  switch (name) {
    case 'query_deadlines': {
      const days = Number(input.days) || 30
      const cutoff = new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10)
      const today = new Date().toISOString().slice(0, 10)
      const { data } = await supabaseAdmin
        .from('opportunities')
        .select('id, title, deadline, institution')
        .not('deadline', 'is', null)
        .gte('deadline', today)
        .lte('deadline', cutoff)
        .order('deadline', { ascending: true })
      const { data: verdicts } = await supabaseAdmin.from('verdicts').select('opportunity_id, type')
      const verdictById = new Map((verdicts ?? []).map((v) => [v.opportunity_id, v.type]))
      return (data ?? []).map((o) => ({ title: o.title, institution: o.institution, deadline: formatDeadline(o.deadline), verdict: verdictById.get(o.id) }))
    }
    case 'explain_verdict': {
      const title = String(input.opportunity_title ?? '')
      const { data: opp } = await supabaseAdmin.from('opportunities').select('*').ilike('title', `%${title}%`).limit(1).maybeSingle()
      if (!opp) return { error: `No opportunity matching "${title}"` }
      const { data: verdict } = await supabaseAdmin.from('verdicts').select('*').eq('opportunity_id', opp.id).maybeSingle()
      const { data: gaps } = await supabaseAdmin.from('gaps').select('type, label, time_estimate, cost_estimate').eq('opportunity_id', opp.id)
      return { title: opp.title, verdict: verdict?.type, reason: verdict?.reason, blocking_rule_quote: verdict?.blocking_rule_quote, blocking_rule_source_url: verdict?.blocking_rule_source_url, gaps }
    }
    case 'query_gap_queue': {
      const limit = Number(input.limit) || 10
      const { data } = await supabaseAdmin.from('gap_queue').select('*').order('unblock_count', { ascending: false }).limit(limit)
      return data
    }
    case 'search_pool': {
      let q = supabaseAdmin.from('opportunities').select('title, institution, track, tier, status')
      if (input.query) q = q.ilike('title', `%${input.query}%`)
      if (input.track) q = q.eq('track', input.track as string)
      if (input.tier) q = q.eq('tier', input.tier as string)
      const { data } = await q.limit(20)
      return data
    }
    default:
      return { error: `Unknown read tool: ${name}` }
  }
}

export async function executeWriteTool(name: ToolName, input: Record<string, unknown>) {
  switch (name) {
    case 'mark_requirement_satisfied': {
      const title = String(input.opportunity_title ?? '')
      const label = String(input.requirement_label ?? '')
      const { data: opp } = await supabaseAdmin.from('opportunities').select('*').ilike('title', `%${title}%`).limit(1).maybeSingle()
      if (!opp) return { error: `No opportunity matching "${title}"` }
      const requirements = (opp.requirements ?? []).map((r: { label: string; satisfied: boolean }) =>
        r.label.toLowerCase().includes(label.toLowerCase()) ? { ...r, satisfied: true } : r
      )
      const { error } = await supabaseAdmin.from('opportunities').update({ requirements }).eq('id', opp.id)
      if (error) return { error: error.message }
      const verdict = await diagnoseOpportunity(opp.id)
      return { opportunity: opp.title, requirement: label, new_verdict: verdict.type }
    }
    case 'update_profile_credential': {
      const { data: current, error: curErr } = await supabaseAdmin.from('profile_snapshots').select('*').eq('is_current', true).single()
      if (curErr || !current) return { error: `No current profile snapshot: ${curErr?.message}` }

      const item = String(input.item ?? '')
      const status = input.status === 'taken' ? 'in_progress' : (input.status as 'in_progress' | 'not_started') // stored as the user's self-report; 'taken' isn't a pending_items status — see note field
      const note = [input.score_or_detail ? `Score/detail: ${input.score_or_detail}` : null, `Self-reported via command bar, ${new Date().toISOString().slice(0, 10)}`].filter(Boolean).join('. ')

      const pendingItems = (current.pending_items ?? []).map((p: { item: string; expected_completion: string | null }) =>
        p.item.toLowerCase().includes(item.toLowerCase())
          ? { ...p, status, note, expected_completion: (input.expected_completion as string) ?? p.expected_completion }
          : p
      )

      const { version, id: _oldId, created_at: _createdAt, ...rest } = current
      void _oldId
      void _createdAt

      // Must flip the old row to is_current:false BEFORE inserting the new
      // one — the partial unique index allows only one is_current:true row
      // at a time, so inserting first violates it.
      const { error: flipErr } = await supabaseAdmin.from('profile_snapshots').update({ is_current: false }).eq('id', current.id)
      if (flipErr) return { error: flipErr.message }

      const { data: newSnapshot, error: insertErr } = await supabaseAdmin
        .from('profile_snapshots')
        .insert({ ...rest, version: version + 1, is_current: true, pending_items: pendingItems })
        .select('*')
        .single()
      if (insertErr) {
        // Roll back the flip so we don't end up with zero current snapshots.
        await supabaseAdmin.from('profile_snapshots').update({ is_current: true }).eq('id', current.id)
        return { error: insertErr.message }
      }

      const verdicts = await diagnosePool()
      return { new_snapshot_version: newSnapshot.version, item, status, opportunities_rediagnosed: verdicts.length }
    }
    case 'add_opportunity_from_search': {
      const query = String(input.query ?? '')
      // VERCEL_URL/VERCEL_PROJECT_PRODUCTION_URL are set automatically by
      // Vercel at runtime — no manual env var needed there. The explicit
      // NEXT_PUBLIC_APP_URL override and localhost fallback are only for
      // environments Vercel doesn't label (local dev, other hosts).
      const appUrl =
        process.env.NEXT_PUBLIC_APP_URL ??
        (process.env.VERCEL_PROJECT_PRODUCTION_URL && `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`) ??
        (process.env.VERCEL_URL && `https://${process.env.VERCEL_URL}`) ??
        'http://localhost:3000'
      const searchRes = await fetch(`${appUrl}/api/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      }).then((r) => r.json())

      if (searchRes.fallback || !searchRes.organic?.length) {
        return { error: 'No web search available (SERPER_API_KEY not configured, or no results) — refusing to write an unverified guess. Nothing was saved.' }
      }
      const top = searchRes.organic[0]
      const { data: row, error } = await supabaseAdmin
        .from('opportunities')
        .insert({
          title: top.title,
          track: 'scholarship', // best-effort; not asserted as verified
          category: 2,
          institution: top.title,
          status: 'open',
          tier: 'T3',
          source_url: top.link,
          source_type: 'manual',
          verification_level: 'unverified',
          origin: 'search',
          requirements: [],
          eligibility_rules: [],
          degree_levels_accepted: [],
        })
        .select('*')
        .single()
      if (error) return { error: error.message }
      return { created: row.title, source_url: row.source_url, verification_level: 'unverified', note: 'Snippet-derived only — not resolved against the full primary source page yet. Treat as a lead, not a fact, until verified.' }
    }
    default:
      return { error: `Unknown write tool: ${name}` }
  }
}
