'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { submitChapterRequest } from '@/actions/founder'
import { PASSWORD_REQUIREMENTS_HINT } from '@/lib/constants'
import { Button, buttonVariants } from '@/components/ui/button'
import { FormAlert, FormField, PasswordField } from '@/components/ui/form-field'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

type FormState =
  | { message?: string; success?: boolean; needsEmailConfirmation?: boolean }
  | undefined

async function submitRequest(_prev: FormState, formData: FormData): Promise<FormState> {
  return submitChapterRequest(formData)
}

export function StartChapterForm() {
  const [state, action, isPending] = useActionState(submitRequest, undefined)

  if (state?.success) {
    return (
      <Card>
        <CardHeader>
          <CardTitle as="h1" className="text-xl">Request submitted</CardTitle>
          <CardDescription>
            {state.needsEmailConfirmation
              ? 'Check your email to confirm your account. Once we approve your chapter, sign in with the password you just created.'
              : "We'll review your chapter request shortly. Once approved, sign in with the email and password you just created."}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <Link href="/auth/login" className={cn(buttonVariants({ size: 'lg' }), 'h-11 w-full text-base md:h-10 md:text-sm')}>
            Go to sign in
          </Link>
          <Link href="/" className="text-center text-sm text-muted-foreground underline underline-offset-4">
            Back to home
          </Link>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <Link
          href="/auth/register"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground underline-offset-4 hover:underline"
        >
          <ArrowLeft className="size-3.5" aria-hidden="true" />
          Back to registration
        </Link>
        <CardTitle as="h1" className="text-xl">Start a chapter</CardTitle>
        <CardDescription>
          Bring your chapter onto the platform and become its first admin. Free for all SAE chapters.
        </CardDescription>
      </CardHeader>
      <form action={action} aria-busy={isPending}>
        <CardContent className="space-y-4">
          <FormAlert message={state?.message} />
          <FormField id="chapterName" name="chapterName" label="Chapter name" placeholder="e.g. PA PHI" autoComplete="organization" required />
          <FormField
            id="schoolName"
            name="schoolName"
            label="School"
            placeholder="e.g. Carnegie Mellon University"
            required
          />
          <FormField id="contactName" name="contactName" label="Your name" autoComplete="name" required />
          <FormField
            id="contactEmail"
            name="contactEmail"
            type="email"
            label="Your email"
            autoComplete="email"
            inputMode="email"
            hint="This becomes your sign-in email and the chapter's contact address."
            required
          />
          <PasswordField
            id="password"
            name="password"
            label="Password"
            autoComplete="new-password"
            minLength={8}
            hint={PASSWORD_REQUIREMENTS_HINT}
            required
          />
          <p className="text-xs leading-relaxed text-muted-foreground">
            By continuing you agree to our{' '}
            <Link href="/terms" className="underline underline-offset-4 hover:text-primary">
              Terms of Service
            </Link>{' '}
            and{' '}
            <Link href="/privacy" className="underline underline-offset-4 hover:text-primary">
              Privacy Policy
            </Link>
            .
          </p>
          <Button type="submit" size="lg" className="h-11 w-full text-base md:h-10 md:text-sm" disabled={isPending}>
            {isPending ? 'Submitting…' : 'Create account & submit request'}
          </Button>
        </CardContent>
      </form>
    </Card>
  )
}
