'use client'

import { useTransition } from 'react'
import { setSearchScope } from '@/actions/chapter-admin'
import { SEARCH_SCOPE } from '@/lib/constants'
import { cn } from '@/lib/utils'

interface SearchScopeToggleProps {
  currentScope: string
}

export function SearchScopeToggle({ currentScope }: SearchScopeToggleProps) {
  const [isPending, startTransition] = useTransition()
  const isFraternity = currentScope === SEARCH_SCOPE.FRATERNITY

  function handleToggle() {
    const next = isFraternity ? SEARCH_SCOPE.CHAPTER : SEARCH_SCOPE.FRATERNITY
    startTransition(() => setSearchScope(next))
  }

  return (
    <button
      type="button"
      onClick={handleToggle}
      disabled={isPending}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
        'border-border bg-background hover:bg-muted/50',
        isPending && 'opacity-60'
      )}
    >
      <span className={cn(isFraternity ? 'text-foreground font-semibold' : 'text-muted-foreground')}>
        All chapters
      </span>
      <span className="text-muted-foreground">·</span>
      <span className={cn(!isFraternity ? 'text-foreground font-semibold' : 'text-muted-foreground')}>
        My chapter
      </span>
    </button>
  )
}
