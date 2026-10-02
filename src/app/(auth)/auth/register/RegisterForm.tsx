'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { register } from '@/actions/auth'
import { AuthDivider, GoogleSignInButton } from '@/components/auth/GoogleSignInButton'
import {
  BrokenInviteNotice,
  MembershipFields,
  describeInvite,
  type ChapterOption,
  type Inviter,
} from '@/components/auth/MembershipFields'
import { PASSWORD_REQUIREMENTS_HINT, SIGNUP_FIELD_LABELS } from '@/lib/constants'
import { Button, buttonVariants } from '@/components/ui/button'
import { FormAlert, FormField, PasswordField } from '@/components/ui/form-field'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

export function RegisterForm({
  chapters,
  inviteToken,
  inviteBroken,
  inviteChapter,
  inviter,
  fromProfileId,
}: {
  chapters: ChapterOption[]
  inviteToken: string
  inviteBroken: boolean
  inviteChapter: ChapterOption | null
  inviter: Inviter | null
  fromProfileId: string
}) {
  const [state, action, isPending] = useActionState(register, undefined)
  const values = state?.values ?? {}
  const canSubmit = Boolean(inviteToken) || chapters.length > 0

  if (state?.success) {
    return (
      <Card>
        <CardHeader>
          <CardTitle as="h1" className="text-xl">Check your email</CardTitle>
          <CardDescription>One more step and your account is ready.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <FormAlert success message={state.message} />
          <p className="text-sm text-muted-foreground">
            Didn&apos;t get it? Check your spam folder, or sign in and we&apos;ll offer to send it again.
          </p>
          <Link href="/auth/login" className={cn(buttonVariants({ size: 'lg' }), 'h-11 w-full text-base md:h-10 md:text-sm')}>
            Go to sign in
          </Link>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle as="h1" className="text-xl">Create an account</CardTitle>
        <CardDescription>
          {describeInvite(inviteChapter, inviter, 'Join your chapter network to find brothers for referrals, mentorship, and opportunities.')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {inviteBroken && <BrokenInviteNotice />}
        <GoogleSignInButton invite={inviteToken || undefined} from={fromProfileId || undefined} />
        <AuthDivider label="or register with email" />

        <form action={action} className="space-y-4" aria-busy={isPending} noValidate={false}>
          <FormAlert
            message={state?.message}
            errors={state?.errors}
            fieldLabels={SIGNUP_FIELD_LABELS}
            action={
              state?.code === 'already_registered' ? (
                <Link href="/auth/login" className="text-sm font-medium underline underline-offset-4">
                  Sign in instead
                </Link>
              ) : undefined
            }
          />

          <div className="grid grid-cols-2 gap-3">
            <FormField
              id="firstName"
              name="firstName"
              label="First name"
              autoComplete="given-name"
              defaultValue={values.firstName}
              error={state?.errors?.firstName?.[0]}
              required
            />
            <FormField
              id="lastName"
              name="lastName"
              label="Last name"
              autoComplete="family-name"
              defaultValue={values.lastName}
              error={state?.errors?.lastName?.[0]}
              required
            />
          </div>

          <FormField
            id="email"
            name="email"
            type="email"
            label="Email"
            autoComplete="email"
            inputMode="email"
            placeholder="you@example.com"
            defaultValue={values.email}
            error={state?.errors?.email?.[0]}
            required
          />

          <FormField
            id="phone"
            name="phone"
            type="tel"
            label="Phone"
            autoComplete="tel"
            placeholder="412 555 0100"
            defaultValue={values.phone}
            hint="Only your chapter admin sees this. They use it to confirm it's really you."
            error={state?.errors?.phone?.[0]}
            required
          />

          <FormField
            id="graduationYear"
            name="graduationYear"
            type="number"
            label="Graduation year (or expected)"
            inputMode="numeric"
            min={1950}
            max={2100}
            placeholder="2026"
            defaultValue={values.graduationYear}
            error={state?.errors?.graduationYear?.[0]}
            required
          />

          <PasswordField
            id="password"
            name="password"
            label="Password"
            autoComplete="new-password"
            minLength={8}
            hint={PASSWORD_REQUIREMENTS_HINT}
            error={state?.errors?.password?.[0]}
            required
          />

          <MembershipFields
            chapters={chapters}
            inviteToken={inviteToken}
            errors={state?.errors}
            defaults={{ chapterId: values.chapterId, role: values.role }}
          />

          <p className="text-xs leading-relaxed text-muted-foreground">
            Next you&apos;ll add a photo and your work details. Messaging and full member profiles
            unlock once a chapter admin approves you.
          </p>

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
          <Button
            type="submit"
            size="lg"
            className="h-11 w-full text-base md:h-10 md:text-sm"
            disabled={isPending || !canSubmit}
          >
            {isPending ? 'Creating account…' : 'Create account'}
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          Already have an account?{' '}
          <Link href="/auth/login" className="underline underline-offset-4 hover:text-primary">
            Sign in
          </Link>
        </p>
      </CardContent>
    </Card>
  )
}
