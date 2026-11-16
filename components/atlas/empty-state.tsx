import type { LucideIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon
  title: string
  description: string
  action?: { label: string; onClick: () => void }
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border-strong bg-surface/40 px-6 py-16 text-center">
      <div className="flex size-10 items-center justify-center rounded-full bg-surface-2 text-faint-foreground">
        <Icon className="size-5" strokeWidth={1.5} />
      </div>
      <div className="max-w-md space-y-1.5">
        <p className="display text-xl text-foreground">{title}</p>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      {action && (
        <Button size="sm" variant="secondary" className="mt-1" onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </div>
  )
}
