'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { Command, History, Loader2, CornerDownLeft, Check, X, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'

interface ProposedAction {
  tool: string
  input: Record<string, unknown>
  summary: string
}

interface Turn {
  role: 'user' | 'assistant'
  text: string
  proposedAction?: ProposedAction
  commandLogId?: string
  resolved?: 'confirmed' | 'rejected'
}

interface HistoryRow {
  id: string
  prompt: string
  status: string
  actions: unknown[]
  created_at: string
}

export function CommandBar() {
  const [open, setOpen] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [input, setInput] = useState('')
  const [turns, setTurns] = useState<Turn[]>([])
  const [busy, setBusy] = useState(false)
  const [history, setHistory] = useState<HistoryRow[]>([])
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    function onKeydown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setOpen((v) => !v)
      }
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKeydown)
    return () => window.removeEventListener('keydown', onKeydown)
  }, [])

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50)
  }, [open])

  async function loadHistory() {
    const res = await fetch('/api/chat')
    const data = await res.json()
    setHistory(data.history ?? [])
  }

  async function submit() {
    const command = input.trim()
    if (!command || busy) return
    setInput('')
    setTurns((t) => [...t, { role: 'user', text: command }])
    setBusy(true)
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command }),
      })
      const data = await res.json()
      if (data.error) {
        setTurns((t) => [...t, { role: 'assistant', text: `Error: ${data.error}` }])
      } else if (data.pending) {
        setTurns((t) => [...t, { role: 'assistant', text: data.text || 'This needs your confirmation:', proposedAction: data.proposedAction, commandLogId: data.commandLogId }])
      } else {
        setTurns((t) => [...t, { role: 'assistant', text: data.text || '(no response)' }])
      }
    } catch (e) {
      setTurns((t) => [...t, { role: 'assistant', text: `Request failed: ${String(e)}` }])
    } finally {
      setBusy(false)
    }
  }

  async function respond(commandLogId: string, approve: boolean) {
    setBusy(true)
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmCommandLogId: commandLogId, approve }),
      })
      const data = await res.json()
      setTurns((t) =>
        t.map((turn) =>
          turn.commandLogId === commandLogId
            ? {
                ...turn,
                resolved: approve ? 'confirmed' : 'rejected',
                text: approve ? `${turn.text}\n\nDone: ${JSON.stringify(data.result)}` : `${turn.text}\n\nCancelled.`,
              }
            : turn
        )
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex w-full items-center gap-2 rounded-md border border-border bg-surface px-2.5 py-1.5 text-xs text-muted-foreground hover:border-border-strong hover:text-foreground"
      >
        <Command className="size-3.5" strokeWidth={1.75} />
        Ask Atlas
        <kbd className="ml-auto rounded border border-border-strong px-1 font-mono text-2xs">⌘K</kbd>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 pt-[10vh]"
            onClick={() => setOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.98 }}
              transition={{ duration: 0.15 }}
              onClick={(e) => e.stopPropagation()}
              className="flex max-h-[70vh] w-full max-w-2xl flex-col overflow-hidden rounded-lg border border-border-strong bg-popover shadow-2xl"
            >
              <div className="flex items-center gap-2 border-b border-border px-4 py-3">
                <Command className="size-4 text-faint-foreground" strokeWidth={1.75} />
                <input
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), submit())}
                  placeholder="Ask Atlas — why is Chevening blocked? what's due in the next 30 days?"
                  className="flex-1 bg-transparent text-sm text-foreground placeholder:text-faint-foreground focus:outline-none"
                />
                <Button
                  size="icon"
                  variant="ghost"
                  className="size-7 shrink-0"
                  onClick={() => {
                    setHistoryOpen(true)
                    loadHistory()
                  }}
                  title="Command history"
                >
                  <History className="size-3.5" />
                </Button>
              </div>

              <div className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
                {turns.length === 0 && (
                  <p className="py-6 text-center text-xs text-faint-foreground">
                    Try: &ldquo;what unblocks the most rows right now&rdquo; or &ldquo;mark the SOP done for Gates Cambridge&rdquo;
                  </p>
                )}
                {turns.map((turn, i) => (
                  <div key={i} className={cn('rounded-md px-3 py-2 text-sm', turn.role === 'user' ? 'bg-surface-2 text-foreground' : 'text-foreground')}>
                    <p className="whitespace-pre-wrap">{turn.text}</p>
                    {turn.proposedAction && !turn.resolved && (
                      <div className="mt-2 space-y-2 rounded-md border border-verdict-gap/40 bg-verdict-gap-bg p-2.5">
                        <p className="flex items-center gap-1.5 text-xs font-medium text-verdict-gap">
                          <AlertTriangle className="size-3.5" strokeWidth={1.75} />
                          Confirm before writing
                        </p>
                        <p className="text-xs text-muted-foreground">{turn.proposedAction.summary}</p>
                        <div className="flex gap-2">
                          <Button size="sm" className="h-7 gap-1 text-xs" disabled={busy} onClick={() => respond(turn.commandLogId!, true)}>
                            <Check className="size-3.5" /> Confirm
                          </Button>
                          <Button size="sm" variant="ghost" className="h-7 gap-1 text-xs" disabled={busy} onClick={() => respond(turn.commandLogId!, false)}>
                            <X className="size-3.5" /> Cancel
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
                {busy && (
                  <div className="flex items-center gap-2 px-3 text-xs text-faint-foreground">
                    <Loader2 className="size-3.5 animate-spin" /> Working...
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between border-t border-border px-4 py-2 text-2xs text-faint-foreground">
                <span>Every write shows what it's about to do first — nothing saves without confirmation.</span>
                <span className="flex items-center gap-1">
                  <CornerDownLeft className="size-3" /> to send
                </span>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <Sheet open={historyOpen} onOpenChange={setHistoryOpen}>
        <SheetContent side="right" className="w-96">
          <SheetHeader>
            <SheetTitle>Command history</SheetTitle>
          </SheetHeader>
          <div className="mt-4 space-y-3 overflow-y-auto px-4">
            {history.length === 0 && <p className="text-xs text-faint-foreground">No commands yet.</p>}
            {history.map((h) => (
              <div key={h.id} className="space-y-1 rounded-md border border-border p-3 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-foreground">{h.prompt}</span>
                  <span
                    className={cn(
                      'rounded px-1.5 py-0.5 font-mono text-2xs uppercase',
                      h.status === 'confirmed' && 'bg-verdict-ready-bg text-verdict-ready',
                      h.status === 'rejected' && 'bg-verdict-late-bg text-verdict-late',
                      h.status === 'pending' && 'bg-verdict-gap-bg text-verdict-gap',
                      h.status === 'read_only' && 'bg-verdict-watch-bg text-verdict-watch'
                    )}
                  >
                    {h.status}
                  </span>
                </div>
                <p className="font-mono text-2xs text-faint-foreground">{new Date(h.created_at).toLocaleString()}</p>
                {h.actions.length > 0 && (
                  <pre className="mt-1 max-h-32 overflow-y-auto rounded bg-surface-2 p-2 text-2xs text-muted-foreground">{JSON.stringify(h.actions, null, 2)}</pre>
                )}
              </div>
            ))}
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}
