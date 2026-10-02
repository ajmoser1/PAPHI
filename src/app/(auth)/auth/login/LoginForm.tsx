'use client'

import { useActionState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { login, resendConfirmation } from '@/actions/auth'
import { AuthDivider, GoogleSignInButton } from '@/components/auth/GoogleSignInButton'
import { Button, buttonVariants } from '@/components/ui/button'
import { FormAlert, FormField, PasswordField } from '@/components/ui/form-field'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

const CALLBACK_ERROR_MESSAGES: Record<string, string> = {
  auth_callback_failed: 'Google sign-in did not finish. Try again, or sign in with your email below.',
}

const FIELD_LABELS = { email: 'Email', password: 'Password' }

function ResendConfirmation({ email }: { email: string }) {
  const [state, action, isPending] = useActionState(resendConfirmation, undefined)

  if (state?.success) {
    return (
      <p role="status" className="text-sm font-medium text-primary">
        {state.message}
      </p>
    )
  }

  return (
    <form action={action} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="email" value={email} />
      <Button type="submit" size="sm" variant="outline" className="h-9 bg-background" disabled={isPending}>
        {isPending ? 'Sending…' : 'Resend confirmation email'}
      </Button>
      {state?.errors?.email && <span className="text-xs">{state.errors.email[0]}</span>}
    </form>
  )
}

export function LoginForm() {
  const [state, action, isPending] = useActionState(login, undefined)
  const searchParams = useSearchParams()
  const callbackError = searchParams.get('error')
  const callbackMessage =
    callbackError && CALLBACK_ERROR_MESSAGES[callbackError]
      ? CALLBACK_ERROR_MESSAGES[callbackError]
      : callbackError
        ? 'Sign-in did not finish. Please try again.'
        : undefined
  const email = state?.values?.email ?? ''

  return (
    <Card>
      <CardHeader>
        <CardTitle as="h1" className="text-xl">Welcome back</CardTitle>
        <CardDescription>Sign in to your account</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <GoogleSignInButton />
        <AuthDivider />
        <form action={action} className="space-y-4" aria-busy={isPending}>
          <FormAlert
            message={state?.message ?? (state ? undefined : callbackMessage)}
            errors={state?.errors}
            fieldLabels={FIELD_LABELS}
            action={
              state?.code === 'email_unconfirmed' && email ? <ResendConfirmation email={email} /> : undefined
            }
          />
          <FormField
            id="email"
            name="email"
            type="email"
            label="Email"
            autoComplete="email"
            inputMode="email"
            placeholder="you@example.com"
            defaultValue={email}
            error={state?.errors?.email?.[0]}
            required
          />
          <PasswordField
            id="password"
            name="password"
            label="Password"
            autoComplete="current-password"
            error={state?.errors?.password?.[0]}
            required
            labelEnd={
              <Link
                href="/auth/forgot-password"
                className="text-xs text-muted-foreground underline underline-offset-4 hover:text-primary"
              >
                Forgot password?
              </Link>
            }
          />
          <Button type="submit" size="lg" className="h-11 w-full text-base md:h-10 md:text-sm" disabled={isPending}>
            {isPending ? 'Signing in…' : 'Sign in'}
          </Button>
        </form>
      </CardContent>
      <CardFooter className="flex-col gap-2 text-center">
        <p className="text-sm text-muted-foreground">New here?</p>
        <Link
          href="/auth/register"
          className={cn(
            buttonVariants({ variant: 'outline', size: 'lg' }),
            'h-11 w-full text-base md:h-10 md:text-sm'
          )}
        >
          Create an account
        </Link>
      </CardFooter>
    </Card>
  )
}
