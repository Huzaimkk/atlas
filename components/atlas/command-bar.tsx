'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import {
  Command,
  History,
  Loader2,
  CornerDownLeft,
  Check,
  X,
  AlertTriangle,
  CalendarClock,
  HelpCircle,
  Target,
  Search,
  CheckCircle2,
  BadgeCheck,
  PlusCircle,
  ArrowLeft,
  MessageCircle,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { TOOL_DEFS, WRITE_TOOLS, type ToolName } from '@/lib/command-tools-schema'

// Phase B — structured palette is the default. No LLM, no API key: every
// field here is typed/picked by the user, so there's nothing to interpret
// and nothing to confirm-before-write beyond the user's own typed input.
// The old natural-language path (CometAPI) stays, feature-flagged off by
// default — it's also the only path currently blocked by CometAPI's quota,
// so this is the reliable default, not a workaround.
const NL_ENABLED = process.env.NEXT_PUBLIC_ENABLE_NL_COMMAND_BAR === 'true'

const TOOL_META: Record<ToolName, { icon: typeof Command; label: string }> = {
  query_deadlines: { icon: CalendarClock, label: 'Query deadlines' },
  explain_verdict: { icon: HelpCircle, label: 'Explain a verdict' },
  query_gap_queue: { icon: Target, label: 'Query the gap queue' },
  search_pool: { icon: Search, label: 'Search the pool' },
  mark_requirement_satisfied: { icon: CheckCircle2, label: 'Mark a requirement satisfied' },
  update_profile_credential: { icon: BadgeCheck, label: 'Update a profile credential' },
  add_opportunity_from_search: { icon: PlusCircle, label: 'Add an opportunity from search' },
}

interface OppOption {
  id: string
  title: string
  requirements: { label: string; satisfied: boolean }[]
}

interface PaletteOptions {
  opportunities: OppOption[]
  pendingItems: { item: string; status: string }[]
}

interface ProposedAction {
  tool: ToolName
  input: Record<string, unknown>
  summary: string
}

type Step = 'list' | 'form' | 'confirm' | 'result' | 'chat'

function defaultInput(tool: ToolName): Record<string, unknown> {
  switch (tool) {
    case 'query_deadlines':
      return { days: 30 }
    case 'query_gap_queue':
      return { limit: 10 }
    case 'update_profile_credential':
      return { status: 'in_progress' }
    default:
      return {}
  }
}

/** Free-text input with a filtered dropdown of real opportunity titles — never lets a write target a title that doesn't exist in the pool. */
function TitleAutocomplete({
  value,
  onChange,
  options,
  placeholder,
}: {
  value: string
  onChange: (title: string) => void
  options: OppOption[]
  placeholder: string
}) {
  const [focused, setFocused] = useState(false)
  const matches = useMemo(() => {
    if (!value.trim()) return options.slice(0, 8)
    const q = value.toLowerCase()
    return options.filter((o) => o.title.toLowerCase().includes(q)).slice(0, 8)
  }, [value, options])

  return (
    <div className="relative">
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setTimeout(() => setFocused(false), 120)}
        placeholder={placeholder}
        className="h-9 text-sm"
      />
      {focused && matches.length > 0 && (
        <ul className="absolute z-10 mt-1 w-full max-h-48 overflow-y-auto rounded-md border border-border bg-popover shadow-lg">
          {matches.map((o) => (
            <li key={o.id}>
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault()
                  onChange(o.title)
                  setFocused(false)
                }}
                className="block w-full truncate px-3 py-1.5 text-left text-xs text-foreground hover:bg-surface-2"
              >
                {o.title}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function renderResult(tool: ToolName, result: unknown): React.ReactNode {
  if (result && typeof result === 'object' && 'error' in (result as Record<string, unknown>)) {
    return <p className="text-xs text-verdict-blocked">{String((result as { error: unknown }).error)}</p>
  }
  if (Array.isArray(result)) {
    if (result.length === 0) return <p className="text-xs text-faint-foreground">No matching rows.</p>
    return (
      <ul className="space-y-1.5">
        {result.map((row, i) => (
          <li key={i} className="rounded border border-border px-2.5 py-1.5 text-xs">
            {Object.entries(row as Record<string, unknown>).map(([k, v]) => (
              <span key={k} className="mr-3 inline-block">
                <span className="text-faint-foreground">{k}:</span> <span className="text-foreground">{Array.isArray(v) ? v.join(', ') : String(v ?? '—')}</span>
              </span>
            ))}
          </li>
        ))}
      </ul>
    )
  }
  if (result && typeof result === 'object') {
    return (
      <div className="space-y-1 rounded border border-border px-2.5 py-2 text-xs">
        {Object.entries(result as Record<string, unknown>).map(([k, v]) => (
          <p key={k}>
            <span className="text-faint-foreground">{k}:</span>{' '}
            <span className="text-foreground">{Array.isArray(v) ? JSON.stringify(v) : String(v ?? '—')}</span>
          </p>
        ))}
      </div>
    )
  }
  return <p className="text-xs text-muted-foreground">{String(result)}</p>
}

export function CommandBar() {
  const [open, setOpen] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [history, setHistory] = useState<{ id: string; prompt: string; status: string; actions: unknown[]; created_at: string }[]>([])
  const inputRef = useRef<HTMLInputElement>(null)

  const [step, setStep] = useState<Step>('list')
  const [filter, setFilter] = useState('')
  const [options, setOptions] = useState<PaletteOptions>({ opportunities: [], pendingItems: [] })
  const [selectedTool, setSelectedTool] = useState<ToolName | null>(null)
  const [formValues, setFormValues] = useState<Record<string, unknown>>({})
  const [proposed, setProposed] = useState<ProposedAction | null>(null)
  const [commandLogId, setCommandLogId] = useState<string | null>(null)
  const [resultNode, setResultNode] = useState<React.ReactNode>(null)
  const [busy, setBusy] = useState(false)

  // Natural-language chat state (feature-flagged off by default)
  const [nlInput, setNlInput] = useState('')
  const [nlTurns, setNlTurns] = useState<{ role: 'user' | 'assistant'; text: string; proposedAction?: ProposedAction; commandLogId?: string; resolved?: 'confirmed' | 'rejected' }[]>([])

  useEffect(() => {
    function onKeydown(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null
      const typing = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setOpen((v) => !v)
      } else if (e.key === '/' && !typing && !open) {
        e.preventDefault()
        setOpen(true)
      } else if (e.key === 'Escape' && open) {
        setOpen(false)
      }
    }
    window.addEventListener('keydown', onKeydown)
    return () => window.removeEventListener('keydown', onKeydown)
  }, [open])

  useEffect(() => {
    if (!open) return
    setStep('list')
    setFilter('')
    setSelectedTool(null)
    setResultNode(null)
    fetch('/api/palette')
      .then((r) => r.json())
      .then((data) => setOptions({ opportunities: data.opportunities ?? [], pendingItems: data.pendingItems ?? [] }))
      .catch(() => {})
    setTimeout(() => inputRef.current?.focus(), 50)
  }, [open])

  async function loadHistory() {
    const res = await fetch('/api/chat')
    const data = await res.json()
    setHistory(data.history ?? [])
  }

  function pickTool(tool: ToolName) {
    setSelectedTool(tool)
    setFormValues(defaultInput(tool))
    setStep('form')
  }

  async function submitForm() {
    if (!selectedTool) return
    setBusy(true)
    try {
      const res = await fetch('/api/palette', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tool: selectedTool, input: formValues }),
      })
      const data = await res.json()
      if (data.error) {
        setResultNode(<p className="text-xs text-verdict-blocked">{data.error}</p>)
        setStep('result')
      } else if (data.pending) {
        setProposed(data.proposedAction)
        setCommandLogId(data.commandLogId)
        setStep('confirm')
      } else {
        setResultNode(renderResult(selectedTool, data.result))
        setStep('result')
      }
    } finally {
      setBusy(false)
    }
  }

  async function confirmWrite(approve: boolean) {
    if (!commandLogId) return
    setBusy(true)
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmCommandLogId: commandLogId, approve }),
      })
      const data = await res.json()
      setResultNode(
        approve ? (
          renderResult(selectedTool!, data.result)
        ) : (
          <p className="text-xs text-faint-foreground">Cancelled — nothing was written.</p>
        )
      )
      setStep('result')
    } finally {
      setBusy(false)
    }
  }

  function backToList() {
    setStep('list')
    setSelectedTool(null)
    setProposed(null)
    setCommandLogId(null)
    setResultNode(null)
  }

  // ---- natural-language path (feature-flagged) ----
  async function nlSubmit() {
    const command = nlInput.trim()
    if (!command || busy) return
    setNlInput('')
    setNlTurns((t) => [...t, { role: 'user', text: command }])
    setBusy(true)
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command }),
      })
      const data = await res.json()
      if (data.error) {
        setNlTurns((t) => [...t, { role: 'assistant', text: `Error: ${data.error}` }])
      } else if (data.pending) {
        setNlTurns((t) => [...t, { role: 'assistant', text: data.text || 'This needs your confirmation:', proposedAction: data.proposedAction, commandLogId: data.commandLogId }])
      } else {
        setNlTurns((t) => [...t, { role: 'assistant', text: data.text || '(no response)' }])
      }
    } catch (e) {
      setNlTurns((t) => [...t, { role: 'assistant', text: `Request failed: ${String(e)}` }])
    } finally {
      setBusy(false)
    }
  }

  async function nlRespond(logId: string, approve: boolean) {
    setBusy(true)
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmCommandLogId: logId, approve }),
      })
      const data = await res.json()
      setNlTurns((t) =>
        t.map((turn) =>
          turn.commandLogId === logId
            ? { ...turn, resolved: approve ? 'confirmed' : 'rejected', text: approve ? `${turn.text}\n\nDone: ${JSON.stringify(data.result)}` : `${turn.text}\n\nCancelled.` }
            : turn
        )
      )
    } finally {
      setBusy(false)
    }
  }

  const filteredTools = TOOL_DEFS.filter((t) => TOOL_META[t.name as ToolName].label.toLowerCase().includes(filter.toLowerCase()))

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
                {step !== 'list' && step !== 'chat' && (
                  <Button size="icon" variant="ghost" className="size-7 shrink-0" onClick={backToList} title="Back">
                    <ArrowLeft className="size-3.5" />
                  </Button>
                )}
                {step === 'chat' && (
                  <Button size="icon" variant="ghost" className="size-7 shrink-0" onClick={() => setStep('list')} title="Back">
                    <ArrowLeft className="size-3.5" />
                  </Button>
                )}
                <Command className="size-4 text-faint-foreground" strokeWidth={1.75} />
                {step === 'list' && (
                  <input
                    ref={inputRef}
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                    placeholder="Filter actions..."
                    className="flex-1 bg-transparent text-sm text-foreground placeholder:text-faint-foreground focus:outline-none"
                  />
                )}
                {step !== 'list' && step !== 'chat' && <p className="flex-1 text-sm font-medium text-foreground">{TOOL_META[selectedTool!].label}</p>}
                {step === 'chat' && <p className="flex-1 text-sm font-medium text-foreground">Ask in natural language</p>}
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
                {step === 'list' && (
                  <ul className="space-y-1">
                    {filteredTools.map((t) => {
                      const meta = TOOL_META[t.name as ToolName]
                      const Icon = meta.icon
                      const isWrite = WRITE_TOOLS.has(t.name as ToolName)
                      return (
                        <li key={t.name}>
                          <button
                            onClick={() => pickTool(t.name as ToolName)}
                            className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-sm hover:bg-surface-2"
                          >
                            <Icon className="size-4 shrink-0 text-muted-foreground" strokeWidth={1.75} />
                            <span className="flex-1 text-foreground">{meta.label}</span>
                            <span
                              className={cn(
                                'rounded px-1.5 py-0.5 font-mono text-2xs uppercase',
                                isWrite ? 'bg-verdict-gap-bg text-verdict-gap' : 'bg-verdict-watch-bg text-verdict-watch'
                              )}
                            >
                              {isWrite ? 'confirm' : 'read-only'}
                            </span>
                          </button>
                        </li>
                      )
                    })}
                    {NL_ENABLED && (
                      <li>
                        <button
                          onClick={() => setStep('chat')}
                          className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-sm hover:bg-surface-2"
                        >
                          <MessageCircle className="size-4 shrink-0 text-muted-foreground" strokeWidth={1.75} />
                          <span className="flex-1 text-foreground">Ask in natural language</span>
                        </button>
                      </li>
                    )}
                  </ul>
                )}

                {step === 'form' && selectedTool === 'query_deadlines' && (
                  <div className="space-y-2">
                    <label className="text-xs text-muted-foreground">Look-ahead window (days)</label>
                    <Input
                      type="number"
                      value={String(formValues.days ?? 30)}
                      onChange={(e) => setFormValues({ days: Number(e.target.value) })}
                      className="h-9 text-sm"
                    />
                  </div>
                )}

                {step === 'form' && selectedTool === 'explain_verdict' && (
                  <div className="space-y-2">
                    <label className="text-xs text-muted-foreground">Opportunity</label>
                    <TitleAutocomplete
                      value={String(formValues.opportunity_title ?? '')}
                      onChange={(title) => setFormValues({ opportunity_title: title })}
                      options={options.opportunities}
                      placeholder="Start typing a title..."
                    />
                  </div>
                )}

                {step === 'form' && selectedTool === 'query_gap_queue' && (
                  <div className="space-y-2">
                    <label className="text-xs text-muted-foreground">Max rows</label>
                    <Input
                      type="number"
                      value={String(formValues.limit ?? 10)}
                      onChange={(e) => setFormValues({ limit: Number(e.target.value) })}
                      className="h-9 text-sm"
                    />
                  </div>
                )}

                {step === 'form' && selectedTool === 'search_pool' && (
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <label className="text-xs text-muted-foreground">Free-text query</label>
                      <Input
                        value={String(formValues.query ?? '')}
                        onChange={(e) => setFormValues((v) => ({ ...v, query: e.target.value }))}
                        placeholder="Title, institution, field..."
                        className="h-9 text-sm"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs text-muted-foreground">Tier (optional)</label>
                      <div className="flex gap-2">
                        {(['T1', 'T2', 'T3'] as const).map((tier) => (
                          <button
                            key={tier}
                            onClick={() => setFormValues((v) => ({ ...v, tier: v.tier === tier ? undefined : tier }))}
                            className={cn(
                              'rounded-md border px-2.5 py-1 text-xs',
                              formValues.tier === tier ? 'border-primary bg-primary text-primary-foreground' : 'border-border text-muted-foreground'
                            )}
                          >
                            {tier}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {step === 'form' && selectedTool === 'mark_requirement_satisfied' && (
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <label className="text-xs text-muted-foreground">Opportunity</label>
                      <TitleAutocomplete
                        value={String(formValues.opportunity_title ?? '')}
                        onChange={(title) => setFormValues({ opportunity_title: title })}
                        options={options.opportunities}
                        placeholder="Start typing a title..."
                      />
                    </div>
                    {(() => {
                      const match = options.opportunities.find((o) => o.title === formValues.opportunity_title)
                      const unsatisfied = match?.requirements.filter((r) => !r.satisfied) ?? []
                      if (!match) return null
                      if (unsatisfied.length === 0) return <p className="text-xs text-faint-foreground">No outstanding requirements on this opportunity.</p>
                      return (
                        <div className="space-y-2">
                          <label className="text-xs text-muted-foreground">Requirement</label>
                          <div className="space-y-1">
                            {unsatisfied.map((r) => (
                              <button
                                key={r.label}
                                onClick={() => setFormValues((v) => ({ ...v, requirement_label: r.label }))}
                                className={cn(
                                  'block w-full rounded-md border px-2.5 py-1.5 text-left text-xs',
                                  formValues.requirement_label === r.label ? 'border-primary bg-surface-2 text-foreground' : 'border-border text-muted-foreground'
                                )}
                              >
                                {r.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      )
                    })()}
                  </div>
                )}

                {step === 'form' && selectedTool === 'update_profile_credential' && (
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <label className="text-xs text-muted-foreground">Pending item</label>
                      {options.pendingItems.length > 0 ? (
                        <div className="space-y-1">
                          {options.pendingItems.map((p) => (
                            <button
                              key={p.item}
                              onClick={() => setFormValues((v) => ({ ...v, item: p.item }))}
                              className={cn(
                                'block w-full rounded-md border px-2.5 py-1.5 text-left text-xs',
                                formValues.item === p.item ? 'border-primary bg-surface-2 text-foreground' : 'border-border text-muted-foreground'
                              )}
                            >
                              {p.item} <span className="text-faint-foreground">— {p.status}</span>
                            </button>
                          ))}
                        </div>
                      ) : (
                        <Input
                          value={String(formValues.item ?? '')}
                          onChange={(e) => setFormValues((v) => ({ ...v, item: e.target.value }))}
                          placeholder="No pending items on file — type the credential name"
                          className="h-9 text-sm"
                        />
                      )}
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs text-muted-foreground">Status</label>
                      <div className="flex gap-2">
                        {(['in_progress', 'taken'] as const).map((s) => (
                          <button
                            key={s}
                            onClick={() => setFormValues((v) => ({ ...v, status: s }))}
                            className={cn(
                              'rounded-md border px-2.5 py-1 text-xs',
                              formValues.status === s ? 'border-primary bg-primary text-primary-foreground' : 'border-border text-muted-foreground'
                            )}
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs text-muted-foreground">Score / detail (optional)</label>
                      <Input
                        value={String(formValues.score_or_detail ?? '')}
                        onChange={(e) => setFormValues((v) => ({ ...v, score_or_detail: e.target.value }))}
                        placeholder="e.g. 7.0"
                        className="h-9 text-sm"
                      />
                    </div>
                  </div>
                )}

                {step === 'form' && selectedTool === 'add_opportunity_from_search' && (
                  <div className="space-y-2">
                    <label className="text-xs text-muted-foreground">Search query</label>
                    <Input
                      value={String(formValues.query ?? '')}
                      onChange={(e) => setFormValues({ query: e.target.value })}
                      placeholder="e.g. Commonwealth Shared Scholarship 2027 deadline"
                      className="h-9 text-sm"
                    />
                  </div>
                )}

                {step === 'confirm' && proposed && (
                  <div className="space-y-2 rounded-md border border-verdict-gap/40 bg-verdict-gap-bg p-2.5">
                    <p className="flex items-center gap-1.5 text-xs font-medium text-verdict-gap">
                      <AlertTriangle className="size-3.5" strokeWidth={1.75} />
                      Confirm before writing
                    </p>
                    <p className="text-xs text-muted-foreground">{proposed.summary}</p>
                    <div className="flex gap-2">
                      <Button size="sm" className="h-7 gap-1 text-xs" disabled={busy} onClick={() => confirmWrite(true)}>
                        <Check className="size-3.5" /> Confirm
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 gap-1 text-xs" disabled={busy} onClick={() => confirmWrite(false)}>
                        <X className="size-3.5" /> Cancel
                      </Button>
                    </div>
                  </div>
                )}

                {step === 'result' && <div>{resultNode}</div>}

                {step === 'chat' && (
                  <>
                    {nlTurns.length === 0 && (
                      <p className="py-6 text-center text-xs text-faint-foreground">
                        Try: &ldquo;what unblocks the most rows right now&rdquo; or &ldquo;mark the SOP done for Gates Cambridge&rdquo;
                      </p>
                    )}
                    {nlTurns.map((turn, i) => (
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
                              <Button size="sm" className="h-7 gap-1 text-xs" disabled={busy} onClick={() => nlRespond(turn.commandLogId!, true)}>
                                <Check className="size-3.5" /> Confirm
                              </Button>
                              <Button size="sm" variant="ghost" className="h-7 gap-1 text-xs" disabled={busy} onClick={() => nlRespond(turn.commandLogId!, false)}>
                                <X className="size-3.5" /> Cancel
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </>
                )}

                {busy && (
                  <div className="flex items-center gap-2 px-3 text-xs text-faint-foreground">
                    <Loader2 className="size-3.5 animate-spin" /> Working...
                  </div>
                )}
              </div>

              {step === 'form' && (
                <div className="flex items-center justify-between border-t border-border px-4 py-2">
                  <span className="text-2xs text-faint-foreground">
                    {WRITE_TOOLS.has(selectedTool!) ? "You'll see exactly what this writes before it saves." : 'Runs immediately — read-only.'}
                  </span>
                  <Button size="sm" className="h-7 gap-1 text-xs" disabled={busy} onClick={submitForm}>
                    {WRITE_TOOLS.has(selectedTool!) ? 'Review' : 'Run'} <CornerDownLeft className="size-3" />
                  </Button>
                </div>
              )}
              {step === 'result' && (
                <div className="flex items-center justify-end border-t border-border px-4 py-2">
                  <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={backToList}>
                    Back to actions
                  </Button>
                </div>
              )}
              {step === 'chat' && (
                <div className="flex items-center gap-2 border-t border-border px-4 py-2">
                  <input
                    value={nlInput}
                    onChange={(e) => setNlInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), nlSubmit())}
                    placeholder="Ask Atlas..."
                    className="flex-1 bg-transparent text-sm text-foreground placeholder:text-faint-foreground focus:outline-none"
                  />
                  <span className="flex items-center gap-1 text-2xs text-faint-foreground">
                    <CornerDownLeft className="size-3" /> to send
                  </span>
                </div>
              )}
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
