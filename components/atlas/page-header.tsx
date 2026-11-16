/**
 * The one page-title treatment every view uses: serif title, one plain
 * sentence under it, optional right-aligned slot for a count or control.
 */
export function PageHeader({
  title,
  description,
  children,
}: {
  title: string
  description?: React.ReactNode
  children?: React.ReactNode
}) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-x-8 gap-y-3 border-b border-border pb-5">
      <div className="min-w-0">
        <h1 className="display text-3xl text-foreground">{title}</h1>
        {description && <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{description}</p>}
      </div>
      {children && <div className="shrink-0">{children}</div>}
    </header>
  )
}

/** A titled block inside a view. Sentence case, no tracked-out caps. */
export function SectionTitle({
  children,
  count,
  icon: Icon,
  className,
}: {
  children: React.ReactNode
  count?: number
  icon?: React.ElementType
  className?: string
}) {
  return (
    <h2 className={`flex items-center gap-2 text-sm font-medium text-foreground ${className ?? ''}`}>
      {Icon && <Icon className="size-3.5 shrink-0 text-muted-foreground" strokeWidth={1.75} />}
      <span>{children}</span>
      {count !== undefined && <span className="font-mono text-xs font-normal text-faint-foreground tabular-nums">{count}</span>}
    </h2>
  )
}
