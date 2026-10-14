'use client'

import { useActionState, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { changePassword } from '@/actions/auth'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { FormAlert, PasswordField } from '@/components/ui/form-field'
import { PASSWORD_REQUIREMENTS_HINT } from '@/lib/constants'

type State = { message?: string; success?: boolean } | undefined

export function AccountSettingsCard({ email }: { email: string | null }) {
  const [open, setOpen] = useState(false)
  const [state, action, isPending] = useActionState<State, FormData>(changePassword, undefined)

  useEffect(() => {
    if (state?.success) {
      toast.success('Password changed.')
      setOpen(false)
    }
  }, [state])

  return (
    <Card id="account">
      <CardHeader>
        <CardTitle as="h2" className="heading-4">
          Account
        </CardTitle>
        <CardDescription>Your sign-in details.</CardDescription>
      </CardHeader>
      <CardContent className="max-w-lg space-y-4">
        <div>
          <p className="text-sm font-medium">Sign-in email</p>
          <p className="mt-0.5 text-sm text-muted-foreground">{email ?? '—'}</p>
        </div>
        {open ? (
          <form key={String(state?.success)} action={action} className="space-y-4 rounded-lg bg-muted/40 p-4 ring-1 ring-foreground/10">
            <FormAlert message={state?.success ? undefined : state?.message} />
            <PasswordField id="password" name="password" label="New password" autoComplete="new-password" hint={PASSWORD_REQUIREMENTS_HINT} required />
            <PasswordField id="confirmPassword" name="confirmPassword" label="Confirm new password" autoComplete="new-password" required />
            <div className="flex gap-2">
              <Button type="submit" disabled={isPending}>
                {isPending ? 'Changing…' : 'Change password'}
              </Button>
              <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={isPending}>
                Cancel
              </Button>
            </div>
          </form>
        ) : (
          <Button type="button" variant="outline" onClick={() => setOpen(true)}>
            Change password
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
