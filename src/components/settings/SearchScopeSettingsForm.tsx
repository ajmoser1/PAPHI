'use client'

import { useTransition } from 'react'
import { toast } from 'sonner'
import { setSearchScope } from '@/actions/chapter-admin'
import { SEARCH_SCOPE } from '@/lib/constants'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { SelectField } from '@/components/ui/form-field'

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
    <Card id="search">
      <CardHeader>
        <CardTitle as="h2" className="heading-4">
          Search default
        </CardTitle>
        <CardDescription>Where Find a Brother looks when you open it. The My chapter / All chapters switch on that page changes this too.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="max-w-lg space-y-4">
          <SelectField id="searchScope" name="searchScope" label="Search by default" defaultValue={scope}>
            <option value={SEARCH_SCOPE.FRATERNITY}>All chapters in my fraternity</option>
            <option value={SEARCH_SCOPE.CHAPTER}>My chapter only</option>
          </SelectField>
          <Button type="submit" disabled={isPending}>
            {isPending ? 'Saving…' : 'Save search default'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
