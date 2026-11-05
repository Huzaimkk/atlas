'use client'

import { useRef, useState } from 'react'
import { FileText, UploadCloud, CheckCircle2, XCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

type UploadState =
  | { status: 'idle' }
  | { status: 'uploading'; name: string }
  | { status: 'done'; name: string; message: string }
  | { status: 'error'; name: string; message: string }

export function CvIntakeView() {
  const [dragActive, setDragActive] = useState(false)
  const [state, setState] = useState<UploadState>({ status: 'idle' })
  const inputRef = useRef<HTMLInputElement>(null)

  async function upload(file: File) {
    setState({ status: 'uploading', name: file.name })
    const form = new FormData()
    form.append('file', file)
    try {
      const res = await fetch('/api/cv/upload', { method: 'POST', body: form })
      const data = await res.json()
      if (!res.ok) setState({ status: 'error', name: file.name, message: data.error ?? 'Upload failed' })
      else setState({ status: 'done', name: file.name, message: data.message })
    } catch {
      setState({ status: 'error', name: file.name, message: 'Could not reach the server — try again.' })
    }
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragActive(false)
    const file = e.dataTransfer.files[0]
    if (file) upload(file)
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Add your CV</h1>
        <p className="mt-1 max-w-xl text-sm text-muted-foreground">
          Drop a PDF or Word file to start a draft profile. Parsing only gets you so far — Atlas follows up with the
          questions a CV can't answer (was that degree period paid work? is that paper actually submitted?) before
          anything becomes a profile a verdict can rely on.
        </p>
      </header>

      <div
        onDragOver={(e) => {
          e.preventDefault()
          setDragActive(true)
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        className={cn(
          'flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-6 py-20 text-center transition-colors cursor-pointer',
          dragActive ? 'border-primary bg-primary/5' : 'border-border hover:border-border-strong'
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.docx"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) upload(file)
          }}
        />
        <div className="flex size-12 items-center justify-center rounded-full bg-surface-2 text-muted-foreground">
          <UploadCloud className="size-6" strokeWidth={1.5} />
        </div>
        <div className="space-y-1">
          <p className="text-sm font-medium text-foreground">Drop your CV here, or click to browse</p>
          <p className="text-xs text-faint-foreground">PDF or .docx, up to 15MB</p>
        </div>
      </div>

      {state.status !== 'idle' && (
        <div
          className={cn(
            'flex items-start gap-3 rounded-lg border p-4 text-sm',
            state.status === 'error' ? 'border-destructive/40 bg-destructive/10' : 'border-border bg-surface-2/60'
          )}
        >
          {state.status === 'uploading' && <FileText className="mt-0.5 size-4 shrink-0 animate-pulse text-muted-foreground" strokeWidth={1.75} />}
          {state.status === 'done' && <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-verdict-ready" strokeWidth={1.75} />}
          {state.status === 'error' && <XCircle className="mt-0.5 size-4 shrink-0 text-destructive" strokeWidth={1.75} />}
          <div className="space-y-0.5">
            <p className="font-medium text-foreground">{state.name}</p>
            <p className="text-xs text-muted-foreground">
              {state.status === 'uploading' ? 'Uploading…' : state.message}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
