'use client'

import { useActionState, useEffect, useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Mail } from 'lucide-react'
import { changePassword } from '@/actions/auth'
import { setSearchScope } from '@/actions/chapter-admin'
import { Button } from '@/components/ui/button'
import { FormAlert, PasswordField } from '@/components/ui/form-field'
import { PASSWORD_REQUIREMENTS_HINT, SEARCH_SCOPE } from '@/lib/constants'
import { Section, SectionRow } from '@/components/layout/Section'
import { SaveStatusText } from './SaveStatusText'
import { useAutosave } from './useAutosave'

type PwState = { message?: string; success?: boolean } | undefined

const selectClass =
  'h-10 w-full rounded-lg border border-input bg-card px-3 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50'

export function AccountSettings({
  email,
  searchScope,
  feedbackEmail,
  feedbackMailto,
}: {
  email: string | null
  searchScope: string
  feedbackEmail: string | null
  feedbackMailto: string | null
}) {
  const scopeSave = useAutosave()
  const [scope, setScope] = useState(searchScope === SEARCH_SCOPE.CHAPTER ? SEARCH_SCOPE.CHAPTER : SEARCH_SCOPE.FRATERNITY)
  const [pwOpen, setPwOpen] = useState(false)
  const [pwState, pwAction, pwPending] = useActionState<PwState, FormData>(changePassword, undefined)
  const [, startTransition] = useTransition()

  useEffect(() => {
    if (pwState?.success) {
      toast.success('Password changed.')
      setPwOpen(false)
    }
  }, [pwState])

  return (
    <Section flush id="account" title="Account" aside={<SaveStatusText status={scopeSave.status} error={scopeSave.error} />}>
      <SectionRow label="Sign-in email">
        <p className="text-sm text-muted-foreground sm:text-right">{email ?? '—'}</p>
      </SectionRow>
      <SectionRow label="Search by default" htmlFor="searchScope" hint="Where Find a Brother looks when you open it. The switch on that page changes this too.">
        <select
          id="searchScope"
          value={scope}
          onChange={(e) => {
            const next = e.target.value === SEARCH_SCOPE.CHAPTER ? SEARCH_SCOPE.CHAPTER : SEARCH_SCOPE.FRATERNITY
            setScope(next)
            scopeSave.run(() => setSearchScope(next))
          }}
          className={selectClass}
        >
          <option value={SEARCH_SCOPE.FRATERNITY}>All chapters in my fraternity</option>
          <option value={SEARCH_SCOPE.CHAPTER}>My chapter only</option>
        </select>
      </SectionRow>
      <SectionRow label="Password" hint={pwOpen ? PASSWORD_REQUIREMENTS_HINT : undefined}>
        {pwOpen ? (
          <form
            key={String(pwState?.success)}
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault()
              const fd = new FormData(e.currentTarget)
              startTransition(() => pwAction(fd))
            }}
          >
            <FormAlert message={pwState?.success ? undefined : pwState?.message} />
            <PasswordField id="password" name="password" label="New password" autoComplete="new-password" required />
            <PasswordField id="confirmPassword" name="confirmPassword" label="Confirm" autoComplete="new-password" required />
            <div className="flex gap-2">
              <Button type="submit" size="sm" disabled={pwPending}>
                {pwPending ? 'Changing…' : 'Change password'}
              </Button>
              <Button type="button" size="sm" variant="ghost" onClick={() => setPwOpen(false)} disabled={pwPending}>
                Cancel
              </Button>
            </div>
          </form>
        ) : (
          <div className="sm:text-right">
            <Button type="button" size="sm" variant="outline" onClick={() => setPwOpen(true)}>
              Change password
            </Button>
          </div>
        )}
      </SectionRow>
      {feedbackEmail && feedbackMailto && (
        <SectionRow label="Questions or feedback" hint="Bugs, ideas, or help. Every message is read.">
          <a href={feedbackMailto} className="inline-flex min-h-9 items-center gap-1.5 text-sm font-medium text-primary underline-offset-4 hover:underline sm:float-right">
            <Mail className="size-4" aria-hidden="true" />
            {feedbackEmail}
          </a>
        </SectionRow>
      )}
    </Section>
  )
}
