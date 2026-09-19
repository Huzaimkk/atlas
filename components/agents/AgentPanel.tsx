'use client'
import { useAgent } from '@/lib/useAgent'
import { useState } from 'react'

interface Props {
  agentType: string; title: string; description: string
  buildPrompt: () => string | null
  renderInputs: () => React.ReactNode
  onComplete?: (text: string) => void
  showDownload?: boolean
}

export default function AgentPanel({ agentType, title, description, buildPrompt, renderInputs, onComplete, showDownload }: Props) {
  const { output, loading, error, run, clear } = useAgent({ agentType, onComplete })
  const [copied, setCopied] = useState(false)

  const handleRun = () => { const p = buildPrompt(); if (p) run(p) }
  const handleCopy = () => { navigator.clipboard.writeText(output); setCopied(true); setTimeout(() => setCopied(false), 2000) }
  const handleDownload = () => { const b = new Blob([output], {type:'text/plain'}); const u = URL.createObjectURL(b); const a = document.createElement('a'); a.href=u; a.download=`${agentType}-${Date.now()}.txt`; a.click(); URL.revokeObjectURL(u) }

  return (
    <div style={{display:'flex',flexDirection:'column',gap:16}}>
      <div><div style={{fontSize:18,fontWeight:700,marginBottom:4}}>{title}</div><div style={{fontSize:13,color:'var(--muted)'}}>{description}</div></div>
      <div style={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:12,padding:20,display:'flex',flexDirection:'column',gap:12}}>
        {renderInputs()}
        <button onClick={handleRun} disabled={loading} style={{width:'100%',padding:'11px 0',borderRadius:8,background:loading?'rgba(108,99,255,0.5)':'var(--accent)',color:'white',fontWeight:600,fontSize:13,border:'none',cursor:loading?'not-allowed':'pointer',transition:'all 0.15s'}}>
          {loading ? '⟳  Agent running...' : `Run ${title} →`}
        </button>
      </div>
      {(output || error || loading) && (
        <div style={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:12,overflow:'hidden'}}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'10px 16px',borderBottom:'1px solid var(--border)'}}>
            <span style={{fontSize:11,fontFamily:'monospace',color:'var(--muted)',textTransform:'uppercase',letterSpacing:'0.08em'}}>Output</span>
            <div style={{display:'flex',gap:6}}>
              {output && (<>
                {showDownload && <button onClick={handleDownload} style={{fontSize:11,color:'var(--muted)',background:'none',border:'none',cursor:'pointer',padding:'2px 8px'}}>↓ Save</button>}
                <button onClick={handleCopy} style={{fontSize:11,color:copied?'var(--accent2)':'var(--muted)',background:'none',border:'none',cursor:'pointer',padding:'2px 8px'}}>{copied?'✓ Copied':'Copy'}</button>
                <button onClick={clear} style={{fontSize:11,color:'var(--muted)',background:'none',border:'none',cursor:'pointer',padding:'2px 8px'}}>Clear</button>
              </>)}
            </div>
          </div>
          <div style={{padding:16,maxHeight:520,overflowY:'auto'}}>
            {error
              ? <p style={{color:'var(--accent3)',fontSize:13}}>{error}</p>
              : <p style={{fontFamily:'monospace',fontSize:13,lineHeight:1.7,whiteSpace:'pre-wrap',wordBreak:'break-word',color:'rgba(240,240,248,0.9)',margin:0}}>{output}{loading && <span style={{animation:'blink 1s infinite',color:'var(--accent)'}}>▋</span>}</p>
            }
          </div>
        </div>
      )}
    </div>
  )
}
