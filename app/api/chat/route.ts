import { NextRequest } from 'next/server'
import { SYSTEM_PROMPTS } from '@/lib/profile'

export const runtime = 'edge'

export async function POST(req: NextRequest) {
  try {
    const { agentType, userMessage, stream = true } = await req.json()

    if (!agentType || !userMessage) {
      return new Response(JSON.stringify({ error: 'Missing agentType or userMessage' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    const systemPrompt = SYSTEM_PROMPTS[agentType as keyof typeof SYSTEM_PROMPTS]
    if (!systemPrompt) {
      return new Response(JSON.stringify({ error: 'Invalid agent type' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    const apiKey = process.env.COMET_API_KEY
    const apiUrl = process.env.COMET_API_URL || 'https://api.cometapi.com/v1/messages'

    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'API key not configured' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    const body = {
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      stream: stream,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }]
    }

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify(body)
    })

    if (!response.ok) {
      const error = await response.text()
      return new Response(JSON.stringify({ error: `API error: ${response.status} — ${error}` }), {
        status: response.status,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    if (stream) {
      // Stream the response directly to client
      return new Response(response.body, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        }
      })
    } else {
      const data = await response.json()
      const text = data.content?.[0]?.text || ''
      return new Response(JSON.stringify({ text }), {
        headers: { 'Content-Type': 'application/json' }
      })
    }

  } catch (error) {
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}
