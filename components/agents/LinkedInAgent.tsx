'use client'

import AgentPanel from '@/components/agents/AgentPanel'
import { useState } from 'react'
import { TOP_PROFESSORS } from '@/lib/universities'

export default function LinkedInAgent() {
  const [profName, setProfName] = useState('')
  const [profUni, setProfUni] = useState('')
  const [profResearch, setProfResearch] = useState('')
  const [msgType, setMsgType] = useState<'connection' | 'message' | 'inmail'>('connection')

  const typeDescriptions = {
    connection: 'Short connection request note (300 chars max)',
    message: 'First message after connection accepted',
    inmail: 'Full InMail (premium LinkedIn, longer format)',
  }

  const inputStyle = { background: 'var(--surface2)', border: '1px solid var(--border2)', color: 'var(--text)', padding: '10px 14px', borderRadius: 8, fontSize: 13, outline: 'none', fontFamily: 'inherit' } as React.CSSProperties

  return (
    <AgentPanel
      agentType="email"
      title="LinkedIn Message Agent"
      description="Generate LinkedIn connection requests, first messages, and InMails for professor outreach."
      showDownload
      buildPrompt={() => {
        if (!profName || !profUni) { alert('Enter professor name and university'); return null }

        const prompts = {
          connection: `Write a LinkedIn connection request note for:\nProfessor: ${profName}\nUniversity: ${profUni}\nResearch: ${profResearch||'clinical AI/health technology'}\n\nRules:\n- MAX 300 characters (LinkedIn limit)\n- CTO framing: mention ClinCell + PULSE AI briefly\n- Reference their specific research in 1 sentence\n- Clear reason to connect\n- Professional but warm\n- End with "— Huzaim, CTO @ ClinCell"\n\nWrite ONLY the connection note text, nothing else. Count the characters.`,

          message: `Write a first LinkedIn message (after connection accepted) to:\nProfessor: ${profName}\nUniversity: ${profUni}\nResearch: ${profResearch||'clinical AI/health technology'}\n\nRules:\n- 2-3 short paragraphs max\n- CTO framing throughout\n- Reference their specific research\n- Introduce ClinCell + PULSE AI value prop\n- Propose short call or collaboration\n- Never mention admission in this message`,

          inmail: `Write a LinkedIn InMail to:\nProfessor: ${profName}\nUniversity: ${profUni}\nResearch: ${profResearch||'clinical AI/health technology'}\n\nFormat: Similar to email but LinkedIn-appropriate tone\n- Subject line (shorter than email)\n- CTO introduction\n- Research overlap with PULSE AI + ClinCell\n- Collaboration proposal\n- Call to action\n- Sign: Huzaim Akhtar, CTO ClinCell`
        }

        return prompts[msgType]
      }}
      renderInputs={() => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
            {(['connection', 'message', 'inmail'] as const).map(t => (
              <button key={t} onClick={() => setMsgType(t)} style={{ padding: '10px', borderRadius: 8, border: `1px solid ${msgType === t ? 'rgba(10,102,194,0.5)' : 'var(--border2)'}`, background: msgType === t ? 'rgba(10,102,194,0.1)' : 'transparent', color: msgType === t ? '#0a66c2' : 'var(--muted)', cursor: 'pointer', fontSize: 12, fontWeight: msgType === t ? 600 : 400 }}>
                {t === 'connection' ? '🔗 Connection Note' : t === 'message' ? '💬 First Message' : '📧 InMail'}
              </button>
            ))}
          </div>
          <div style={{ fontSize: 12, color: 'var(--muted)', padding: '6px 10px', background: 'var(--surface2)', borderRadius: 6 }}>
            {typeDescriptions[msgType]}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <input style={inputStyle} placeholder="Professor name *" value={profName} onChange={e => setProfName(e.target.value)} />
            <input style={inputStyle} placeholder="University *" value={profUni} onChange={e => setProfUni(e.target.value)} />
          </div>
          <textarea style={{ ...inputStyle, width: '100%', minHeight: 80, resize: 'vertical' as const, lineHeight: 1.6 }} placeholder="Their research focus (makes the message much more specific)..." value={profResearch} onChange={e => setProfResearch(e.target.value)} />
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
            <span style={{ fontSize: 11, color: 'var(--muted)' }}>Quick fill:</span>
            {TOP_PROFESSORS.slice(0, 5).map(p => (
              <button key={p.name} onClick={() => { setProfName(p.name); setProfUni(p.university); setProfResearch(p.research) }} style={{ fontSize: 11, padding: '3px 9px', borderRadius: 6, border: '1px solid var(--border2)', background: 'transparent', color: 'var(--muted)', cursor: 'pointer' }}>{p.name}</button>
            ))}
          </div>
        </div>
      )}
    />
  )
}
