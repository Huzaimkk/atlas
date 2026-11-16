import { UserCircle, CheckCircle2, Circle, FileEdit, Clock } from 'lucide-react'
import type { ProfileSnapshot } from '@/types/atlas'
import { EmptyState } from '@/components/atlas/empty-state'
import { PageHeader } from '@/components/atlas/page-header'
import { cn } from '@/lib/utils'
import { postDegreeHours } from '@/lib/atlas-format'

const DOCUMENT_LABELS: Record<keyof ProfileSnapshot['document_inventory'], string> = {
  sop: 'Statement of purpose',
  research_statement: 'Research statement',
  cv: 'CV',
  transcripts: 'Transcripts',
  lor_commitments: 'LOR commitments',
  writing_sample: 'Writing sample',
  portfolio: 'Portfolio',
}

function DocStatusIcon({ status }: { status: 'ready' | 'draft' | 'missing' }) {
  if (status === 'ready') return <CheckCircle2 className="size-3.5 text-verdict-ready" strokeWidth={1.75} />
  if (status === 'draft') return <FileEdit className="size-3.5 text-verdict-gap" strokeWidth={1.75} />
  return <Circle className="size-3.5 text-faint-foreground" strokeWidth={1.75} />
}

export function ProfileView({ profile, onAddCv }: { profile: ProfileSnapshot | null; onAddCv?: () => void }) {
  return (
    <div className="space-y-6">
      <PageHeader title="Profile" description="What Atlas knows about you. Every verdict is computed against exactly this.">
        {profile && (
          <span className="font-mono text-xs text-faint-foreground">
            {/* user_version, never the global `version` — that one leaks system-wide usage (see types/atlas.ts) */}
            Version {profile.user_version ?? 1} · {new Date(profile.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </span>
        )}
      </PageHeader>

      {!profile ? (
        <EmptyState
          icon={UserCircle}
          title="No profile yet"
          description="Add your CV to start. Every verdict is computed against your profile, so nothing can be checked until it exists."
          action={onAddCv ? { label: 'Add your CV', onClick: onAddCv } : undefined}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <section className="space-y-2 rounded-lg border border-border bg-surface p-5">
            <h2 className="text-sm font-medium text-foreground">Identity and constraints</h2>
            <dl className="space-y-1 text-sm">
              <Row label="Citizenship" value={profile.identity.citizenship} />
              <Row label="Current degree" value={profile.identity.current_degree_level} />
              <Row label="Institution" value={profile.identity.current_institution} />
              <Row label="Funding requirement" value={profile.identity.funding_requirement === 'fully_funded_only' ? 'Fully funded only' : 'Flexible'} />
              <Row label="Target degree levels" value={profile.identity.target_degree_levels.join(' + ') || '—'} />
            </dl>
          </section>

          <section className="space-y-2 rounded-lg border border-border bg-surface p-5">
            <h2 className="text-sm font-medium text-foreground">Credentials</h2>
            <dl className="space-y-1 text-sm">
              <Row
                label="Post-degree hours"
                value={
                  profile.degree_completed_on
                    ? `${postDegreeHours(profile.degree_completed_on, profile.full_time_hours_per_month).toLocaleString()} (computed today)`
                    : 'Add your degree completion date'
                }
              />
              {profile.credentials.degrees.map((d) => (
                <Row key={d.name} label={d.name} value={`${d.institution} · ${d.date}${d.cgpa ? ` · ${d.cgpa}` : ''}`} />
              ))}
              {profile.credentials.certifications.map((c) => (
                <Row key={c} label="Certification" value={c} />
              ))}
            </dl>
          </section>

          <section className="space-y-2 rounded-lg border border-border bg-surface p-5 sm:col-span-2">
            <h2 className="text-sm font-medium text-foreground">Research fingerprint</h2>
            <div className="flex flex-wrap gap-1.5">
              {profile.research_fingerprint.map((tag) => (
                <span key={tag} className="rounded-md bg-surface-2 px-2 py-1 text-xs text-foreground">
                  {tag}
                </span>
              ))}
            </div>
          </section>

          <section className="space-y-2 rounded-lg border border-border bg-surface p-5 sm:col-span-2">
            <h2 className="text-sm font-medium text-foreground">Document inventory</h2>
            <ul className="grid grid-cols-2 gap-x-6 gap-y-1.5 sm:grid-cols-3">
              {(Object.keys(profile.document_inventory) as (keyof ProfileSnapshot['document_inventory'])[]).map((key) => (
                <li key={key} className="flex items-center gap-1.5 text-sm">
                  <DocStatusIcon status={profile.document_inventory[key]} />
                  <span className={cn(profile.document_inventory[key] === 'missing' && 'text-muted-foreground')}>
                    {DOCUMENT_LABELS[key]}
                  </span>
                </li>
              ))}
            </ul>
          </section>

          {profile.pending_items.length > 0 && (
            <section className="space-y-2 rounded-lg border border-border bg-surface p-5 sm:col-span-2">
              <h2 className="text-sm font-medium text-foreground">In progress, not yet counted</h2>
              <ul className="space-y-1.5 text-sm">
                {profile.pending_items.map((p) => (
                  <li key={p.item} className="flex items-center justify-between gap-3">
                    <span className="flex items-center gap-1.5 text-foreground">
                      <Clock className="size-3.5 text-verdict-gap" strokeWidth={1.75} />
                      {p.item}
                      {p.note && <span className="text-xs text-muted-foreground">— {p.note}</span>}
                    </span>
                    <span className="shrink-0 font-mono text-2xs text-faint-foreground">
                      {p.status.replace('_', ' ')}
                      {p.expected_completion ? ` · expected ${p.expected_completion}` : ''}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {profile.network.length > 0 && (
            <section className="space-y-2 rounded-lg border border-border bg-surface p-5 sm:col-span-2">
              <h2 className="text-sm font-medium text-foreground">Network</h2>
              <ul className="space-y-1 text-sm">
                {profile.network.map((n) => (
                  <li key={n.professor} className="flex justify-between gap-2">
                    <span className="text-foreground">
                      {n.professor} <span className="text-muted-foreground">· {n.institution}</span>
                    </span>
                    <span className="font-mono text-2xs text-faint-foreground">{n.outcome}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right text-foreground">{value}</dd>
    </div>
  )
}
