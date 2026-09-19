'use client'

import { useState, useEffect } from 'react'

interface Settings {
  cometApiKey: string
  resendApiKey: string
  serperApiKey: string
  supabaseUrl: string
  supabaseAnonKey: string
  emailFrom: string
  examDate: string
}

const KEY = 'atlas-settings'

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings>({
    cometApiKey: '',
    resendApiKey: '',
    serperApiKey: '',
    supabaseUrl: '',
    supabaseAnonKey: '',
    emailFrom: 'cto@clincell.org',
    examDate: '',
  })
  const [saved, setSaved] = useState(false)
  const [showKeys, setShowKeys] = useState(false)

  useEffect(() => {
    try { const s = localStorage.getItem(KEY); if (s) setSettings(JSON.parse(s)) } catch {}
  }, [])

  const save = () => {
    try { localStorage.setItem(KEY, JSON.stringify(settings)); setSaved(true); setTimeout(() => setSaved(false), 2000) } catch {}
  }

  const inputStyle = { background: 'var(--surface2)', border: '1px solid var(--border2)', color: 'var(--text)', padding: '10px 14px', borderRadius: 8, fontSize: 13, outline: 'none', fontFamily: 'monospace', width: '100%' } as React.CSSProperties
  const labelStyle = { fontSize: 12, color: 'var(--muted)', marginBottom: 6, display: 'block', fontFamily: 'monospace', textTransform: 'uppercase' as const, letterSpacing: '0.06em' }
  const S = { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 20, marginBottom: 12 } as React.CSSProperties

  return (
    <div style={{ maxWidth: 680 }}>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>Settings & API Keys</div>
        <div style={{ fontSize: 13, color: 'var(--muted)' }}>Configure your API keys and preferences. Keys are stored locally in your browser.</div>
      </div>

      {/* Security notice */}
      <div style={{ ...S, borderLeft: '2px solid var(--accent4)', background: 'rgba(255,165,0,0.05)' }}>
        <div style={{ fontSize: 13, color: 'var(--accent4)', fontWeight: 500, marginBottom: 4 }}>⚠️ Security Note</div>
        <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.6 }}>
          For production deployment, add all API keys as Vercel Environment Variables — not in this settings panel.
          Vercel env vars are server-side only and never exposed to the browser.
          This panel is for local development testing only.
        </div>
      </div>

      {/* API Keys */}
      <div style={S}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 600 }}>API Keys</div>
          <button onClick={() => setShowKeys(!showKeys)} style={{ fontSize: 12, color: 'var(--muted)', background: 'none', border: '1px solid var(--border2)', padding: '4px 10px', borderRadius: 6, cursor: 'pointer' }}>
            {showKeys ? '🙈 Hide' : '👁 Show'} keys
          </button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {[
            ['cometApiKey', 'CometAPI Key (Claude)', 'sk-...', 'https://cometapi.com — powers all AI agents'],
            ['resendApiKey', 'Resend API Key', 're_...', 'resend.com — send emails from cto@clincell.org (free)'],
            ['serperApiKey', 'Serper API Key', 'serper_...', 'serper.dev — web search for professor discovery (free tier)'],
            ['supabaseUrl', 'Supabase URL', 'https://xxx.supabase.co', 'supabase.com — database for persistence'],
            ['supabaseAnonKey', 'Supabase Anon Key', 'eyJhbGc...', 'From Supabase project settings'],
          ].map(([field, label, placeholder, hint]) => (
            <div key={field}>
              <label style={labelStyle}>{label}</label>
              <input
                type={showKeys ? 'text' : 'password'}
                style={inputStyle}
                placeholder={placeholder}
                value={settings[field as keyof Settings]}
                onChange={e => setSettings(s => ({ ...s, [field]: e.target.value }))}
              />
              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>{hint}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Email settings */}
      <div style={S}>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 14 }}>Email Settings</div>
        <label style={labelStyle}>From email address</label>
        <input style={inputStyle} placeholder="cto@clincell.org" value={settings.emailFrom} onChange={e => setSettings(s => ({ ...s, emailFrom: e.target.value }))} />
        <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>Must be a verified domain in Resend. Add clincell.org in Resend → Domains.</div>
      </div>

      {/* How to get keys */}
      <div style={S}>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>How to get each key</div>
        {[
          ['CometAPI', 'cometapi.com → Sign up → Dashboard → API Keys → Create key', 'var(--accent)'],
          ['Resend', 'resend.com → Sign up (free) → API Keys → Create → Add clincell.org as verified domain', 'var(--accent2)'],
          ['Serper', 'serper.dev → Sign up → Dashboard → API Key (2,500 free searches/month)', 'var(--accent4)'],
          ['Supabase', 'supabase.com → New project → Settings → API → copy URL + anon key → run SQL schema from lib/supabase.ts', 'var(--accent3)'],
        ].map(([name, steps, color]) => (
          <div key={name} style={{ padding: '10px 12px', background: 'var(--surface2)', borderRadius: 8, marginBottom: 8, borderLeft: `2px solid ${color}` }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: color as string, marginBottom: 4 }}>{name}</div>
            <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }}>{steps}</div>
          </div>
        ))}
      </div>

      {/* Save button */}
      <button onClick={save} style={{ background: saved ? 'var(--accent2)' : 'var(--accent)', border: 'none', color: saved ? '#000' : 'white', padding: '12px 32px', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }}>
        {saved ? '✓ Saved!' : 'Save Settings'}
      </button>
    </div>
  )
}
