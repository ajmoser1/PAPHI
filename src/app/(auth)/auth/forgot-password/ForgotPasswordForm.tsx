'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { requestPasswordReset } from '@/actions/auth'
import { Button } from '@/components/ui/button'
import { FormAlert, FormField } from '@/components/ui/form-field'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'

export function ForgotPasswordForm() {
  const [state, action, isPending] = useActionState(requestPasswordReset, undefined)

  return (
    <Card>
      <CardHeader>
        <CardTitle as="h1" className="text-xl">Reset your password</CardTitle>
        <CardDescription>
          Enter your email and we&apos;ll send you a link to choose a new password.
        </CardDescription>
      </CardHeader>
      <form action={action} aria-busy={isPending}>
        <CardContent className="space-y-4">
          <FormAlert
            success={state?.success}
            message={state?.message}
            errors={state?.errors}
            fieldLabels={{ email: 'Email' }}
          />
          {!state?.success && (
            <FormField
              id="email"
              name="email"
              type="email"
              label="Email"
              autoComplete="email"
              inputMode="email"
              placeholder="you@example.com"
              defaultValue={state?.values?.email}
              error={state?.errors?.email?.[0]}
              required
            />
          )}
        </CardContent>
        <CardFooter className="flex flex-col gap-3">
          {!state?.success && (
            <Button type="submit" size="lg" className="h-11 w-full text-base md:h-10 md:text-sm" disabled={isPending}>
              {isPending ? 'Sending…' : 'Send reset link'}
            </Button>
          )}
          <p className="text-center text-sm text-muted-foreground">
            Remember your password?{' '}
            <Link href="/auth/login" className="underline underline-offset-4 hover:text-primary">
              Sign in
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  )
}
