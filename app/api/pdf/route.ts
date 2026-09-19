import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { html, filename } = await req.json()
    if (!html) return NextResponse.json({ error: 'Missing html' }, { status: 400 })

    // Return HTML wrapped for print — client handles window.print()
    const printHtml = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>${filename || 'ATLAS Export'}</title>
<style>
  body { font-family: Georgia, serif; max-width: 800px; margin: 40px auto; color: #1a1a1a; line-height: 1.7; font-size: 12pt; }
  h1 { font-size: 16pt; margin-bottom: 4px; }
  h2 { font-size: 13pt; margin: 16px 0 6px; border-bottom: 1px solid #ccc; padding-bottom: 4px; }
  p { margin: 0 0 10px; }
  pre { white-space: pre-wrap; font-family: inherit; }
  @media print { body { margin: 20px; } }
</style>
</head>
<body>${html}</body>
</html>`

    return NextResponse.json({ printHtml, filename })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
