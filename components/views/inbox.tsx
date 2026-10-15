'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Inbox as InboxIcon, Camera, FileText, FileType, Link2, AlertTriangle, Loader2, Check, X } from 'lucide-react'
import type { InboxLead, LeadConfidence, Origin } from '@/types/atlas'
import { EmptyState } from '@/components/atlas/empty-state'
import { VerdictBadge } from '@/components/atlas/verdict-badge'
import { formatDeadline, formatFunding } from '@/lib/atlas-format'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'

const ORIGIN_ICON: Record<Origin, typeof Camera> = {
  screenshot: Camera,
  pdf: FileType,
  txt: FileText,
  search: Link2,
  manual: FileText,
}

const CONFIDENCE_META: Record<LeadConfidence, { label: string; className: string }> = {
  unverified: { label: 'Unverified', className: 'text-faint-foreground' },
  resolving: { label: 'Needs review', className: 'text-verdict-watch' },
  conflicting: { label: 'Conflicting', className: 'text-verdict-late' },
  resolved: { label: 'Resolved', className: 'text-verdict-ready' },
}

function LeadCard({ lead }: { lead: InboxLead }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [sourceUrlInput, setSourceUrlInput] = useState('')
  const OriginIcon = ORIGIN_ICON[lead.origin]
  const confidence = CONFIDENCE_META[lead.confidence]
  const ex = lead.extracted

  async function confirm() {
    setBusy(true)
    try {
      const res = await fetch('/api/inbox/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId: lead.id, sourceUrl: sourceUrlInput || undefined }),
      })
      const data = await res.json()
      if (data.error) {
        alert(data.error)
      } else {
        router.refresh()
      }
    } finally {
      setBusy(false)
    }
  }

  async function discard() {
    setBusy(true)
    try {
      await fetch('/api/inbox/discard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId: lead.id }),
      })
      router.refresh()
    } finally {
      setBusy(false)
    }
  }

  return (
    <li className="space-y-3 rounded-lg border border-border p-4">
      <div className="flex items-start gap-3">
        <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-surface-2 text-muted-foreground">
          <OriginIcon className="size-4" strokeWidth={1.75} />
        </div>
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-foreground">{ex.title || 'Untitled lead'}</p>
            <span className={cn('font-mono text-2xs font-medium uppercase tracking-wide', confidence.className)}>{confidence.label}</span>
          </div>
          {lead.raw_excerpt && <p className="text-xs text-muted-foreground line-clamp-2">&ldquo;{lead.raw_excerpt}&rdquo;</p>}
          <div className="flex flex-wrap items-center gap-3 font-mono text-2xs text-faint-foreground">
            <span>dropped {new Date(lead.dropped_at).toLocaleDateString()}</span>
            {ex.institution && <span>{ex.institution}</span>}
            {ex.deadline && <span>{formatDeadline(ex.deadline)}</span>}
            {ex.funding?.stipend && <span>{formatFunding(ex.funding.stipend)}</span>}
          </div>
        </div>
      </div>

      {lead.extraction_error && (
        <p className="flex items-start gap-1.5 rounded-md border border-verdict-blocked/40 bg-verdict-blocked-bg px-2.5 py-2 text-xs text-verdict-blocked">
          <AlertTriangle className="mt-0.5 size-3.5 shrink-0" strokeWidth={1.75} />
          Extraction failed — {lead.extraction_error}
        </p>
      )}

      {lead.confidence === 'conflicting' && (
        <p className="flex items-center gap-1.5 text-xs text-verdict-late">
          <AlertTriangle className="size-3.5" strokeWidth={1.75} />
          Looks like a match for an existing pool row — review before confirming, it may be a duplicate.
        </p>
      )}

      {!lead.extraction_error && (ex.eligibility_rules?.length || ex.requirements?.length) ? (
        <div className="space-y-2 rounded-md bg-surface-2 p-2.5">
          {ex.eligibility_rules?.map((r, i) => (
            <div key={i} className="text-xs">
              <span
                className={cn(
                  'mr-1.5 rounded px-1 py-0.5 font-mono text-2xs uppercase',
                  r.rule_type === 'mechanical' ? 'bg-verdict-blocked-bg text-verdict-blocked' : 'bg-verdict-watch-bg text-verdict-watch'
                )}
              >
                {r.rule_type}
              </span>
              <span className="text-foreground">{r.rule_text}</span>
              <p className="mt-0.5 pl-1 text-faint-foreground">&ldquo;{r.source_quote}&rdquo;</p>
            </div>
          ))}
          {ex.requirements?.map((r, i) => (
            <p key={i} className="text-xs text-muted-foreground">
              • {r.label}
            </p>
          ))}
        </div>
      ) : null}

      {lead.verdict_preview && (
        <div className="flex items-center gap-2">
          <span className="text-2xs text-faint-foreground">Preview verdict:</span>
          <VerdictBadge verdict={lead.verdict_preview.type} />
          {lead.verdict_preview.reason && <span className="text-2xs text-muted-foreground">{lead.verdict_preview.reason}</span>}
        </div>
      )}

      {lead.confidence !== 'resolved' && !lead.extraction_error && (
        <div className="space-y-2">
          {!lead.source_url && (
            <Input
              value={sourceUrlInput}
              onChange={(e) => setSourceUrlInput(e.target.value)}
              placeholder="No source URL — paste the official programme page URL before saving"
              className="h-8 text-xs"
            />
          )}
          <div className="flex gap-2">
            <Button size="sm" className="h-7 gap-1 text-xs" disabled={busy || (!lead.source_url && !sourceUrlInput.trim())} onClick={confirm}>
              {busy ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />} Confirm & save
            </Button>
            <Button size="sm" variant="ghost" className="h-7 gap-1 text-xs" disabled={busy} onClick={discard}>
              <X className="size-3.5" /> Discard
            </Button>
          </div>
        </div>
      )}
      {lead.extraction_error && (
        <Button size="sm" variant="ghost" className="h-7 gap-1 text-xs" disabled={busy} onClick={discard}>
          <X className="size-3.5" /> Discard
        </Button>
      )}
    </li>
  )
}

export function InboxView({ leads }: { leads: InboxLead[] }) {
  const router = useRouter()
  const [raw, setRaw] = useState('')
  const [extracting, setExtracting] = useState(false)

  async function extract() {
    const text = raw.trim()
    if (!text || extracting) return
    setExtracting(true)
    try {
      const res = await fetch('/api/inbox/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ raw: text }),
      })
      await res.json()
      setRaw('')
      router.refresh()
    } finally {
      setExtracting(false)
    }
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Inbox</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Paste an opportunity&apos;s text or its URL. Every drop is a lead, never a fact, until it resolves to a
          primary source and you confirm it.
        </p>
      </header>

      <div className="space-y-2 rounded-lg border border-dashed border-border px-4 py-4">
        <Textarea
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
          placeholder="Paste the opportunity's description, or a URL to its official page..."
          className="min-h-20 text-sm"
        />
        <div className="flex items-center justify-between">
          <p className="text-2xs text-faint-foreground">
            Screenshot and PDF upload aren&apos;t available yet — no OCR model is wired in. Paste text or a link instead.
          </p>
          <Button size="sm" className="h-7 gap-1 text-xs" disabled={!raw.trim() || extracting} onClick={extract}>
            {extracting ? <Loader2 className="size-3.5 animate-spin" /> : null} {extracting ? 'Extracting...' : 'Extract'}
          </Button>
        </div>
      </div>

      {leads.length === 0 ? (
        <EmptyState
          icon={InboxIcon}
          title="Inbox is empty"
          description="Nothing dropped yet. This is where LinkedIn posts, screenshots, and anything the automated sweeps can't reach get parsed into a lead and resolved before they're actionable."
        />
      ) : (
        <ul className="space-y-2">
          {leads.map((lead) => (
            <LeadCard key={lead.id} lead={lead} />
          ))}
        </ul>
      )}
    </div>
  )
}
