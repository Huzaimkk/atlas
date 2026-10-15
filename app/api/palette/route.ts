import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { TOOL_DEFS, WRITE_TOOLS, executeReadTool, humanizeWriteAction, type ToolName } from '@/lib/command-tools'

// The structured palette (Phase B — feature-flagged natural-language path
// stays in /api/chat). No LLM involved: the form already produced typed,
// validated input, so there's no free-text command to interpret — this
// just dispatches straight to the same tools /api/chat calls, and reuses
// its POST { confirmCommandLogId, approve } branch to actually execute a
// write once the user confirms (that branch only cares about the
// command_log row's pending_write action, not who created it).

/** Autocomplete data for the typed forms — opportunity titles + their requirement labels, and the current profile's pending_items. */
export async function GET() {
  const [{ data: opportunities }, { data: profile }] = await Promise.all([
    supabaseAdmin.from('opportunities').select('id, title, requirements').order('title', { ascending: true }),
    supabaseAdmin.from('profile_snapshots').select('pending_items').eq('is_current', true).maybeSingle(),
  ])
  return NextResponse.json({
    opportunities: (opportunities ?? []).map((o) => ({
      id: o.id,
      title: o.title,
      requirements: (o.requirements ?? []) as { label: string; satisfied: boolean }[],
    })),
    pendingItems: (profile?.pending_items ?? []) as { item: string; status: string }[],
  })
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const tool = body.tool as ToolName
  const input = (body.input ?? {}) as Record<string, unknown>

  if (!TOOL_DEFS.some((t) => t.name === tool)) {
    return NextResponse.json({ error: `Unknown tool: ${tool}` }, { status: 400 })
  }

  if (WRITE_TOOLS.has(tool)) {
    const { data: log, error } = await supabaseAdmin
      .from('command_log')
      .insert({ prompt: `Palette: ${tool}`, status: 'pending', actions: [{ type: 'pending_write', tool, input }] })
      .select('*')
      .single()
    if (error || !log) return NextResponse.json({ error: error?.message ?? 'Could not create command_log row' }, { status: 500 })
    return NextResponse.json({
      pending: true,
      commandLogId: log.id,
      proposedAction: { tool, input, summary: humanizeWriteAction(tool, input) },
    })
  }

  const result = await executeReadTool(tool, input)
  await supabaseAdmin.from('command_log').insert({ prompt: `Palette: ${tool}`, status: 'read_only', actions: [{ type: 'tool_call', tool, input, output: result }] })
  return NextResponse.json({ done: true, result })
}
