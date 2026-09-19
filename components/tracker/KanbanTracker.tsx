'use client'
import { useState, useEffect } from 'react'
import { Professor, KanbanStage } from '@/types'

const STAGES: { id: KanbanStage; label: string; color: string }[] = [
  { id: 'identified', label: 'Identified', color: 'var(--muted)' },
  { id: 'emailed', label: 'Email Sent', color: 'var(--accent)' },
  { id: 'replied', label: 'Replied', color: 'var(--accent4)' },
  { id: 'applied', label: 'Applied', color: 'var(--accent2)' },
  { id: 'decision', label: 'Decision', color: '#ff6b6b' },
]

const DEFAULTS: Professor[] = [
  { id: '1', name: 'Dina Katabi', university: 'MIT', department: 'CSAIL', email: 'dkatabi@mit.edu', research_focus: 'RF-based wireless health sensing, vital signs monitoring', fit_score: 10, stage: 'identified', created_at: new Date().toISOString() },
  { id: '2', name: 'Rosalind Picard', university: 'MIT', department: 'Media Lab', email: 'picard@media.mit.edu', research_focus: 'Physiological computing, affective AI, wearable biosensors', fit_score: 9, stage: 'identified', created_at: new Date().toISOString() },
  { id: '3', name: 'Collin Stultz', university: 'MIT / Harvard', department: 'RLE + HMS', email: 'cmstultz@mit.edu', research_focus: 'Cardiac ML, ECG analysis, clinical AI', fit_score: 10, stage: 'identified', created_at: new Date().toISOString() },
  { id: '4', name: 'James Zou', university: 'Stanford', department: 'HAI / Biomedical Data Science', email: 'jamesz@stanford.edu', research_focus: 'Biomedical AI, clinical ML, healthcare fairness', fit_score: 9, stage: 'identified', created_at: new Date().toISOString() },
  { id: '5', name: 'Zak Kohane', university: 'Harvard', department: 'HMS Biomedical Informatics', email: 'isaac_kohane@hms.harvard.edu', research_focus: 'Clinical AI pioneer, EHR data analysis, precision medicine', fit_score: 9, stage: 'identified', created_at: new Date().toISOString() },
  { id: '6', name: 'Artur Dubrawski', university: 'CMU', department: 'Auton Lab', email: 'awd@cs.cmu.edu', research_focus: 'Clinical AI, real-time patient monitoring, anomaly detection', fit_score: 9, stage: 'identified', created_at: new Date().toISOString() },
  { id: '7', name: 'Julia Vogt', university: 'ETH Zurich', department: 'Medical Data Science', email: 'julia.vogt@inf.ethz.ch', research_focus: 'Clinical ML, wearable health data, survival analysis', fit_score: 9, stage: 'identified', created_at: new Date().toISOString() },
]

const S = {
  col: (highlight: boolean) => ({ background: 'var(--surface2)', borderRadius: 10, padding: 12, minHeight: 300, border: `1px solid ${highlight ? 'var(--accent)' : 'var(--border)'}`, transition: 'border 0.15s' } as React.CSSProperties),
  card: (sel: boolean, drag: boolean) => ({ background: 'var(--surface)', border: `1px solid ${sel ? 'var(--accent)' : 'var(--border)'}`, borderRadius: 8, padding: 10, marginBottom: 8, cursor: 'grab', transition: 'border 0.15s', opacity: drag ? 0.4 : 1 } as React.CSSProperties),
  input: { background: 'var(--surface2)', border: '1px solid var(--border2)', color: 'var(--text)', padding: '8px 12px', borderRadius: 8, fontSize: 13, width: '100%', outline: 'none' } as React.CSSProperties,
}

export default function KanbanTracker() {
  const [profs, setProfs] = useState<Professor[]>(DEFAULTS)
  const [dragging, setDragging] = useState<string | null>(null)
  const [over, setOver] = useState<KanbanStage | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ name:'', university:'', department:'', email:'', research_focus:'' })
  const [sel, setSel] = useState<Professor | null>(null)

  useEffect(() => { try { const s = localStorage.getItem('atlas-profs'); if (s) setProfs(JSON.parse(s)) } catch{} }, [])
  useEffect(() => { try { localStorage.setItem('atlas-profs', JSON.stringify(profs)) } catch{} }, [profs])

  const byStage = (s: KanbanStage) => profs.filter(p => p.stage === s)
  const onDrop = (stage: KanbanStage) => { if (dragging) setProfs(p => p.map(x => x.id===dragging?{...x,stage}:x)); setDragging(null); setOver(null) }
  const add = () => { if (!form.name||!form.university) return; setProfs(p => [...p,{id:Date.now().toString(),...form,fit_score:8,stage:'identified',created_at:new Date().toISOString()}]); setForm({name:'',university:'',department:'',email:'',research_focus:''}); setShowAdd(false) }

  return (
    <div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:10,marginBottom:20}}>
        {STAGES.map(s => <div key={s.id} style={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:10,padding:'12px 14px',textAlign:'center'}}><div style={{fontSize:24,fontWeight:700,color:s.color}}>{byStage(s.id).length}</div><div style={{fontSize:11,color:'var(--muted)',marginTop:2}}>{s.label}</div></div>)}
      </div>
      <button onClick={()=>setShowAdd(!showAdd)} style={{background:'rgba(108,99,255,0.15)',border:'1px solid rgba(108,99,255,0.3)',color:'var(--accent)',padding:'8px 16px',borderRadius:8,fontSize:12,cursor:'pointer',marginBottom:16}}>+ Add Professor</button>
      {showAdd && (
        <div style={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:12,padding:16,marginBottom:16,display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
          <input style={S.input} placeholder="Name *" value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} />
          <input style={S.input} placeholder="University *" value={form.university} onChange={e=>setForm(f=>({...f,university:e.target.value}))} />
          <input style={S.input} placeholder="Department" value={form.department} onChange={e=>setForm(f=>({...f,department:e.target.value}))} />
          <input style={S.input} placeholder="Email" value={form.email} onChange={e=>setForm(f=>({...f,email:e.target.value}))} />
          <input style={{...S.input,gridColumn:'1/-1'} as React.CSSProperties} placeholder="Research focus" value={form.research_focus} onChange={e=>setForm(f=>({...f,research_focus:e.target.value}))} />
          <div style={{gridColumn:'1/-1',display:'flex',gap:8}}><button onClick={add} style={{background:'var(--accent)',border:'none',color:'white',padding:'8px 16px',borderRadius:8,fontSize:12,cursor:'pointer',fontWeight:600}}>Add</button><button onClick={()=>setShowAdd(false)} style={{background:'var(--surface2)',border:'1px solid var(--border2)',color:'var(--muted)',padding:'8px 16px',borderRadius:8,fontSize:12,cursor:'pointer'}}>Cancel</button></div>
        </div>
      )}
      <div style={{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:12}}>
        {STAGES.map(stage => (
          <div key={stage.id} onDragOver={e=>{e.preventDefault();setOver(stage.id)}} onDrop={()=>onDrop(stage.id)} onDragLeave={()=>setOver(null)} style={S.col(over===stage.id)}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}><span style={{fontSize:11,fontWeight:600,textTransform:'uppercase',letterSpacing:'0.08em',color:stage.color}}>{stage.label}</span><span style={{background:'var(--surface)',borderRadius:10,padding:'1px 7px',fontSize:11,color:'var(--muted)'}}>{byStage(stage.id).length}</span></div>
            {byStage(stage.id).map(p => (
              <div key={p.id} draggable onDragStart={()=>setDragging(p.id)} onClick={()=>setSel(sel?.id===p.id?null:p)} style={S.card(sel?.id===p.id,dragging===p.id)}>
                <div style={{fontSize:12,fontWeight:600,marginBottom:3}}>{p.name}</div>
                <div style={{fontSize:11,color:'var(--muted)'}}>{p.university}</div>
                {p.email && <div style={{fontSize:10,color:'var(--accent)',marginTop:4,fontFamily:'var(--font-mono)'}}>{p.email}</div>}
              </div>
            ))}
            {byStage(stage.id).length===0 && <div style={{fontSize:12,color:'var(--muted)',textAlign:'center',padding:'20px 0',opacity:0.4}}>Drop here</div>}
          </div>
        ))}
      </div>
      {sel && (
        <div style={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:12,padding:16,marginTop:16}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:12}}>
            <div><div style={{fontSize:15,fontWeight:600}}>{sel.name}</div><div style={{fontSize:12,color:'var(--accent2)',marginTop:2}}>{sel.university} — {sel.department}</div></div>
            <div style={{display:'flex',gap:8}}><button onClick={()=>{setProfs(p=>p.filter(x=>x.id!==sel.id));setSel(null)}} style={{fontSize:11,color:'var(--accent3)',background:'none',border:'1px solid var(--accent3)',padding:'4px 10px',borderRadius:6,cursor:'pointer'}}>Remove</button><button onClick={()=>setSel(null)} style={{fontSize:11,color:'var(--muted)',background:'none',border:'1px solid var(--border2)',padding:'4px 10px',borderRadius:6,cursor:'pointer'}}>Close</button></div>
          </div>
          {sel.email && <div style={{fontSize:12,marginBottom:6}}><span style={{color:'var(--muted)'}}>Email: </span><span style={{color:'var(--accent)',fontFamily:'var(--font-mono)'}}>{sel.email}</span></div>}
          {sel.research_focus && <div style={{fontSize:12,lineHeight:1.6}}><span style={{color:'var(--muted)'}}>Research: </span>{sel.research_focus}</div>}
          <div style={{display:'flex',gap:8,marginTop:12,flexWrap:'wrap'}}>
            {STAGES.map(s => <button key={s.id} onClick={()=>setProfs(p=>p.map(x=>x.id===sel.id?{...x,stage:s.id}:x))} style={{fontSize:11,padding:'4px 10px',borderRadius:6,cursor:'pointer',border:`1px solid ${sel.stage===s.id?s.color:'var(--border2)'}`,background:sel.stage===s.id?`${s.color}22`:'transparent',color:sel.stage===s.id?s.color:'var(--muted)'}}>{s.label}</button>)}
          </div>
        </div>
      )}
    </div>
  )
}
