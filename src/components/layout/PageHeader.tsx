import { cn } from '@/lib/utils'

type PageHeaderProps = {
  title: React.ReactNode
  eyebrow?: React.ReactNode
  description?: React.ReactNode
  /** Right-aligned actions (buttons, links). Wraps under the title on phones. */
  actions?: React.ReactNode
  /** Use the larger display style for hero-like pages (Find a Brother). */
  size?: 'default' | 'display'
  className?: string
}

export function PageHeader({ title, eyebrow, description, actions, size = 'default', className }: PageHeaderProps) {
  return (
    <header
      className={cn(
        'mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between md:gap-6',
        className
      )}
    >
      <div className="min-w-0">
        {eyebrow && <p className="eyebrow mb-1.5">{eyebrow}</p>}
        <h1 className={size === 'display' ? 'heading-display' : 'heading-1'}>{title}</h1>
        {description && <p className="mt-1.5 max-w-prose text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </header>
  )
}
