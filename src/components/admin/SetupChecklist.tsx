import Link from 'next/link'
import { CheckCircle2, Circle } from 'lucide-react'
import { cn } from '@/lib/utils'

export type SetupStep = { id: string; label: string; done: boolean; href?: string }

/** Three steps for a brand-new chapter. Disappears once the first brother is approved. */
export function SetupChecklist({ steps }: { steps: SetupStep[] }) {
  const next = steps.find((s) => !s.done)
  return (
    <section aria-labelledby="setup-heading" className="rounded-xl bg-primary-soft p-4 sm:p-5">
      <h2 id="setup-heading" className="heading-4 text-primary">
        Get your chapter running
      </h2>
      <ol className="mt-3 space-y-2">
        {steps.map((s, i) => {
          const isNext = s.id === next?.id
          const inner = (
            <>
              {s.done ? (
                <CheckCircle2 className="size-5 shrink-0 text-success" aria-hidden="true" />
              ) : (
                <Circle className={cn('size-5 shrink-0', isNext ? 'text-primary' : 'text-muted-foreground/50')} aria-hidden="true" />
              )}
              <span className={cn('text-sm', s.done ? 'text-muted-foreground line-through' : isNext ? 'font-semibold text-foreground' : 'text-muted-foreground')}>
                {i + 1}. {s.label}
              </span>
            </>
          )
          return (
            <li key={s.id}>
              {!s.done && s.href ? (
                <Link href={s.href} className="flex items-center gap-3 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  {inner}
                </Link>
              ) : (
                <div className="flex items-center gap-3">{inner}</div>
              )}
            </li>
          )
        })}
      </ol>
    </section>
  )
}
