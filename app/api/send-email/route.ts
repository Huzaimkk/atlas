import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { to, subject, body, professorName, university } = await req.json()
    if (!to || !subject || !body) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

    const resendKey = process.env.RESEND_API_KEY
    const fromEmail = process.env.EMAIL_FROM || 'cto@clincell.org'

    if (!resendKey) {
      console.log('Email (no Resend key):', { to, subject })
      return NextResponse.json({ success: true, message: 'Add RESEND_API_KEY to send for real', dev: true })
    }

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${resendKey}` },
      body: JSON.stringify({
        from: `Huzaim Akhtar (ClinCell CTO) <${fromEmail}>`,
        to: [to], subject,
        text: body,
        html: `<div style="font-family:Georgia,serif;max-width:600px;margin:0 auto;padding:20px;color:#1a1a1a;line-height:1.7">${body.split('\n').map((l: string) => l.trim() ? `<p style="margin:0 0 12px">${l}</p>` : '<br/>').join('')}<hr style="border:none;border-top:1px solid #e0e0e0;margin:24px 0"/><p style="font-size:12px;color:#888">Sent via ATLAS | clincell.org</p></div>`
      })
    })

    const data = await res.json()
    if (!res.ok) return NextResponse.json({ error: data.message || 'Send failed' }, { status: 400 })
    return NextResponse.json({ success: true, emailId: data.id })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
