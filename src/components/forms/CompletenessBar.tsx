'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { CheckCircle2, Circle, X } from 'lucide-react'
import { dismissCompletenessCard } from '@/actions/profile'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'

export type CompletenessItem = { id: string; label: string; done: boolean; href: string; why: string }

export function completeness(items: CompletenessItem[]): number {
  if (!items.length) return 0
  return Math.round((items.filter((i) => i.done).length / items.length) * 100)
}

/**
 * Profile completeness with the next concrete thing to add and why it matters.
 * Once everything is done the member can close it for good.
 */
export function CompletenessBar({ items, className }: { items: CompletenessItem[]; className?: string }) {
  const [hidden, setHidden] = useState(false)
  const [, startTransition] = useTransition()
  const pct = completeness(items)
  const next = items.find((i) => !i.done)
  const complete = pct === 100

  if (hidden) return null

  function dismiss() {
    setHidden(true)
    startTransition(() => dismissCompletenessCard())
  }

  return (
    <section
      aria-labelledby="completeness-heading"
      className={cn('relative rounded-xl p-4 ring-1', complete ? 'bg-success-soft ring-success/30' : 'bg-card ring-foreground/10', className)}
    >
      <div className="flex items-center justify-between gap-3">
        <h2 id="completeness-heading" className={cn('text-sm font-semibold', complete && 'text-success-soft-foreground')}>
          {complete ? 'Your profile is complete' : `Profile ${pct}% complete`}
        </h2>
        {complete ? (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={dismiss}
            aria-label="Close the completeness card for good"
            className="-mr-1 text-success-soft-foreground hover:bg-success/15 hover:text-success-soft-foreground"
          >
            <X aria-hidden="true" />
          </Button>
        ) : (
          next && (
            <Link href={next.href} className="text-sm font-medium text-primary underline-offset-4 hover:underline">
              Next: {next.label}
            </Link>
          )
        )}
      </div>
      <Progress value={pct} className="mt-2" aria-label={`Profile ${pct}% complete`} />
      {complete ? (
        <p className="mt-2 text-xs text-success-soft-foreground/90">
          Brothers can find you by company and field and reach you directly. Close this card whenever you like.
        </p>
      ) : (
        <ul className="mt-3 grid gap-x-4 gap-y-1 text-sm sm:grid-cols-2">
          {items.map((item) => (
            <li key={item.id} className="flex items-start gap-2">
              {item.done ? (
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" aria-hidden="true" />
              ) : (
                <Circle className="mt-0.5 size-4 shrink-0 text-muted-foreground/60" aria-hidden="true" />
              )}
              <span className={item.done ? 'text-muted-foreground' : ''}>
                {item.done ? (
                  item.label
                ) : (
                  <Link href={item.href} className="underline-offset-4 hover:underline">
                    {item.label}
                  </Link>
                )}
                {!item.done && <span className="block text-xs text-muted-foreground">{item.why}</span>}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
