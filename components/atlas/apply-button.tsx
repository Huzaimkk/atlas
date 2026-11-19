'use client'

import { ArrowUpRight } from 'lucide-react'
import type { Opportunity } from '@/types/atlas'
import { applyLinkFor } from '@/lib/apply-link'
import { cn } from '@/lib/utils'

/**
 * The way out of Atlas to the programme's own application. Opens in a new
 * tab. "Apply" only when the destination is a submission portal; "How to
 * apply" when Atlas only knows an information page. Clicking it never
 * changes application status — that stays an explicit choice.
 */
export function ApplyButton({
  opp,
  size = 'sm',
  className,
}: {
  opp: Pick<Opportunity, 'apply_url' | 'source_url' | 'application_details' | 'title'>
  size?: 'sm' | 'md'
  className?: string
}) {
  const link = applyLinkFor(opp)
  if (!link) return null
  const portal = link.kind === 'portal'
  return (
    <a
      href={link.href}
      target="_blank"
      rel="noreferrer"
      onClick={(e) => e.stopPropagation()}
      title={portal ? `Open the ${opp.title} application${link.verified ? '' : ' (portal address not checked by hand)'}` : `No application portal on record — opens the programme's information page`}
      className={cn(
        'inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-md font-medium transition-colors duration-150',
        size === 'sm' ? 'h-7 px-2.5 text-xs' : 'h-9 px-3.5 text-sm',
        portal
          ? 'bg-primary text-primary-foreground hover:opacity-90'
          : 'border border-border-strong text-muted-foreground hover:bg-surface-2 hover:text-foreground',
        className
      )}
    >
      {portal ? 'Apply' : 'How to apply'}
      <ArrowUpRight className={size === 'sm' ? 'size-3' : 'size-3.5'} strokeWidth={2} />
    </a>
  )
}
