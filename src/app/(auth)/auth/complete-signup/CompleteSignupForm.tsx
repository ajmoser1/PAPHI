'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { completeSignup } from '@/actions/auth'
import {
  BrokenInviteNotice,
  MembershipFields,
  describeInvite,
  type ChapterOption,
  type Inviter,
} from '@/components/auth/MembershipFields'
import { SIGNUP_FIELD_LABELS } from '@/lib/constants'
import { Button } from '@/components/ui/button'
import { FormAlert, FormField } from '@/components/ui/form-field'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export type SignupPrefill = {
  firstName: string
  lastName: string
  phone: string
  graduationYear: string
  role: string
  chapterId: string
}

export function CompleteSignupForm({
  email,
  provider,
  prefill,
  chapters,
  inviteToken,
  inviteBroken,
  inviteChapter,
  inviter,
}: {
  email: string
  provider: string
  prefill: SignupPrefill
  chapters: ChapterOption[]
  inviteToken: string
  inviteBroken: boolean
  inviteChapter: ChapterOption | null
  inviter: Inviter | null
}) {
  const [state, action, isPending] = useActionState(completeSignup, undefined)
  // After a failed submit React resets the form, so prefer what the user just typed.
  const values = { ...prefill, ...(state?.values ?? {}) }
  const canSubmit = Boolean(inviteToken) || chapters.length > 0
  const hasPrefill = Boolean(prefill.phone || prefill.graduationYear || prefill.role)

  return (
    <Card>
      <CardHeader>
        <CardTitle as="h1" className="text-xl">Tell us about yourself</CardTitle>
        <CardDescription>
          {describeInvite(
            inviteChapter,
            inviter,
            hasPrefill
              ? 'Check the details you entered earlier, then continue.'
              : 'A few details so your chapter admin can recognize and approve you.'
          )}
        </CardDescription>
      </CardHeader>
      <form action={action} aria-busy={isPending}>
        <CardContent className="space-y-4">
          {inviteBroken && <BrokenInviteNotice />}
          <FormAlert
            message={state?.message}
            errors={state?.errors}
            fieldLabels={SIGNUP_FIELD_LABELS}
            action={
              state?.code === 'link_expired' ? (
                <Link href="/auth/login" className="text-sm font-medium underline underline-offset-4">
                  Sign in again
                </Link>
              ) : undefined
            }
          />

          <FormField
            id="email"
            label="Email"
            value={email}
            readOnly
            autoComplete="email"
            className="bg-muted/40 text-muted-foreground"
            hint={provider === 'google' ? 'Signed in with Google' : 'Confirmed by email'}
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
            {isPending ? 'Saving…' : 'Continue'}
          </Button>
        </CardContent>
      </form>
    </Card>
  )
}
