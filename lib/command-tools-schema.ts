// Pure data/formatting — no Supabase, no 'server-only'. Split out of
// lib/command-tools.ts (which does import 'server-only') specifically so
// the structured palette (a client component) can import the tool catalog
// directly, instead of duplicating it and risking the two definitions
// drifting apart.

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

/** Shared between the natural-language command bar and the structured palette — both create a command_log pending_write and need the same human-readable summary for the confirm card. */
export function humanizeWriteAction(tool: ToolName, input: Record<string, unknown>): string {
  switch (tool) {
    case 'mark_requirement_satisfied':
      return `Mark "${input.requirement_label}" satisfied for "${input.opportunity_title}", then re-diagnose that row.`
    case 'update_profile_credential':
      return `Record "${input.item}" as ${input.status}${input.score_or_detail ? ` (${input.score_or_detail})` : ''} — creates profile snapshot v(next) and re-diagnoses the whole pool.`
    case 'add_opportunity_from_search':
      return `Search the web for "${input.query}" and, only if a real source is found, add it as an unverified lead.`
    default:
      return `Run ${tool} with ${JSON.stringify(input)}`
  }
}
