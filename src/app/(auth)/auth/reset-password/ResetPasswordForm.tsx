'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { resetPassword } from '@/actions/auth'
import { PASSWORD_REQUIREMENTS_HINT } from '@/lib/constants'
import { Button } from '@/components/ui/button'
import { FormAlert, PasswordField } from '@/components/ui/form-field'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'

export function ResetPasswordForm() {
  const [state, action, isPending] = useActionState(resetPassword, undefined)

  return (
    <Card>
      <CardHeader>
        <CardTitle as="h1" className="text-xl">Choose a new password</CardTitle>
        <CardDescription>Enter and confirm your new password below.</CardDescription>
      </CardHeader>
      <form action={action} aria-busy={isPending}>
        <CardContent className="space-y-4">
          <FormAlert
            message={state?.message}
            errors={state?.errors}
            fieldLabels={{ password: 'New password', confirmPassword: 'Confirm password' }}
            action={
              state?.code === 'link_expired' ? (
                <Link href="/auth/forgot-password" className="text-sm font-medium underline underline-offset-4">
                  Request a new reset link
                </Link>
              ) : undefined
            }
          />
          <PasswordField
            id="password"
            name="password"
            label="New password"
            autoComplete="new-password"
            minLength={8}
            hint={PASSWORD_REQUIREMENTS_HINT}
            error={state?.errors?.password?.[0]}
            required
          />
          <PasswordField
            id="confirmPassword"
            name="confirmPassword"
            label="Confirm password"
            autoComplete="new-password"
            minLength={8}
            error={state?.errors?.confirmPassword?.[0]}
            required
          />
        </CardContent>
        <CardFooter className="flex flex-col gap-3">
          <Button type="submit" size="lg" className="h-11 w-full text-base md:h-10 md:text-sm" disabled={isPending}>
            {isPending ? 'Updating…' : 'Update password'}
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            <Link href="/auth/login" className="underline underline-offset-4 hover:text-primary">
              Back to sign in
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  )
}
