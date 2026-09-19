'use client'

import { useState, useEffect } from 'react'

interface EmailEntry {
  id: string
  professorName: string
  university: string
  subject: string
  body: string
  sentAt: string
  status: 'draft' | 'sent' | 'replied'
  replyNotes?: string
}

const STORAGE_KEY = 'atlas-email-log'

export default function EmailLog() {
  const [emails, setEmails] = useState<EmailEntry[]>([])
  const [selected, setSelected] = useState<EmailEntry | null>(null)
  const [filter, setFilter] = useState<'all' | 'sent' | 'replied' | 'draft'>('all')

  useEffect(() => {
    try { const s = localStorage.getItem(STORAGE_KEY); if (s) setEmails(JSON.parse(s)) } catch {}
  }, [])

  const save = (e: EmailEntry[]) => {
    setEmails(e)
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(e)) } catch {}
  }

  const updateStatus = (id: string, status: EmailEntry['status'], notes?: string) => {
    save(emails.map(e => e.id === id ? { ...e, status, replyNotes: notes ?? e.replyNotes } : e))
    if (selected?.id === id) setSelected(prev => prev ? { ...prev, status, replyNotes: notes ?? prev.replyNotes } : null)
  }

  const deleteEmail = (id: string) => {
    save(emails.filter(e => e.id !== id))
    if (selected?.id === id) setSelected(null)
  }

  const saveEmail = (entry: Omit<EmailEntry, 'id' | 'sentAt'>) => {
    const newEntry: EmailEntry = { ...entry, id: Date.now().toString(), sentAt: new Date().toISOString() }
    save([newEntry, ...emails])
  }

  // Expose saveEmail globally so AgentPanel can call it
  useEffect(() => {
    (window as any).atlasLogEmail = saveEmail
  }, [emails])

  const filtered = filter === 'all' ? emails : emails.filter(e => e.status === filter)

  const statusColor = (s: string) => s === 'replied' ? 'var(--accent2)' : s === 'sent' ? 'var(--accent)' : 'var(--muted)'
  const statusBg = (s: string) => s === 'replied' ? 'rgba(0,212,170,0.1)' : s === 'sent' ? 'rgba(108,99,255,0.1)' : 'var(--surface2)'

  return (
    <div style={{ display: 'grid', gridTemplateColumns: selected ? '1fr 1fr' : '1fr', gap: 16 }}>
      <div>
        {/* Filter tabs */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
          {(['all', 'sent', 'replied', 'draft'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)} style={{ fontSize: 12, padding: '5px 12px', borderRadius: 20, border: `1px solid ${filter === f ? 'var(--accent)' : 'var(--border2)'}`, background: filter === f ? 'rgba(108,99,255,0.15)' : 'transparent', color: filter === f ? 'var(--accent)' : 'var(--muted)', cursor: 'pointer', textTransform: 'capitalize' }}>
              {f} {f === 'all' ? `(${emails.length})` : `(${emails.filter(e => e.status === f).length})`}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 40, textAlign: 'center' }}>
            <div style={{ fontSize: 28, marginBottom: 10 }}>✉️</div>
            <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>No emails logged yet</div>
            <div style={{ fontSize: 13, color: 'var(--muted)' }}>Emails you generate in the Email Writer<br />will be saved here automatically.</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {filtered.map(e => (
              <div key={e.id} onClick={() => setSelected(selected?.id === e.id ? null : e)}
                style={{ background: 'var(--surface)', border: `1px solid ${selected?.id === e.id ? 'var(--accent)' : 'var(--border)'}`, borderRadius: 10, padding: '12px 14px', cursor: 'pointer', transition: 'border 0.15s' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{e.professorName}</div>
                  <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 10, background: statusBg(e.status), color: statusColor(e.status), border: `1px solid ${statusColor(e.status)}44`, textTransform: 'capitalize' }}>{e.status}</span>
                </div>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 3 }}>{e.university}</div>
                <div style={{ fontSize: 12, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.subject}</div>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 6, fontFamily: 'monospace' }}>{new Date(e.sentAt).toLocaleDateString()}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Detail panel */}
      {selected && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 18, overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 600 }}>{selected.professorName}</div>
              <div style={{ fontSize: 12, color: 'var(--accent2)' }}>{selected.university}</div>
            </div>
            <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: 18, padding: 4 }}>×</button>
          </div>

          <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>Subject</div>
          <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 12, padding: '8px 12px', background: 'var(--surface2)', borderRadius: 6 }}>{selected.subject}</div>

          <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>Email body</div>
          <div style={{ fontSize: 12, lineHeight: 1.6, maxHeight: 200, overflowY: 'auto', padding: '8px 12px', background: 'var(--surface2)', borderRadius: 6, whiteSpace: 'pre-wrap', marginBottom: 12, fontFamily: 'monospace' }}>{selected.body}</div>

          <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 8 }}>Update status</div>
          <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
            {(['draft', 'sent', 'replied'] as const).map(s => (
              <button key={s} onClick={() => updateStatus(selected.id, s)} style={{ fontSize: 11, padding: '5px 12px', borderRadius: 6, cursor: 'pointer', border: `1px solid ${selected.status === s ? statusColor(s) : 'var(--border2)'}`, background: selected.status === s ? statusBg(s) : 'transparent', color: selected.status === s ? statusColor(s) : 'var(--muted)', textTransform: 'capitalize' }}>{s}</button>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => navigator.clipboard.writeText(selected.body)} style={{ flex: 1, fontSize: 12, padding: '7px 0', borderRadius: 7, border: '1px solid var(--border2)', background: 'transparent', color: 'var(--text)', cursor: 'pointer' }}>Copy email</button>
            <button onClick={() => deleteEmail(selected.id)} style={{ fontSize: 12, padding: '7px 14px', borderRadius: 7, border: '1px solid var(--accent3)', background: 'transparent', color: 'var(--accent3)', cursor: 'pointer' }}>Delete</button>
          </div>
        </div>
      )}
    </div>
  )
}
