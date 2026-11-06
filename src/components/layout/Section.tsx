import type { ReactNode } from 'react'

/** Flat page section: heading row with optional aside, then content (rows separated by hairlines). */
export function Section({
  id,
  title,
  description,
  aside,
  flush = false,
  children,
}: {
  id: string
  title: string
  description?: string
  aside?: ReactNode
  /** Rows butt against the heading rule (settings style) instead of a padded block. */
  flush?: boolean
  children: ReactNode
}) {
  return (
    <section id={id} aria-labelledby={`${id}-heading`} className="scroll-mt-24">
      <div className="flex items-baseline justify-between gap-3 border-b border-border pb-2">
        <div>
          <h2 id={`${id}-heading`} className="heading-4">
            {title}
          </h2>
          {description && <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>}
        </div>
        {aside}
      </div>
      <div className={flush ? 'divide-y divide-border' : 'pt-4'}>{children}</div>
    </section>
  )
}

/** Label on the left, control on the right. Stacks on narrow screens. */
export function SectionRow({
  label,
  hint,
  htmlFor,
  children,
}: {
  label: ReactNode
  hint?: ReactNode
  htmlFor?: string
  children: ReactNode
}) {
  return (
    <div className="grid gap-2 py-3 sm:grid-cols-[minmax(0,1fr)_minmax(14rem,18rem)] sm:items-center sm:gap-6">
      <div className="min-w-0">
        {htmlFor ? (
          <label htmlFor={htmlFor} className="block text-sm font-medium">
            {label}
          </label>
        ) : (
          <p className="text-sm font-medium">{label}</p>
        )}
        {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
      </div>
      <div className="min-w-0 sm:justify-self-end sm:w-full">{children}</div>
    </div>
  )
}
