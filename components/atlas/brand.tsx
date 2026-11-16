import { cn } from '@/lib/utils'

/**
 * The Atlas mark: a globe reduced to one meridian and the equator, with a
 * single fixed point on it — "a position". Drawn in currentColor so it
 * inherits whatever ink the surrounding text uses.
 */
export function AtlasMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={cn('size-5', className)}>
      <circle cx="12" cy="12" r="9.25" stroke="currentColor" strokeWidth="1.5" />
      <ellipse cx="12" cy="12" rx="4.1" ry="9.25" stroke="currentColor" strokeWidth="1.5" opacity="0.55" />
      <path d="M2.75 12h18.5" stroke="currentColor" strokeWidth="1.5" opacity="0.55" />
      <circle cx="15.6" cy="7.9" r="2.1" fill="currentColor" />
    </svg>
  )
}

export function AtlasWordmark({ className }: { className?: string }) {
  return (
    <span className={cn('flex items-center gap-2 text-foreground', className)}>
      <AtlasMark />
      <span className="display text-lg leading-none">Atlas</span>
    </span>
  )
}
