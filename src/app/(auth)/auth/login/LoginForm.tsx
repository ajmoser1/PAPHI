'use client'

import { useActionState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { login } from '@/actions/auth'
import { AuthDivider, GoogleSignInButton } from '@/components/auth/GoogleSignInButton'
import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

const CALLBACK_ERROR_MESSAGES: Record<string, string> = {
  auth_callback_failed: 'Google sign-in failed. Please try again.',
}

export function LoginForm() {
  const [state, action, isPending] = useActionState(login, undefined)
  const searchParams = useSearchParams()
  const callbackError = searchParams.get('error')
  const callbackMessage =
    callbackError && CALLBACK_ERROR_MESSAGES[callbackError]
      ? CALLBACK_ERROR_MESSAGES[callbackError]
      : callbackError
        ? 'Sign-in failed. Please try again.'
        : null

  return (
    <Card>
      <CardHeader>
        <CardTitle>Welcome back</CardTitle>
        <CardDescription>Sign in to your account</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {(state?.message || callbackMessage) && (
          <p className="text-sm text-destructive">{state?.message ?? callbackMessage}</p>
        )}
        <GoogleSignInButton />
        <AuthDivider />
        <form action={action} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" placeholder="you@example.com" required />
            {state?.errors?.email && (
              <p className="text-xs text-destructive">{state.errors.email[0]}</p>
            )}
          </div>
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
              <Link
                href="/auth/forgot-password"
                className="text-xs text-muted-foreground underline underline-offset-4 hover:text-primary"
              >
                Forgot password?
              </Link>
            </div>
            <Input id="password" name="password" type="password" required />
            {state?.errors?.password && (
              <p className="text-xs text-destructive">{state.errors.password[0]}</p>
            )}
          </div>
          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? 'Signing in…' : 'Sign in'}
          </Button>
        </form>
      </CardContent>
      <CardFooter className="flex flex-col gap-3">
        <Link
          href="/auth/register"
          className={cn(
            buttonVariants({ size: 'default' }),
            'w-full border-transparent bg-[var(--gold)] text-primary hover:bg-[var(--gold)]/90'
          )}
        >
          Create an account
        </Link>
      </CardFooter>
    </Card>
  )
}
