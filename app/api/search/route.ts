import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { query } = await req.json()
    const serperKey = process.env.SERPER_API_KEY

    if (!serperKey) {
      // Fallback: return a message to use AI knowledge only
      return NextResponse.json({ 
        organic: [],
        fallback: true,
        message: 'Web search not configured. Using AI knowledge only.' 
      })
    }

    const response = await fetch('https://google.serper.dev/search', {
      method: 'POST',
      headers: {
        'X-API-KEY': serperKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        q: query,
        num: 10,
        hl: 'en'
      })
    })

    const data = await response.json()
    
    // Extract useful snippets
    const results = (data.organic || []).map((r: any) => ({
      title: r.title,
      link: r.link,
      snippet: r.snippet
    }))

    return NextResponse.json({ organic: results })

  } catch (error) {
    return NextResponse.json({ organic: [], error: String(error) })
  }
}
