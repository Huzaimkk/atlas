import { NextRequest, NextResponse } from 'next/server'
import { SYSTEM_PROMPTS } from '@/lib/profile'
import { supabaseAdmin } from '@/lib/supabase'
import { TOOL_DEFS, WRITE_TOOLS, executeReadTool, executeWriteTool, type ToolName } from '@/lib/command-tools'

// Node.js runtime (Fluid Compute) — dropped the old `edge` export. Nothing
// here needs Edge, and the command-bar path makes several sequential
// Supabase + CometAPI round-trips per request that are better served by
// Node's longer default timeout.

const COMMAND_SYSTEM_PROMPT = `You are Atlas's command bar for Huzaim Akhtar's PhD/scholarship diagnostic engine.

You have read tools (query_deadlines, explain_verdict, query_gap_queue, search_pool) and write tools
(mark_requirement_satisfied, update_profile_credential, add_opportunity_from_search).

Hard rule, non-negotiable: you may never state a deadline, eligibility rule, or funding figure from your
own training-data recall. Any fact about a specific program must come from a tool call that reads the
database (already-verified data) or a real web search result — never from what you already "know" about
a program. If you don't have a tool result to back a specific claim, say you don't have it, don't guess.

Use read tools freely and immediately — they're safe. For a write tool, you MUST call it (don't just
describe what you'd do) — the system intercepts write tool calls before they execute and shows the user
a confirmation prompt; you never see the result until they approve it. Keep answers concise and specific,
citing the actual numbers/quotes the tools return.`

async function callCometAPI(messages: unknown[], tools?: unknown[]) {
  const apiKey = process.env.COMET_API_KEY
  const apiUrl = process.env.COMET_API_URL || 'https://api.cometapi.com/v1/messages'
  if (!apiKey) throw new Error('COMET_API_KEY not configured')

  const res = await fetch(apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      system: COMMAND_SYSTEM_PROMPT,
      messages,
      ...(tools ? { tools } : {}),
    }),
  })
  if (!res.ok) throw new Error(`CometAPI error: ${res.status} — ${await res.text()}`)
  return res.json()
}

function humanizeWriteAction(tool: ToolName, input: Record<string, unknown>): string {
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

export async function GET() {
  const { data, error } = await supabaseAdmin.from('command_log').select('*').order('created_at', { ascending: false }).limit(50)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ history: data })
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    // ---- Confirm/reject a pending write from a previous /command turn ----
    if (body.confirmCommandLogId) {
      const { data: log, error: logErr } = await supabaseAdmin.from('command_log').select('*').eq('id', body.confirmCommandLogId).single()
      if (logErr || !log) return NextResponse.json({ error: 'Command not found' }, { status: 404 })
      if (log.status !== 'pending') return NextResponse.json({ error: `Command is already ${log.status}` }, { status: 409 })

      const pending = (log.actions as Array<{ type: string; tool: ToolName; input: Record<string, unknown> }>).find((a) => a.type === 'pending_write')
      if (!pending) return NextResponse.json({ error: 'No pending write on this command' }, { status: 400 })

      if (!body.approve) {
        await supabaseAdmin.from('command_log').update({ status: 'rejected' }).eq('id', log.id)
        return NextResponse.json({ status: 'rejected' })
      }

      const result = await executeWriteTool(pending.tool, pending.input)
      const actions = [...(log.actions as unknown[]), { type: 'write_executed', tool: pending.tool, input: pending.input, output: result }]
      await supabaseAdmin.from('command_log').update({ status: 'confirmed', confirmed_at: new Date().toISOString(), actions }).eq('id', log.id)
      return NextResponse.json({ status: 'confirmed', result })
    }

    // ---- Legacy agent path (the 8 pre-v2 toolkit agents) — unchanged ----
    if (body.agentType) {
      const { agentType, userMessage, stream = true } = body
      if (!userMessage) return new Response(JSON.stringify({ error: 'Missing userMessage' }), { status: 400 })
      const systemPrompt = SYSTEM_PROMPTS[agentType as keyof typeof SYSTEM_PROMPTS]
      if (!systemPrompt) return new Response(JSON.stringify({ error: 'Invalid agent type' }), { status: 400 })

      const apiKey = process.env.COMET_API_KEY
      const apiUrl = process.env.COMET_API_URL || 'https://api.cometapi.com/v1/messages'
      if (!apiKey) return new Response(JSON.stringify({ error: 'API key not configured' }), { status: 500 })

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({ model: 'claude-sonnet-4-20250514', max_tokens: 2000, stream, system: systemPrompt, messages: [{ role: 'user', content: userMessage }] }),
      })
      if (!response.ok) return new Response(JSON.stringify({ error: `API error: ${response.status} — ${await response.text()}` }), { status: response.status })
      if (stream) return new Response(response.body, { headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' } })
      const data = await response.json()
      return new Response(JSON.stringify({ text: data.content?.[0]?.text || '' }), { headers: { 'Content-Type': 'application/json' } })
    }

    // ---- Command bar ----
    const command = String(body.command ?? '')
    if (!command) return NextResponse.json({ error: 'Missing command' }, { status: 400 })

    const { data: log } = await supabaseAdmin.from('command_log').insert({ prompt: command, status: 'pending', actions: [] }).select('*').single()
    if (!log) return NextResponse.json({ error: 'Could not create command_log row' }, { status: 500 })

    const messages: Array<{ role: string; content: unknown }> = [{ role: 'user', content: command }]
    const actions: unknown[] = []

    // Agentic loop: execute read tools inline, stop and surface the first write tool for confirmation.
    for (let turn = 0; turn < 6; turn++) {
      let response
      try {
        response = await callCometAPI(messages, TOOL_DEFS)
      } catch (err) {
        await supabaseAdmin.from('command_log').update({ status: 'rejected', actions: [...actions, { type: 'error', message: String(err) }] }).eq('id', log.id)
        return NextResponse.json({ error: String(err), commandLogId: log.id }, { status: 502 })
      }
      const toolUses = (response.content ?? []).filter((b: { type: string }) => b.type === 'tool_use')
      const textBlocks = (response.content ?? []).filter((b: { type: string }) => b.type === 'text').map((b: { text: string }) => b.text)

      if (toolUses.length === 0) {
        await supabaseAdmin.from('command_log').update({ status: 'read_only', actions }).eq('id', log.id)
        return NextResponse.json({ done: true, text: textBlocks.join('\n'), commandLogId: log.id, actions })
      }

      const writeCall = toolUses.find((t: { name: string }) => WRITE_TOOLS.has(t.name as ToolName))
      if (writeCall) {
        const pendingAction = { type: 'pending_write', tool: writeCall.name, input: writeCall.input }
        await supabaseAdmin.from('command_log').update({ actions: [...actions, pendingAction] }).eq('id', log.id)
        return NextResponse.json({
          pending: true,
          commandLogId: log.id,
          text: textBlocks.join('\n'),
          proposedAction: { tool: writeCall.name, input: writeCall.input, summary: humanizeWriteAction(writeCall.name, writeCall.input) },
        })
      }

      // All tool calls this turn are reads — execute them, feed results back, loop.
      messages.push({ role: 'assistant', content: response.content })
      const toolResults = []
      for (const call of toolUses) {
        const output = await executeReadTool(call.name, call.input)
        actions.push({ type: 'tool_call', tool: call.name, input: call.input, output })
        toolResults.push({ type: 'tool_result', tool_use_id: call.id, content: JSON.stringify(output) })
      }
      messages.push({ role: 'user', content: toolResults })
      await supabaseAdmin.from('command_log').update({ actions }).eq('id', log.id)
    }

    await supabaseAdmin.from('command_log').update({ status: 'read_only', actions }).eq('id', log.id)
    return NextResponse.json({ done: true, text: 'Reached the tool-call limit for this command — try narrowing it.', commandLogId: log.id, actions })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
