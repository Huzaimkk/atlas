'use client'

import { useState, useEffect } from 'react'

interface Deadline {
  id: string
  university: string
  program: string
  deadline: string
  round?: string
  gre_required: boolean
  applied: boolean
  notes: string
}

const KEY = 'atlas-deadlines'

const SUGGESTED: Omit<Deadline, 'id' | 'applied' | 'notes'>[] = [
  { university: 'Cornell Tech', program: 'MEng ECE', deadline: '2026-01-15', round: 'Round 2', gre_required: true },
  { university: 'CMU', program: 'MSML', deadline: '2025-12-15', round: 'Regular', gre_required: false },
  { university: 'Columbia', program: 'MS Biomedical Engineering', deadline: '2026-02-01', round: 'Regular', gre_required: true },
  { university: 'Georgia Tech', program: 'MSECE', deadline: '2026-01-01', round: 'Regular', gre_required: true },
  { university: 'TU Munich', program: 'MSc EE', deadline: '2026-05-31', round: 'Summer', gre_required: false },
  { university: 'U Toronto (Vector)', program: 'MScAC', deadline: '2026-02-01', round: 'Regular', gre_required: false },
  { university: 'KAUST', program: 'MS EE/AI', deadline: '2026-02-15', round: 'Spring', gre_required: false },
]

export default function DeadlineTracker() {
  const [deadlines, setDeadlines] = useState<Deadline[]>([])
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ university: '', program: '', deadline: '', round: '', gre_required: false, notes: '' })

  useEffect(() => {
    try { const s = localStorage.getItem(KEY); if (s) setDeadlines(JSON.parse(s)) } catch {}
  }, [])

  const save = (d: Deadline[]) => {
    setDeadlines(d)
    try { localStorage.setItem(KEY, JSON.stringify(d)) } catch {}
  }

  const addFromSuggested = (s: typeof SUGGESTED[0]) => {
    if (deadlines.find(d => d.university === s.university)) return
    save([...deadlines, { ...s, id: Date.now().toString(), applied: false, notes: '' }])
  }

  const add = () => {
    if (!form.university || !form.deadline) return
    save([...deadlines, { ...form, id: Date.now().toString(), applied: false }])
    setForm({ university: '', program: '', deadline: '', round: '', gre_required: false, notes: '' })
    setShowAdd(false)
  }

  const toggleApplied = (id: string) => save(deadlines.map(d => d.id === id ? { ...d, applied: !d.applied } : d))
  const remove = (id: string) => save(deadlines.filter(d => d.id !== id))

  const daysLeft = (dateStr: string) => {
    const diff = new Date(dateStr).getTime() - Date.now()
    return Math.ceil(diff / 86400000)
  }

  const urgencyColor = (days: number) => {
    if (days < 0) return '#888'
    if (days <= 14) return 'var(--accent3)'
    if (days <= 30) return 'var(--accent4)'
    if (days <= 60) return 'var(--accent)'
    return 'var(--accent2)'
  }

  const sorted = [...deadlines].sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime())
  const inputStyle = { background: 'var(--surface2)', border: '1px solid var(--border2)', color: 'var(--text)', padding: '8px 12px', borderRadius: 8, fontSize: 13, outline: 'none', fontFamily: 'inherit', width: '100%' } as React.CSSProperties

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Quick add from suggestions */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 16 }}>
        <div style={{ fontSize: 12, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12, fontFamily: 'monospace' }}>Quick Add — Recommended Deadlines</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {SUGGESTED.map(s => {
            const added = deadlines.some(d => d.university === s.university)
            const days = daysLeft(s.deadline)
            return (
              <button key={s.university} onClick={() => addFromSuggested(s)} disabled={added}
                style={{ fontSize: 12, padding: '6px 12px', borderRadius: 8, border: `1px solid ${added ? 'var(--accent2)44' : 'var(--border2)'}`, background: added ? 'rgba(0,212,170,0.08)' : 'transparent', color: added ? 'var(--accent2)' : 'var(--text)', cursor: added ? 'default' : 'pointer' }}>
                {added ? '✓ ' : '+ '}{s.university}
                <span style={{ fontSize: 10, color: urgencyColor(days), marginLeft: 6, fontFamily: 'monospace' }}>{days > 0 ? `${days}d` : 'past'}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Add custom */}
      <div>
        <button onClick={() => setShowAdd(!showAdd)} style={{ background: 'rgba(108,99,255,0.15)', border: '1px solid rgba(108,99,255,0.3)', color: 'var(--accent)', padding: '8px 16px', borderRadius: 8, fontSize: 12, cursor: 'pointer', marginBottom: showAdd ? 12 : 0 }}>
          + Add Custom Deadline
        </button>
        {showAdd && (
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 16, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <input style={inputStyle} placeholder="University *" value={form.university} onChange={e => setForm(f => ({ ...f, university: e.target.value }))} />
            <input style={inputStyle} placeholder="Program *" value={form.program} onChange={e => setForm(f => ({ ...f, program: e.target.value }))} />
            <input type="date" style={inputStyle} value={form.deadline} onChange={e => setForm(f => ({ ...f, deadline: e.target.value }))} />
            <input style={inputStyle} placeholder="Round (e.g. Round 1)" value={form.round} onChange={e => setForm(f => ({ ...f, round: e.target.value }))} />
            <input style={{ ...inputStyle, gridColumn: '1/-1' }} placeholder="Notes" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
            <div style={{ gridColumn: '1/-1', display: 'flex', gap: 8, alignItems: 'center' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}>
                <input type="checkbox" checked={form.gre_required} onChange={e => setForm(f => ({ ...f, gre_required: e.target.checked }))} /> GRE required
              </label>
              <button onClick={add} style={{ background: 'var(--accent)', border: 'none', color: 'white', padding: '8px 16px', borderRadius: 8, fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>Add</button>
              <button onClick={() => setShowAdd(false)} style={{ background: 'var(--surface2)', border: '1px solid var(--border2)', color: 'var(--muted)', padding: '8px 14px', borderRadius: 8, fontSize: 12, cursor: 'pointer' }}>Cancel</button>
            </div>
          </div>
        )}
      </div>

      {/* Deadline list */}
      {sorted.length === 0 ? (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 40, textAlign: 'center' }}>
          <div style={{ fontSize: 28, marginBottom: 10 }}>📅</div>
          <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>No deadlines tracked yet</div>
          <div style={{ fontSize: 13, color: 'var(--muted)' }}>Add universities above to start tracking</div>
        </div>
      ) : (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr style={{ borderBottom: '1px solid var(--border)' }}>
              {['University', 'Program', 'Deadline', 'Days Left', 'GRE', 'Status', ''].map(h => (
                <th key={h} style={{ textAlign: 'left', fontSize: 11, color: 'var(--muted)', fontFamily: 'monospace', textTransform: 'uppercase', padding: '12px 14px' }}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {sorted.map(d => {
                const days = daysLeft(d.deadline)
                return (
                  <tr key={d.id} style={{ borderBottom: '1px solid var(--border)', opacity: d.applied ? 0.6 : 1 }} onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface2)')} onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                    <td style={{ padding: '12px 14px', fontWeight: 500, fontSize: 13, textDecoration: d.applied ? 'line-through' : 'none' }}>{d.university}</td>
                    <td style={{ padding: '12px 14px', fontSize: 12, color: 'var(--muted)' }}>{d.program}</td>
                    <td style={{ padding: '12px 14px', fontSize: 12, fontFamily: 'monospace' }}>{d.deadline}</td>
                    <td style={{ padding: '12px 14px', fontSize: 16, fontWeight: 700, color: days < 0 ? '#555' : urgencyColor(days), fontFamily: 'monospace' }}>{days < 0 ? 'Past' : `${days}d`}</td>
                    <td style={{ padding: '12px 14px' }}>{d.gre_required ? <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 4, background: 'rgba(255,165,0,0.15)', color: 'var(--accent4)', border: '1px solid rgba(255,165,0,0.3)' }}>Yes</span> : <span style={{ fontSize: 10, color: 'var(--muted)' }}>No</span>}</td>
                    <td style={{ padding: '12px 14px' }}>
                      <button onClick={() => toggleApplied(d.id)} style={{ fontSize: 11, padding: '3px 10px', borderRadius: 6, cursor: 'pointer', border: `1px solid ${d.applied ? 'var(--accent2)' : 'var(--border2)'}`, background: d.applied ? 'rgba(0,212,170,0.1)' : 'transparent', color: d.applied ? 'var(--accent2)' : 'var(--muted)' }}>
                        {d.applied ? '✓ Applied' : 'Mark applied'}
                      </button>
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <button onClick={() => remove(d.id)} style={{ fontSize: 12, color: 'var(--accent3)', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 6px' }}>×</button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
