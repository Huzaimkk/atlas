'use client'

import { useState, useEffect } from 'react'

interface GRESession {
  id: string
  date: string
  quant: number
  verbal: number
  awa: number
  notes: string
}

const TARGET_QUANT = 167
const TARGET_VERBAL = 158
const EXAM_DATE_KEY = 'atlas-gre-examdate'
const SESSIONS_KEY = 'atlas-gre-sessions'

export default function GRETracker() {
  const [sessions, setSessions] = useState<GRESession[]>([])
  const [examDate, setExamDate] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ date: '', quant: '', verbal: '', awa: '', notes: '' })

  useEffect(() => {
    try {
      const s = localStorage.getItem(SESSIONS_KEY)
      if (s) setSessions(JSON.parse(s))
      const d = localStorage.getItem(EXAM_DATE_KEY)
      if (d) setExamDate(d)
    } catch {}
  }, [])

  const save = (s: GRESession[]) => {
    setSessions(s)
    try { localStorage.setItem(SESSIONS_KEY, JSON.stringify(s)) } catch {}
  }

  const addSession = () => {
    if (!form.date || !form.quant) return
    const s: GRESession = {
      id: Date.now().toString(),
      date: form.date,
      quant: parseInt(form.quant) || 0,
      verbal: parseInt(form.verbal) || 0,
      awa: parseFloat(form.awa) || 0,
      notes: form.notes
    }
    save([...sessions, s].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()))
    setForm({ date: '', quant: '', verbal: '', awa: '', notes: '' })
    setShowAdd(false)
  }

  const saveExamDate = (d: string) => {
    setExamDate(d)
    try { localStorage.setItem(EXAM_DATE_KEY, d) } catch {}
  }

  const daysToExam = examDate ? Math.ceil((new Date(examDate).getTime() - Date.now()) / 86400000) : null
  const latest = sessions[sessions.length - 1]
  const best = sessions.reduce((b, s) => s.quant > (b?.quant || 0) ? s : b, sessions[0])
  const quantProgress = latest ? Math.min(100, Math.round(((latest.quant - 130) / (TARGET_QUANT - 130)) * 100)) : 0

  const S = {
    card: { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 20 } as React.CSSProperties,
    input: { background: 'var(--surface2)', border: '1px solid var(--border2)', color: 'var(--text)', padding: '8px 12px', borderRadius: 8, fontSize: 13, outline: 'none', fontFamily: 'inherit' } as React.CSSProperties,
    label: { fontSize: 11, color: 'var(--muted)', marginBottom: 4, display: 'block', textTransform: 'uppercase' as const, letterSpacing: '0.06em', fontFamily: 'monospace' },
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Header stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
        <div style={S.card}>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 6, fontFamily: 'monospace', textTransform: 'uppercase' }}>Target Quant</div>
          <div style={{ fontSize: 26, fontWeight: 700, color: 'var(--accent2)' }}>167+</div>
          <div style={{ fontSize: 11, color: 'var(--muted)' }}>94th percentile</div>
        </div>
        <div style={S.card}>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 6, fontFamily: 'monospace', textTransform: 'uppercase' }}>Best Quant</div>
          <div style={{ fontSize: 26, fontWeight: 700, color: best ? (best.quant >= 167 ? 'var(--accent2)' : best.quant >= 160 ? 'var(--accent4)' : 'var(--accent3)') : 'var(--muted)' }}>
            {best?.quant || '—'}
          </div>
          <div style={{ fontSize: 11, color: 'var(--muted)' }}>{best ? `${sessions.length} session${sessions.length !== 1 ? 's' : ''}` : 'No sessions yet'}</div>
        </div>
        <div style={S.card}>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 6, fontFamily: 'monospace', textTransform: 'uppercase' }}>Latest Score</div>
          <div style={{ fontSize: 26, fontWeight: 700, color: latest ? 'var(--accent)' : 'var(--muted)' }}>
            {latest ? `${latest.quant}Q` : '—'}
          </div>
          <div style={{ fontSize: 11, color: 'var(--muted)' }}>{latest ? latest.date : 'No data'}</div>
        </div>
        <div style={S.card}>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 6, fontFamily: 'monospace', textTransform: 'uppercase' }}>Exam Date</div>
          <div style={{ fontSize: 26, fontWeight: 700, color: daysToExam && daysToExam <= 14 ? 'var(--accent3)' : daysToExam && daysToExam <= 30 ? 'var(--accent4)' : 'var(--accent2)' }}>
            {daysToExam !== null ? `${daysToExam}d` : '—'}
          </div>
          <div style={{ fontSize: 11, color: 'var(--muted)' }}>
            <input type="date" value={examDate} onChange={e => saveExamDate(e.target.value)} style={{ background: 'transparent', border: 'none', color: 'var(--muted)', fontSize: 11, cursor: 'pointer', outline: 'none', fontFamily: 'inherit' }} />
          </div>
        </div>
      </div>

      {/* Quant progress bar */}
      {latest && (
        <div style={S.card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 500 }}>Quant Progress to 167</span>
            <span style={{ fontSize: 13, fontFamily: 'monospace', color: latest.quant >= 167 ? 'var(--accent2)' : 'var(--accent4)' }}>{latest.quant} / 167</span>
          </div>
          <div style={{ background: 'var(--surface2)', borderRadius: 6, height: 10, overflow: 'hidden' }}>
            <div style={{ width: `${quantProgress}%`, height: '100%', background: latest.quant >= 167 ? 'var(--accent2)' : 'linear-gradient(90deg,var(--accent),var(--accent4))', borderRadius: 6, transition: 'width 0.5s' }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
            <span style={{ fontSize: 11, color: 'var(--muted)' }}>130 (min)</span>
            <span style={{ fontSize: 11, color: 'var(--muted)' }}>170 (max)</span>
          </div>
        </div>
      )}

      {/* Add session */}
      <div>
        <button onClick={() => setShowAdd(!showAdd)} style={{ background: 'rgba(108,99,255,0.15)', border: '1px solid rgba(108,99,255,0.3)', color: 'var(--accent)', padding: '8px 16px', borderRadius: 8, fontSize: 12, cursor: 'pointer', marginBottom: showAdd ? 12 : 0 }}>
          + Log Practice Session
        </button>
        {showAdd && (
          <div style={{ ...S.card, display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
            <div><label style={S.label}>Date</label><input type="date" style={{ ...S.input, width: '100%' }} value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} /></div>
            <div><label style={S.label}>Quant (130–170)</label><input type="number" style={{ ...S.input, width: '100%' }} placeholder="e.g. 162" min={130} max={170} value={form.quant} onChange={e => setForm(f => ({ ...f, quant: e.target.value }))} /></div>
            <div><label style={S.label}>Verbal (130–170)</label><input type="number" style={{ ...S.input, width: '100%' }} placeholder="e.g. 155" min={130} max={170} value={form.verbal} onChange={e => setForm(f => ({ ...f, verbal: e.target.value }))} /></div>
            <div><label style={S.label}>AWA (0–6)</label><input type="number" style={{ ...S.input, width: '100%' }} placeholder="e.g. 4.5" step={0.5} min={0} max={6} value={form.awa} onChange={e => setForm(f => ({ ...f, awa: e.target.value }))} /></div>
            <div style={{ gridColumn: 'span 2' }}><label style={S.label}>Notes</label><input style={{ ...S.input, width: '100%' }} placeholder="What to improve..." value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} /></div>
            <div style={{ gridColumn: '1/-1', display: 'flex', gap: 8 }}>
              <button onClick={addSession} style={{ background: 'var(--accent)', border: 'none', color: 'white', padding: '8px 20px', borderRadius: 8, fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>Save Session</button>
              <button onClick={() => setShowAdd(false)} style={{ background: 'var(--surface2)', border: '1px solid var(--border2)', color: 'var(--muted)', padding: '8px 16px', borderRadius: 8, fontSize: 12, cursor: 'pointer' }}>Cancel</button>
            </div>
          </div>
        )}
      </div>

      {/* Sessions table */}
      {sessions.length > 0 && (
        <div style={S.card}>
          <div style={{ fontSize: 12, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12, fontFamily: 'monospace' }}>Practice History</div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr style={{ borderBottom: '1px solid var(--border)' }}>
              {['Date', 'Quant', 'Verbal', 'AWA', 'vs Target', 'Notes'].map(h => (
                <th key={h} style={{ textAlign: 'left', fontSize: 11, color: 'var(--muted)', fontFamily: 'monospace', textTransform: 'uppercase', padding: '0 10px 10px' }}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {[...sessions].reverse().map(s => {
                const diff = s.quant - TARGET_QUANT
                return (
                  <tr key={s.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '10px', fontSize: 13 }}>{s.date}</td>
                    <td style={{ padding: '10px', fontSize: 14, fontWeight: 700, fontFamily: 'monospace', color: s.quant >= 167 ? 'var(--accent2)' : s.quant >= 163 ? 'var(--accent4)' : 'var(--text)' }}>{s.quant}</td>
                    <td style={{ padding: '10px', fontSize: 13, fontFamily: 'monospace' }}>{s.verbal || '—'}</td>
                    <td style={{ padding: '10px', fontSize: 13, fontFamily: 'monospace' }}>{s.awa || '—'}</td>
                    <td style={{ padding: '10px', fontSize: 12, fontFamily: 'monospace', color: diff >= 0 ? 'var(--accent2)' : 'var(--accent3)' }}>{diff >= 0 ? `+${diff}` : diff}</td>
                    <td style={{ padding: '10px', fontSize: 12, color: 'var(--muted)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.notes || '—'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {sessions.length === 0 && (
        <div style={{ ...S.card, textAlign: 'center', padding: 40 }}>
          <div style={{ fontSize: 32, marginBottom: 10 }}>📊</div>
          <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>No practice sessions yet</div>
          <div style={{ fontSize: 13, color: 'var(--muted)' }}>Log your first GRE practice test above.<br />Target: 167+ Quant (94th percentile)</div>
        </div>
      )}

      {/* Study tips */}
      <div style={{ ...S.card, borderLeft: '2px solid var(--accent)' }}>
        <div style={{ fontSize: 12, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10, fontFamily: 'monospace' }}>Study Resources</div>
        {[
          ['Manhattan Prep 5lb Book', 'Best for Quant — work through all sections systematically'],
          ['Official ETS GRE Guide', 'Real test questions — most accurate difficulty calibration'],
          ['GregMat+ ($5/month)', 'Best value GRE prep course, strong Quant focus'],
          ['PowerPrep Practice Tests', 'Official ETS software — take 2 full tests before exam day'],
          ['Magoosh Vocabulary', 'For Verbal — 1000 most common GRE words'],
        ].map(([title, tip]) => (
          <div key={title} style={{ display: 'flex', gap: 10, marginBottom: 8 }}>
            <span style={{ color: 'var(--accent)', fontSize: 12, marginTop: 1 }}>→</span>
            <div><span style={{ fontSize: 13, fontWeight: 500 }}>{title}</span><span style={{ fontSize: 12, color: 'var(--muted)' }}> — {tip}</span></div>
          </div>
        ))}
      </div>
    </div>
  )
}
