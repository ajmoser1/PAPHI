'use client'

import { useTransition } from 'react'
import { toast } from 'sonner'
import { setSearchScope } from '@/actions/chapter-admin'
import { SEARCH_SCOPE } from '@/lib/constants'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export function SearchScopeSettingsForm({ currentScope }: { currentScope: string }) {
  const [isPending, startTransition] = useTransition()
  const scope = currentScope === SEARCH_SCOPE.CHAPTER ? SEARCH_SCOPE.CHAPTER : SEARCH_SCOPE.FRATERNITY

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const next = formData.get('searchScope') === SEARCH_SCOPE.CHAPTER
      ? SEARCH_SCOPE.CHAPTER
      : SEARCH_SCOPE.FRATERNITY
    startTransition(async () => {
      try {
        await setSearchScope(next)
        toast.success('Search preference saved.')
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Could not save search preference.')
      }
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Search preference</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4 max-w-lg">
          <p className="text-sm text-muted-foreground">
            Default scope for Find a Brother. You can still switch quickly with the toggle under
            the search bar.
          </p>
          <div className="space-y-2">
            <Label htmlFor="searchScope">Who do you want to search by default?</Label>
            <select
              id="searchScope"
              name="searchScope"
              defaultValue={scope}
              className="w-full h-9 rounded-md border border-border bg-background px-3 text-sm"
            >
              <option value={SEARCH_SCOPE.FRATERNITY}>All chapters in my fraternity</option>
              <option value={SEARCH_SCOPE.CHAPTER}>My chapter only</option>
            </select>
          </div>
          <Button type="submit" disabled={isPending}>
            {isPending ? 'Saving…' : 'Save search preference'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
