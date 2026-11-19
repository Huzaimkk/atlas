import type { ApplicationDetails, ApplicationFactStatus, ApplicationTopic } from '@/types/atlas'
import { cn } from '@/lib/utils'

const TOPIC_LABELS: Record<ApplicationTopic, string> = {
  deadline: 'Deadline',
  letters: 'Recommendation letters',
  portal: 'Where to submit',
  transcripts: 'Transcripts',
  english: 'English test',
  fee: 'Application fee',
  fee_waiver: 'Fee waiver',
}

const STATUS_META: Record<ApplicationFactStatus, { label: string; className: string }> = {
  verified: { label: 'Checked', className: 'text-verdict-ready' },
  unverified: { label: 'Not checked', className: 'text-faint-foreground' },
  conflicting: { label: 'Pages disagree', className: 'text-verdict-late' },
  passed: { label: 'Window closed', className: 'text-verdict-gap' },
}

/**
 * The how-to-apply facts for one programme (migration 0015). Nothing here
 * is a condition you must meet — those live in eligibility rules — so it
 * is shown as reference, with each fact's own checked state. A
 * conflicting fact lists every quote and does not pick one.
 */
export function ApplicationFacts({ details }: { details?: ApplicationDetails | null }) {
  if (!details?.items?.length) return null
  return (
    <section className="space-y-3">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-sm font-medium text-foreground">How to apply</h3>
        <span className="font-mono text-2xs text-faint-foreground">checked {details.checked_on}</span>
      </div>
      <dl className="divide-y divide-border rounded-lg border border-border">
        {details.items.map((item, i) => {
          const meta = STATUS_META[item.status]
          return (
            <div key={`${item.topic}-${i}`} className="space-y-2 px-4 py-3">
              <dt className="flex items-center justify-between gap-3">
                <span className="text-xs text-muted-foreground">{TOPIC_LABELS[item.topic]}</span>
                <span className={cn('text-2xs font-medium', meta.className)}>{meta.label}</span>
              </dt>
              <dd className="space-y-2">
                <p className={cn('text-sm', item.status === 'unverified' ? 'text-muted-foreground' : 'text-foreground')}>{item.summary}</p>
                {item.quotes.map((quote, qi) => (
                  <blockquote key={qi} className="border-l-2 border-border-strong pl-3">
                    <p className="source-quote text-sm">&ldquo;{quote.text}&rdquo;</p>
                    <a
                      href={quote.source_url}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-0.5 block truncate font-mono text-2xs text-faint-foreground underline-offset-2 hover:text-muted-foreground hover:underline"
                    >
                      {quote.source_url.replace(/^https?:\/\//, '')}
                    </a>
                  </blockquote>
                ))}
                {item.note && <p className="text-xs text-muted-foreground">{item.note}</p>}
              </dd>
            </div>
          )
        })}
      </dl>
    </section>
  )
}
