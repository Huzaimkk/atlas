import { VERDICT_META, TIER_META } from '@/lib/atlas-format'
import type { Tier, VerdictType } from '@/types/atlas'
import { cn } from '@/lib/utils'

export function VerdictBadge({ verdict, className }: { verdict: VerdictType; className?: string }) {
  const meta = VERDICT_META[verdict]
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-medium whitespace-nowrap',
        className
      )}
      style={{ color: meta.colorVar, background: meta.bgVar }}
    >
      <span className="size-1.5 rounded-full" style={{ background: meta.colorVar }} />
      {meta.label}
    </span>
  )
}

export function TierBadge({ tier, className }: { tier: Tier; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md border border-border-strong px-1.5 py-0.5 font-mono text-2xs text-muted-foreground whitespace-nowrap',
        className
      )}
    >
      {TIER_META[tier].label}
    </span>
  )
}
