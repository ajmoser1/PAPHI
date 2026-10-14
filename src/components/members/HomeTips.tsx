'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { MessageSquareText, Search, UserRoundCheck, X } from 'lucide-react'
import { dismissHomeTips } from '@/actions/profile'
import { Button } from '@/components/ui/button'

const TILE =
  'group flex items-start gap-3 rounded-xl bg-card p-4 text-left ring-1 ring-foreground/10 outline-none transition duration-fast hover:-translate-y-px hover:shadow-md hover:ring-primary/30 focus-visible:ring-2 focus-visible:ring-ring'
const ICON = 'flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary'

/** "What you can do here" tiles for new members. Dismissal is stored on the profile. */
export function HomeTips({ canMessage }: { canMessage: boolean }) {
  const [hidden, setHidden] = useState(false)
  const [, startTransition] = useTransition()
  if (hidden) return null

  function dismiss() {
    setHidden(true)
    startTransition(() => dismissHomeTips())
  }

  function focusSearch() {
    const el = document.getElementById('members-search') as HTMLInputElement | null
    el?.focus()
    el?.scrollIntoView({ block: 'center' })
  }

  return (
    <section aria-labelledby="home-tips-heading" className="relative">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 id="home-tips-heading" className="eyebrow">
          What you can do here
        </h2>
        <Button type="button" variant="ghost" size="icon-sm" onClick={dismiss} aria-label="Hide these tips">
          <X aria-hidden="true" />
        </Button>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <button type="button" onClick={focusSearch} className={TILE}>
          <span className={ICON}>
            <Search className="size-5" aria-hidden="true" />
          </span>
          <span className="min-w-0">
            <span className="block font-semibold">Find a brother</span>
            <span className="block text-sm text-muted-foreground">
              Search by company, career field, or name to find someone where you want to be.
            </span>
          </span>
        </button>
        <Link href={canMessage ? '/messages' : '/profile/edit'} className={TILE}>
          <span className={ICON}>
            <MessageSquareText className="size-5" aria-hidden="true" />
          </span>
          <span className="min-w-0">
            <span className="block font-semibold">Ask for a referral or intro</span>
            <span className="block text-sm text-muted-foreground">
              Message anyone in the directory. Brothers expect it. That is what this is for.
            </span>
          </span>
        </Link>
        <Link href="/profile/edit" className={TILE}>
          <span className={ICON}>
            <UserRoundCheck className="size-5" aria-hidden="true" />
          </span>
          <span className="min-w-0">
            <span className="block font-semibold">Be findable</span>
            <span className="block text-sm text-muted-foreground">
              Add your current job and field so brothers searching your industry reach you.
            </span>
          </span>
        </Link>
      </div>
    </section>
  )
}
