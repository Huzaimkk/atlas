'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import AgentPanel from '@/components/agents/AgentPanel'
import LinkedInAgent from '@/components/agents/LinkedInAgent'
import { UNIVERSITIES, TOP_PROFESSORS } from '@/lib/universities'

const KanbanTracker = dynamic(() => import('@/components/tracker/KanbanTracker'), { ssr: false })
const EmailLog = dynamic(() => import('@/components/tracker/EmailLog'), { ssr: false })
const GRETracker = dynamic(() => import('@/components/tracker/GRETracker'), { ssr: false })
const DeadlineTracker = dynamic(() => import('@/components/tracker/DeadlineTracker'), { ssr: false })
const SettingsPage = dynamic(() => import('@/components/SettingsPage'), { ssr: false })

type Page =
  | 'dashboard' | 'profile'
  | 'professor' | 'cv' | 'email' | 'linkedin' | 'sop' | 'followup' | 'response' | 'interview'
  | 'universities' | 'tracker' | 'email-log' | 'deadlines' | 'gre'
  | 'settings'

const NAV: { section: string; items: { id: Page; label: string; icon: string; badge?: string }[] }[] = [
  {
    section: 'Command',
    items: [
      { id: 'dashboard', label: 'Dashboard', icon: '⬡' },
      { id: 'profile', label: 'My Profile', icon: '◈' },
    ],
  },
  {
    section: 'AI Agents',
    items: [
      { id: 'professor', label: 'Prof. Discovery', icon: '🔍', badge: 'AI' },
      { id: 'cv', label: 'CV Customizer', icon: '📄', badge: 'AI' },
      { id: 'email', label: 'Email Writer', icon: '✉️', badge: 'AI' },
      { id: 'linkedin', label: 'LinkedIn Agent', icon: '💼', badge: 'AI' },
      { id: 'sop', label: 'SOP Generator', icon: '📝', badge: 'AI' },
      { id: 'followup', label: 'Follow-Up', icon: '🔄', badge: 'AI' },
      { id: 'response', label: 'Reply Analyzer', icon: '📨', badge: 'AI' },
      { id: 'interview', label: 'Interview Prep', icon: '🎯', badge: 'AI' },
    ],
  },
  {
    section: 'Pipeline',
    items: [
      { id: 'tracker', label: 'Kanban Tracker', icon: '⬢' },
      { id: 'email-log', label: 'Email Log', icon: '📋' },
      { id: 'universities', label: 'Universities', icon: '🏛' },
      { id: 'deadlines', label: 'Deadlines', icon: '📅' },
      { id: 'gre', label: 'GRE Tracker', icon: '📊' },
    ],
  },
  {
    section: 'System',
    items: [{ id: 'settings', label: 'Settings', icon: '⚙️' }],
  },
]

// Shared inline styles
const I: React.CSSProperties = { background: 'var(--surface2)', border: '1px solid var(--border2)', color: 'var(--text)', padding: '10px 14px', borderRadius: 8, fontSize: 13, outline: 'none', fontFamily: 'inherit' }
const T: React.CSSProperties = { ...I, width: '100%', minHeight: 110, resize: 'vertical', lineHeight: 1.6 }
const CARD: React.CSSProperties = { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 20 }
const routeColor = (r: string) => r === 'professor' ? 'var(--accent)' : r === 'direct' ? 'var(--accent2)' : 'var(--accent4)'

export default function ATLASApp() {
  const [page, setPage] = useState<Page>('dashboard')

  // Track live stats from localStorage
  const [emailCount, setEmailCount] = useState(0)
  const [replyCount, setReplyCount] = useState(0)
  useEffect(() => {
    try {
      const logs = JSON.parse(localStorage.getItem('atlas-email-log') || '[]')
      setEmailCount(logs.filter((e: any) => e.status === 'sent' || e.status === 'replied').length)
      setReplyCount(logs.filter((e: any) => e.status === 'replied').length)
    } catch {}
  }, [page])

  // Agent input state
  const [pq, setPq] = useState(''); const [pu, setPu] = useState('')
  const [ci, setCi] = useState(''); const [ct, setCt] = useState('academic')
  const [ep, setEp] = useState(''); const [eu, setEu] = useState(''); const [er, setEr] = useState('')
  const [su, setSu] = useState(''); const [sp, setSp] = useState(''); const [sl, setSl] = useState('1000'); const [spr, setSpr] = useState('')
  const [fp, setFp] = useState(''); const [fu, setFu] = useState(''); const [fd, setFd] = useState('7')
  const [rt, setRt] = useState(''); const [rp, setRp] = useState('')
  const [ip, setIp] = useState(''); const [iu, setIu] = useState(''); const [ir, setIr] = useState('')

  const fillEmail = (name: string, uni: string, research: string) => {
    setEp(name); setEu(uni); setEr(research); setPage('email')
  }

  // Save completed email to log
  const saveEmailToLog = (output: string, profName: string, uni: string) => {
    try {
      const logs = JSON.parse(localStorage.getItem('atlas-email-log') || '[]')
      const subjectMatch = output.match(/Subject:?\s*(.+)/i)
      const subject = subjectMatch ? subjectMatch[1].trim() : 'Professor Outreach'
      const newEntry = {
        id: Date.now().toString(),
        professorName: profName,
        university: uni,
        subject,
        body: output,
        sentAt: new Date().toISOString(),
        status: 'draft'
      }
      localStorage.setItem('atlas-email-log', JSON.stringify([newEntry, ...logs]))
    } catch {}
  }

  const navTo = (id: Page) => setPage(id)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--bg)' }}>

      {/* ── Header ── */}
      <header style={{ padding: '13px 24px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--surface)', flexShrink: 0, zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 34, height: 34, background: 'linear-gradient(135deg,#6c63ff,#00d4aa)', borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 16, color: 'white', flexShrink: 0 }}>A</div>
          <div>
            <div style={{ fontSize: 17, fontWeight: 700, letterSpacing: '-0.3px' }}>ATLAS</div>
            <div style={{ fontSize: 10, color: 'var(--muted)', fontFamily: 'monospace' }}>Academic Targeting & Letter Automation System</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {[
            ['✉️', emailCount + ' sent', 'email-log'],
            ['↩️', replyCount + ' replies', 'email-log'],
          ].map(([icon, label, target]) => (
            <button key={label as string} onClick={() => navTo(target as Page)} style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'none', border: 'none', color: 'var(--muted)', fontSize: 12, cursor: 'pointer', fontFamily: 'monospace' }}>
              <span>{icon as string}</span>{label as string}
            </button>
          ))}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--accent2)', boxShadow: '0 0 8px var(--accent2)' }} />
            <span style={{ fontSize: 11, color: 'var(--accent2)', fontFamily: 'monospace' }}>AI Online</span>
          </div>
          <div style={{ background: 'rgba(108,99,255,0.15)', border: '1px solid rgba(108,99,255,0.3)', borderRadius: 6, padding: '3px 10px', fontSize: 11, color: 'var(--accent)', fontFamily: 'monospace' }}>CometAPI</div>
          <button onClick={() => navTo('settings')} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: 16 }}>⚙️</button>
        </div>
      </header>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        {/* ── Sidebar ── */}
        <nav style={{ width: 210, background: 'var(--surface)', borderRight: '1px solid var(--border)', padding: '14px 0', overflowY: 'auto', flexShrink: 0 }}>
          {NAV.map(section => (
            <div key={section.section} style={{ padding: '0 14px', marginBottom: 18 }}>
              <div style={{ fontSize: 10, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6, fontFamily: 'monospace' }}>{section.section}</div>
              {section.items.map(item => (
                <button key={item.id} onClick={() => setPage(item.id)}
                  style={{ display: 'flex', alignItems: 'center', gap: 9, width: '100%', padding: '7px 9px', borderRadius: 8, cursor: 'pointer', fontSize: 13, background: page === item.id ? 'rgba(108,99,255,0.15)' : 'transparent', color: page === item.id ? 'var(--accent)' : 'var(--muted)', border: 'none', marginBottom: 1, textAlign: 'left', transition: 'all 0.1s' }}
                  onMouseEnter={e => { if (page !== item.id) (e.currentTarget as HTMLElement).style.color = 'var(--text)' }}
                  onMouseLeave={e => { if (page !== item.id) (e.currentTarget as HTMLElement).style.color = 'var(--muted)' }}
                >
                  <span style={{ fontSize: 14, width: 18, textAlign: 'center' }}>{item.icon}</span>
                  <span style={{ flex: 1 }}>{item.label}</span>
                  {item.badge && <span style={{ background: 'var(--accent)', color: 'white', fontSize: 9, padding: '1px 5px', borderRadius: 8, fontFamily: 'monospace' }}>{item.badge}</span>}
                </button>
              ))}
            </div>
          ))}
        </nav>

        {/* ── Main ── */}
        <main style={{ flex: 1, overflowY: 'auto', padding: 24 }}>

          {/* ─── DASHBOARD ─── */}
          {page === 'dashboard' && (
            <div>
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>Command Center ✦</div>
                <div style={{ fontSize: 13, color: 'var(--muted)' }}>Huzaim Akhtar · CTO @ ClinCell · 24 target universities · 8 AI agents</div>
              </div>

              {/* Stats */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 20 }}>
                {[
                  ['24', 'Target Universities', 'var(--accent)'],
                  [emailCount.toString(), 'Emails Sent', 'var(--accent2)'],
                  [replyCount.toString(), 'Prof. Replies', 'var(--accent4)'],
                  ['16d', 'H-1B Lottery', 'var(--accent3)'],
                ].map(([v, l, c]) => (
                  <div key={l} style={{ ...CARD }}><div style={{ fontSize: 28, fontWeight: 700, color: c, marginBottom: 4 }}>{v}</div><div style={{ fontSize: 12, color: 'var(--muted)' }}>{l}</div></div>
                ))}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                {/* Priority actions */}
                <div style={{ ...CARD }}>
                  <div style={{ fontSize: 12, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 14, fontFamily: 'monospace' }}>⚡ Priority Actions</div>
                  {[
                    ['🔴', 'Upload IEEE paper to arXiv TODAY', 'Most important — gives professors a citable link'],
                    ['🔴', 'O-1A attorney before April 1st', 'H-1B lottery opens in 16 days. O-1A has no lottery.'],
                    ['🟡', 'Send emails to Dina Katabi + Zak Kohane', 'Use Email Writer → cto@clincell.org'],
                    ['🟡', 'Book GRE exam — sit within 60 days', 'Target 167+ Quant. Track in GRE Tracker.'],
                    ['🟢', 'PULSE AI + Aladdin AI GitHub → public', 'Professors will Google you'],
                    ['🟢', 'Apply NVIDIA Inception Program', 'nvidia.com/inception — direct hiring pipeline'],
                  ].map(([d, a, det]) => (
                    <div key={a} style={{ display: 'flex', gap: 10, padding: '8px 10px', background: 'var(--surface2)', borderRadius: 8, marginBottom: 6, border: '1px solid var(--border)' }}>
                      <span style={{ fontSize: 13, marginTop: 1 }}>{d}</span>
                      <div><div style={{ fontSize: 12, fontWeight: 500, marginBottom: 1 }}>{a}</div><div style={{ fontSize: 11, color: 'var(--muted)' }}>{det}</div></div>
                    </div>
                  ))}
                </div>

                {/* Quick email buttons */}
                <div>
                  <div style={{ ...CARD, marginBottom: 12 }}>
                    <div style={{ fontSize: 12, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12, fontFamily: 'monospace' }}>🎯 Quick Email — Top Professors</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {TOP_PROFESSORS.slice(0, 5).map(p => (
                        <button key={p.name} onClick={() => fillEmail(p.name, p.university, p.research)}
                          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 12px', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8, cursor: 'pointer', textAlign: 'left', transition: 'border 0.1s' }}
                          onMouseEnter={e => (e.currentTarget.style.border = '1px solid var(--accent)')}
                          onMouseLeave={e => (e.currentTarget.style.border = '1px solid var(--border)')}
                        >
                          <div>
                            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', marginBottom: 1 }}>{p.name}</div>
                            <div style={{ fontSize: 11, color: 'var(--muted)' }}>{p.university} · {p.dept}</div>
                          </div>
                          <span style={{ fontSize: 11, color: 'var(--accent)', fontFamily: 'monospace', flexShrink: 0 }}>{p.fit}/10 →</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Profile strength */}
                  <div style={{ ...CARD }}>
                    <div style={{ fontSize: 12, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12, fontFamily: 'monospace' }}>📊 Profile Strength</div>
                    {[
                      ['Overall CV', 92, 'var(--accent2)'],
                      ['H-1B Petition', 86, 'var(--accent)'],
                      ['Ivy League (with CTO)', 81, 'var(--accent)'],
                      ['NVIDIA / Tesla Fit', 92, 'var(--accent2)'],
                      ['Germany / EU Fit', 95, 'var(--accent2)'],
                    ].map(([label, pct, color]) => (
                      <div key={label as string} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                        <span style={{ fontSize: 12, color: 'var(--muted)', flex: 1.2 }}>{label as string}</span>
                        <div style={{ flex: 2, background: 'var(--surface2)', borderRadius: 3, height: 5 }}>
                          <div style={{ width: `${pct}%`, height: 5, borderRadius: 3, background: color as string }} />
                        </div>
                        <span style={{ fontSize: 12, fontWeight: 600, color: color as string, minWidth: 32, textAlign: 'right', fontFamily: 'monospace' }}>{(pct as number / 10).toFixed(1)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Navigation shortcuts */}
              <div style={{ ...CARD }}>
                <div style={{ fontSize: 12, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 14, fontFamily: 'monospace' }}>🚀 Jump To</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                  {([
                    ['🔍', 'Find Professors', 'professor'],
                    ['✉️', 'Write Email', 'email'],
                    ['📝', 'Generate SOP', 'sop'],
                    ['🎯', 'Interview Prep', 'interview'],
                    ['⬢', 'Kanban Tracker', 'tracker'],
                    ['📅', 'Deadlines', 'deadlines'],
                    ['📊', 'GRE Tracker', 'gre'],
                    ['🏛', 'Universities', 'universities'],
                  ] as [string, string, Page][]).map(([icon, label, target]) => (
                    <button key={target} onClick={() => navTo(target)}
                      style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 9, cursor: 'pointer', fontSize: 12, color: 'var(--text)', transition: 'all 0.12s' }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--accent)'; (e.currentTarget as HTMLElement).style.color = 'var(--accent)' }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'; (e.currentTarget as HTMLElement).style.color = 'var(--text)' }}
                    >
                      <span style={{ fontSize: 16 }}>{icon}</span>{label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ─── PROFILE ─── */}
          {page === 'profile' && (
            <div style={{ ...CARD }}>
              <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', marginBottom: 20 }}>
                <div style={{ width: 58, height: 58, borderRadius: 12, background: 'linear-gradient(135deg,#6c63ff,#00d4aa)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 700, color: 'white', flexShrink: 0 }}>HA</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 3 }}>Huzaim Akhtar, BE</div>
                  <div style={{ fontSize: 13, color: 'var(--accent2)', fontFamily: 'monospace', marginBottom: 10 }}>Chief Technology Officer @ ClinCell · cto@clincell.org</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {[['NVIDIA 6G Developer', 'var(--accent2)'], ['Oracle GenAI Certified', 'var(--accent2)'], ['IEEE Paper (Review)', 'var(--accent)'], ['Meta Hacker Cup Top 1K', 'var(--accent)'], ['McKinsey Forward', 'var(--accent4)'], ['RAISE Paris 2025', 'var(--accent4)']].map(([l, c]) => (
                      <span key={l} style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20, border: `1px solid ${c}44`, color: c, background: `${c}11` }}>{l}</span>
                    ))}
                  </div>
                </div>
              </div>

              <div style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 10, padding: 14, marginBottom: 16 }}>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>PULSE AI: An Integrated Wearable System for Real-Time Cardiovascular and Neural Monitoring</div>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 8 }}>Talha Tariq · Huzaim Akhtar · Abdul Haadi — Dawood University · Karachi, Pakistan</div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {['80% Arrhythmia Accuracy', 'ECG/EEG Multi-channel', 'CNN + LSTM + Random Forest', 'MIT-BIH Dataset', 'DOW Medical Evaluated', 'Dawn News Featured', 'Dubai AI Conf 2025', 'Under IEEE Review'].map(t => (
                    <span key={t} style={{ fontSize: 10, padding: '2px 8px', borderRadius: 10, border: '1px solid rgba(0,212,170,0.3)', color: 'var(--accent2)', background: 'rgba(0,212,170,0.08)' }}>{t}</span>
                  ))}
                </div>
              </div>

              <div style={{ fontSize: 12, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10, fontFamily: 'monospace' }}>Active Ventures (4)</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
                {[
                  ['PULSE AI', 'Healthcare AI', 'Wearable CVD+neural monitoring. 80% accuracy. DOW Medical. Dawn News. IEEE under review. OpenBCI + ESP32 + Raspberry Pi.', 'June 2024 – Present'],
                  ['Aladdin AI', 'Fintech LLM', '4 custom LLMs: multilingual agent, Forex/crypto intelligence, market graph TA/FA, agent-rental platform. RAISE Summit Paris 2025.', 'Jul 2025 – Present'],
                  ['ClinCell', 'Clinical · USA (CTO)', 'US clinical data platform. React + Next.js 15 + CRM backend. Co-founders: M. Bilal Abid MD FRCP (CEO) + Shaheen Q. Khani MD CCRP (COO).', 'Aug 2025 – Present'],
                  ['Berry AI', 'Developer Tools', 'AI developer tools platform. Live at berry-ai.vercel.app.', 'Ongoing'],
                ].map(([n, t, d, dt]) => (
                  <div key={n} style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 10, padding: 14 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                      <span style={{ fontSize: 13, fontWeight: 600 }}>{n}</span>
                      <span style={{ fontSize: 10, color: 'var(--muted)', fontFamily: 'monospace' }}>{t}</span>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.55, marginBottom: 6 }}>{d}</div>
                    <div style={{ fontSize: 10, color: 'var(--accent4)', fontFamily: 'monospace' }}>{dt}</div>
                  </div>
                ))}
              </div>

              <div style={{ fontSize: 12, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10, fontFamily: 'monospace' }}>Key Credentials (all verifiable)</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {[
                  ['NVIDIA 6G Developer Program', 'Approved Member · NGC + AI Aerial + Omniverse · March 2026'],
                  ['Oracle GenAI Professional', 'Cert ID: 1G2QFDSW6UW8 · Verified Coursera · March 2026'],
                  ['NVIDIA Jetson Nano', 'Cert ID: dMDue6-qRPeCMifwzmQ2GQ · March 2026'],
                  ['Meta Hacker Cup 2024', 'Global Top 1,000 / 13,262 participants'],
                  ['McKinsey Forward Fellow', 'Verifiable McKinsey.org digital badge · Dec 2024'],
                  ['Oxford Kangaroo Math', 'Top 3.44% nationally · 9,500 participants · 2014'],
                  ['RAISE Summit Paris 2025', 'Hackathon at Le Carrousel du Louvre · Jul 2025'],
                  ['function1 AI Dubai 2025', 'Pitched PULSE AI at AI Conference & Exhibition'],
                ].map(([t, s]) => (
                  <div key={t} style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 12px' }}>
                    <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 2 }}>{t}</div>
                    <div style={{ fontSize: 11, color: 'var(--muted)', lineHeight: 1.4 }}>{s}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ─── PROFESSOR DISCOVERY ─── */}
          {page === 'professor' && (
            <AgentPanel agentType="professor" title="Professor Discovery Agent" showDownload
              description="Find professors whose research aligns with your profile. Real names, emails, fit scores, and collaboration angles."
              buildPrompt={() => {
                if (!pq) { alert('Enter a research area'); return null }
                return `Find 5 professors at ${pu || 'top global universities (MIT, Stanford, Harvard, CMU, Columbia, ETH Zurich, TU Munich)'} who research: "${pq}"\n\nFor EACH professor provide:\n— Full name, title, department, university\n— Email address (use known public emails; format: name@university.edu)\n— Research focus (2-3 sentences from their actual work)\n— Most relevant recent paper title\n— Fit score 1-10 vs Huzaim's PULSE AI wearable cardiovascular AI + ClinCell clinical data platform\n— Specific collaboration angle: what can Huzaim offer them (real patient data, deployed system, FRCP physician co-founders, industry partnership)\n— Best opening line for cold outreach from cto@clincell.org\n\nBe specific. Prioritize professors who would benefit from real clinical deployment data.`
              }}
              renderInputs={() => (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <input style={{ ...I, width: '100%' }} placeholder="Research area (e.g. wearable cardiovascular AI, clinical EHR deep learning, biosignal processing...)" value={pq} onChange={e => setPq(e.target.value)} />
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                    <select style={{ ...I, minWidth: 160 } as React.CSSProperties} value={pu} onChange={e => setPu(e.target.value)}>
                      <option value="">All universities</option>
                      {['MIT', 'Stanford', 'Harvard', 'Yale', 'CMU', 'Cornell Tech', 'Columbia', 'Johns Hopkins', 'U Toronto', 'ETH Zurich', 'TU Munich', 'EPFL', 'Imperial College', 'KAUST'].map(u => <option key={u}>{u}</option>)}
                    </select>
                    <span style={{ fontSize: 11, color: 'var(--muted)' }}>Quick:</span>
                    {['wearable cardiovascular AI', 'clinical EHR machine learning', 'biosignal deep learning'].map(q => (
                      <button key={q} onClick={() => setPq(q)} style={{ fontSize: 11, padding: '5px 10px', borderRadius: 6, border: '1px solid var(--border2)', background: 'transparent', color: 'var(--muted)', cursor: 'pointer' }}>{q}</button>
                    ))}
                  </div>
                </div>
              )}
            />
          )}

          {/* ─── CV CUSTOMIZER ─── */}
          {page === 'cv' && (
            <AgentPanel agentType="cv" title="CV Customization Agent" showDownload
              description="Paste a professor's research focus — get a tailored CV narrative maximizing your relevance to their specific work."
              buildPrompt={() => {
                if (!ci) { alert('Paste the professor research focus'); return null }
                return `Generate a tailored CV strategy for Huzaim targeting this professor/context:\n\n"${ci}"\n\nCV version: ${ct}\n\nProvide:\n1. EXECUTIVE SUMMARY (3-4 lines to add at top of CV — tailored to this exact research context)\n2. SECTION ORDER (list sections in optimal order for this professor)\n3. BULLETS TO LEAD WITH (copy the exact bullets from his profile that are most relevant)\n4. NEW BULLETS TO ADD (write 1-2 new tailored bullets specific to this professor's interest)\n5. KEYWORDS TO ADD to skills section\n6. WHAT TO DOWNPLAY (sections less relevant to this professor)\n7. FRAMING NOTE (how to position the CTO role + PULSE AI + ASML experience for this audience)\n\nAlways maintain CTO framing. Never position Huzaim as a student or entry-level candidate.`
              }}
              renderInputs={() => (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <select style={{ ...I, minWidth: 160 } as React.CSSProperties} value={ct} onChange={e => setCt(e.target.value)}>
                    <option value="academic">Academic / Research CV</option>
                    <option value="executive">Executive CTO Version</option>
                    <option value="industry">Industry / NVIDIA / Tesla</option>
                    <option value="germany">Germany / EU Version</option>
                    <option value="biomedical">Biomedical / Clinical AI</option>
                  </select>
                  <textarea style={T} placeholder="Paste the professor's research focus, lab description, or paper abstract...&#10;&#10;Example: Prof. Dina Katabi at MIT CSAIL develops RF-based health sensing using wireless signals to detect heart rate, breathing, and sleep. Her lab built EQ-Radio, WiGait, and Emerald (Parkinson's monitoring) — all contactless vital sign systems." value={ci} onChange={e => setCi(e.target.value)} />
                </div>
              )}
            />
          )}

          {/* ─── EMAIL WRITER ─── */}
          {page === 'email' && (
            <AgentPanel agentType="email" title="Professor Email Writer" showDownload
              description="Personalized CTO outreach email from cto@clincell.org. Collaboration framing. Never student framing."
              onComplete={(text) => saveEmailToLog(text, ep, eu)}
              buildPrompt={() => {
                if (!ep || !eu) { alert('Enter professor name and university'); return null }
                return `Write a complete professor outreach email:\n\nPROFESSOR: ${ep}\nUNIVERSITY: ${eu}\nTHEIR RESEARCH: ${er || 'general AI/healthcare technology research'}\n\nSTRICT REQUIREMENTS:\n— FROM: cto@clincell.org — CTO framing throughout, NEVER student framing\n— SUBJECT LINE: Compelling, professional, references their specific research by name\n— PARAGRAPH 1: Reference their SPECIFIC recent paper or project by name and connect it to Huzaim's work on PULSE AI\n— PARAGRAPH 2: Introduce ClinCell (US-registered clinical platform, co-founded with M. Bilal Abid MD FACP MRCP FRCP and Shaheen Q. Khani MD CCRP) + PULSE AI results (80% arrhythmia accuracy, DOW Medical evaluation, IEEE paper under review, Dawn News feature)\n— PARAGRAPH 3: Specific research collaboration opportunity — what Huzaim brings: real patient data infrastructure, deployed wearable AI, FRCP physician co-founders, industry partnership\n— PARAGRAPH 4: Small ask — 20-minute video call + offer to share IEEE preprint\n— SIGN OFF: Huzaim Akhtar | Chief Technology Officer, ClinCell | cto@clincell.org | clincell.org\n\nDO NOT mention grad school admission anywhere. This is peer-to-peer collaboration from a CTO to a professor.\n\nWrite the complete, ready-to-send email including subject line.`
              }}
              renderInputs={() => (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <input style={I} placeholder="Professor name *" value={ep} onChange={e => setEp(e.target.value)} />
                    <input style={I} placeholder="University *" value={eu} onChange={e => setEu(e.target.value)} />
                  </div>
                  <textarea style={T} placeholder="Paste their research focus or paper abstract (highly recommended — makes the email much more specific and credible)..." value={er} onChange={e => setEr(e.target.value)} />
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                    <span style={{ fontSize: 11, color: 'var(--muted)' }}>Quick fill:</span>
                    {TOP_PROFESSORS.slice(0, 5).map(p => (
                      <button key={p.name} onClick={() => { setEp(p.name); setEu(p.university); setEr(p.research) }} style={{ fontSize: 11, padding: '4px 10px', borderRadius: 6, border: '1px solid var(--border2)', background: 'transparent', color: 'var(--muted)', cursor: 'pointer' }}>{p.name}</button>
                    ))}
                  </div>
                </div>
              )}
            />
          )}

          {/* ─── LINKEDIN ─── */}
          {page === 'linkedin' && <LinkedInAgent />}

          {/* ─── SOP GENERATOR ─── */}
          {page === 'sop' && (
            <AgentPanel agentType="sop" title="Statement of Purpose Generator" showDownload
              description="CTO-first SOP. Not a student applying — a founder seeking research partnership to advance clinical AI globally."
              buildPrompt={() => {
                if (!su || !sp) { alert('Enter university and program'); return null }
                return `Write a complete Statement of Purpose:\n\nUNIVERSITY: ${su}\nPROGRAM: ${sp}\nTARGET LENGTH: approximately ${sl} words\nPROFESSOR IN CORRESPONDENCE: ${spr || 'None yet'}\n\nNARRATIVE REQUIREMENTS:\n— OPENING: Lead with CTO role at ClinCell (not with childhood or early education)\n— PULSE AI: cite specific results (80% arrhythmia + stroke detection accuracy, MIT-BIH + EEG Stroke Patient datasets, DOW Medical University clinical evaluation, IEEE journal paper under review, Dawn News feature, Dubai AI Conference 2025)\n— CLINCELL: US-registered clinical data platform, FRCP co-founders provide institutional medical credibility\n— ASML: industrial automation (Siemens S7-300, ABB drives, CCD Pro computer vision, Herkules CNC) = rare hardware+AI dual expertise\n— NVIDIA: 6G Developer Program approved member = industry recognition\n${spr ? `— PROFESSOR: Reference ${spr} by name and their specific research, explain how it connects to PULSE AI/ClinCell\n` : ''}\n— CLOSE: Specific research questions to pursue at ${su}, why this program specifically\n— TONE: Confident researcher-entrepreneur. Admissions should feel lucky to have him, not like they're doing him a favor.\n— NARRATIVE ARC: "I am building clinical AI at scale. I need the research depth of ${su} to push it to global clinical deployment."\n\nWrite the complete SOP, formatted and ready to submit.`
              }}
              renderInputs={() => (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <input style={I} placeholder="University *" value={su} onChange={e => setSu(e.target.value)} />
                    <input style={I} placeholder="Program (e.g. MS Biomedical Engineering) *" value={sp} onChange={e => setSp(e.target.value)} />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <select style={{ ...I } as React.CSSProperties} value={sl} onChange={e => setSl(e.target.value)}>
                      <option value="500">500 words</option>
                      <option value="1000">1000 words</option>
                      <option value="1500">1500 words</option>
                    </select>
                    <input style={I} placeholder="Professor name (if in correspondence — strongly recommended)" value={spr} onChange={e => setSpr(e.target.value)} />
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                    <span style={{ fontSize: 11, color: 'var(--muted)' }}>Quick fill university:</span>
                    {['Cornell Tech', 'Columbia', 'CMU', 'Harvard', 'MIT', 'Georgia Tech', 'TU Munich'].map(u => (
                      <button key={u} onClick={() => setSu(u)} style={{ fontSize: 11, padding: '4px 8px', borderRadius: 6, border: '1px solid var(--border2)', background: 'transparent', color: 'var(--muted)', cursor: 'pointer' }}>{u}</button>
                    ))}
                  </div>
                </div>
              )}
            />
          )}

          {/* ─── FOLLOW-UP ─── */}
          {page === 'followup' && (
            <AgentPanel agentType="followup" title="Follow-Up Email Agent"
              description="Short, professional follow-up when professors haven't replied. Adds new value. Never desperate."
              buildPrompt={() => {
                if (!fp || !fu) { alert('Enter professor name and university'); return null }
                return `Write a follow-up email:\n\nPROFESSOR: ${fp}\nUNIVERSITY: ${fu}\nDAYS SINCE FIRST EMAIL: ${fd}\n\nREQUIREMENTS:\n— Maximum 4-5 sentences total\n— Different subject line (NOT "Following up" or "Re:") — should add new context\n— Add ONE piece of new value: e.g. "We just uploaded our IEEE preprint to arXiv: [title]" OR "ClinCell onboarded its first clinical research site last week" OR "Our arrhythmia detection accuracy improved to 83% with the updated model"\n— Brief reference to original email (1 sentence)\n— Same small ask: 20-minute call\n— Tone: confident, not apologetic, peer-to-peer\n— CTO framing throughout\n\nWrite the complete follow-up email including subject line.`
              }}
              renderInputs={() => (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                  <input style={I} placeholder="Professor name *" value={fp} onChange={e => setFp(e.target.value)} />
                  <input style={I} placeholder="University *" value={fu} onChange={e => setFu(e.target.value)} />
                  <select style={{ ...I } as React.CSSProperties} value={fd} onChange={e => setFd(e.target.value)}>
                    <option value="7">7 days — no reply</option>
                    <option value="14">14 days — no reply</option>
                    <option value="21">21 days — no reply</option>
                  </select>
                </div>
              )}
            />
          )}

          {/* ─── REPLY ANALYZER ─── */}
          {page === 'response' && (
            <AgentPanel agentType="response" title="Professor Reply Analyzer"
              description="Paste a professor's reply — get sentiment analysis, key signals, and a draft response."
              buildPrompt={() => {
                if (!rt) { alert('Paste the professor reply'); return null }
                return `Analyze this professor reply to Huzaim's outreach:\n\nPROFESSOR: ${rp || 'Unknown'}\nTHEIR REPLY:\n"${rt}"\n\nProvide:\n1. SENTIMENT: Positive / Neutral / Negative — with confidence % and reasoning\n2. KEY SIGNALS: Quote specific phrases that indicate interest, hesitation, or next steps\n3. WHAT THEY ACTUALLY WANT: Translate their academic language into plain terms\n4. NEXT STEP: Exact recommended action (e.g. "Schedule call within 48 hours", "Send preprint now", "Wait and send follow-up in 7 days")\n5. RESPONSE DRAFT: Write the complete ideal reply email\n6. ADMISSION TIMING: If positive, exactly when and how to raise grad school interest naturally in the conversation\n7. RED FLAGS: Any signals of disinterest Huzaim should be aware of`
              }}
              renderInputs={() => (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <input style={{ ...I, width: '100%' }} placeholder="Professor name (optional but helpful)" value={rp} onChange={e => setRp(e.target.value)} />
                  <textarea style={{ ...T, minHeight: 160 }} placeholder="Paste the professor's reply email here..." value={rt} onChange={e => setRt(e.target.value)} />
                </div>
              )}
            />
          )}

          {/* ─── INTERVIEW PREP ─── */}
          {page === 'interview' && (
            <AgentPanel agentType="interview" title="Interview Prep Agent" showDownload
              description="Professor agreed to a call? Get a complete briefing: their research, what to offer, what to ask, when to mention grad school."
              buildPrompt={() => {
                if (!ip || !iu) { alert('Enter professor and university'); return null }
                return `Generate a complete interview prep briefing for this professor call:\n\nPROFESSOR: ${ip}\nUNIVERSITY: ${iu}\nTHEIR RESEARCH: ${ir || 'clinical AI, health technology, wearable systems'}\n\nProvide:\n1. PROFESSOR PROFILE: Key research areas, flagship papers, lab's current focus and open problems\n2. WHAT HUZAIM UNIQUELY OFFERS:\n   — Real patient data infrastructure (ClinCell, US-registered)\n   — Deployed wearable AI system (PULSE AI, 80% accuracy, clinically evaluated)\n   — FRCP physician co-founders (Dr. M. Bilal Abid MD FACP MRCP FRCP — adds institutional medical credibility to any joint paper)\n   — Industry partner (not just a student with ideas)\n3. LIKELY QUESTIONS THEY'LL ASK + ideal answers for each\n4. QUESTIONS HUZAIM SHOULD ASK (shows depth, genuine interest, makes him memorable)\n5. PULSE AI ANGLES TO HIGHLIGHT: Which specific aspects of PULSE AI are most relevant to this professor\n6. WHEN TO MENTION GRAD SCHOOL: Exact moment in the conversation + precise wording to use\n7. POST-CALL ACTION: What to send within 24 hours of the call\n8. COMMON PITFALLS: What NOT to say or do`
              }}
              renderInputs={() => (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <input style={I} placeholder="Professor name *" value={ip} onChange={e => setIp(e.target.value)} />
                    <input style={I} placeholder="University *" value={iu} onChange={e => setIu(e.target.value)} />
                  </div>
                  <textarea style={{ ...T, minHeight: 80 }} placeholder="Their research focus (paste from their faculty page or a paper abstract for best results)" value={ir} onChange={e => setIr(e.target.value)} />
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                    <span style={{ fontSize: 11, color: 'var(--muted)' }}>Quick fill:</span>
                    {TOP_PROFESSORS.slice(0, 5).map(p => (
                      <button key={p.name} onClick={() => { setIp(p.name); setIu(p.university); setIr(p.research) }} style={{ fontSize: 11, padding: '4px 10px', borderRadius: 6, border: '1px solid var(--border2)', background: 'transparent', color: 'var(--muted)', cursor: 'pointer' }}>{p.name}</button>
                    ))}
                  </div>
                </div>
              )}
            />
          )}

          {/* ─── UNIVERSITIES ─── */}
          {page === 'universities' && (
            <div>
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>Target Universities — 24 Schools</div>
                <div style={{ fontSize: 13, color: 'var(--muted)' }}>All chances calculated with CTO @ ClinCell + IEEE paper + professor contact strategy. Green = 85%+, amber = 70-84%, red = below 70%.</div>
              </div>
              <div style={{ ...CARD, padding: 0, overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)' }}>
                      {['University', 'Program', 'Fit', 'Chance', 'Route', 'Notes'].map(h => (
                        <th key={h} style={{ textAlign: 'left', fontSize: 11, color: 'var(--muted)', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.07em', padding: '12px 14px' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {UNIVERSITIES.map((u, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid var(--border)', cursor: 'pointer', transition: 'background 0.1s' }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface2)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                      >
                        <td style={{ padding: '11px 14px', fontWeight: 500, fontSize: 13 }}>{u.flag} {u.name}</td>
                        <td style={{ padding: '11px 14px', fontSize: 12, color: 'var(--muted)', maxWidth: 200 }}>{u.program}</td>
                        <td style={{ padding: '11px 14px', fontSize: 13, fontWeight: 600, color: 'var(--accent)', fontFamily: 'monospace' }}>{u.fit_score}</td>
                        <td style={{ padding: '11px 14px', fontSize: 14, fontWeight: 700, fontFamily: 'monospace', color: u.chance >= 85 ? 'var(--accent2)' : u.chance >= 70 ? 'var(--accent4)' : 'var(--accent3)' }}>{u.chance}%</td>
                        <td style={{ padding: '11px 14px' }}>
                          <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 10, border: `1px solid ${routeColor(u.route)}44`, color: routeColor(u.route), background: `${routeColor(u.route)}11` }}>{u.route}</span>
                        </td>
                        <td style={{ padding: '11px 14px', fontSize: 11, color: 'var(--muted)', maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.notes || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ─── KANBAN TRACKER ─── */}
          {page === 'tracker' && (
            <div>
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>Kanban Pipeline Tracker</div>
                <div style={{ fontSize: 13, color: 'var(--muted)' }}>Drag professor cards between stages. Click a card to view details, edit stage, or delete.</div>
              </div>
              <KanbanTracker />
            </div>
          )}

          {/* ─── EMAIL LOG ─── */}
          {page === 'email-log' && (
            <div>
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>Email Log</div>
                <div style={{ fontSize: 13, color: 'var(--muted)' }}>All professor emails generated by ATLAS. Track status from draft → sent → replied.</div>
              </div>
              <EmailLog />
            </div>
          )}

          {/* ─── DEADLINES ─── */}
          {page === 'deadlines' && (
            <div>
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>Application Deadlines</div>
                <div style={{ fontSize: 13, color: 'var(--muted)' }}>Track every university deadline. Red = under 30 days, amber = under 60 days.</div>
              </div>
              <DeadlineTracker />
            </div>
          )}

          {/* ─── GRE TRACKER ─── */}
          {page === 'gre' && (
            <div>
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>GRE Practice Tracker</div>
                <div style={{ fontSize: 13, color: 'var(--muted)' }}>Log every practice session. Target: 167+ Quant (94th percentile). Track progress over time.</div>
              </div>
              <GRETracker />
            </div>
          )}

          {/* ─── SETTINGS ─── */}
          {page === 'settings' && <SettingsPage />}

        </main>
      </div>
    </div>
  )
}
