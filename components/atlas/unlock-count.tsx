import { cn } from '@/lib/utils'

const MAX_MARKS = 24

/**
 * "Closing this opens N opportunities", drawn as N marks — one per
 * opportunity — rather than a filled bar. A bar scaled to the largest gap
 * reads as progress ("2× letters of recommendation: 90% done") when
 * nothing has been done at all. Marks are a count: hollow, never filled,
 * never a fraction of anything.
 */
export function UnlockCount({ count, className, showLabel = true }: { count: number; className?: string; showLabel?: boolean }) {
  const shown = Math.min(count, MAX_MARKS)
  return (
    <span className={cn('inline-flex items-center gap-2', className)} aria-label={`unlocks ${count} ${count === 1 ? 'opportunity' : 'opportunities'}`}>
      <span className="flex flex-wrap gap-[3px]" aria-hidden="true">
        {Array.from({ length: shown }, (_, i) => (
          <span key={i} className="size-[7px] rounded-[2px] border border-muted-foreground/70" />
        ))}
        {count > MAX_MARKS && <span className="font-mono text-2xs leading-[7px] text-faint-foreground">+{count - MAX_MARKS}</span>}
      </span>
      {showLabel && (
        <span className="whitespace-nowrap font-mono text-xs text-muted-foreground tabular-nums">
          unlocks <span className="text-foreground">{count}</span>
        </span>
      )}
    </span>
  )
}
