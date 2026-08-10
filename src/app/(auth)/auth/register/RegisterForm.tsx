'use client'

import { useActionState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { register } from '@/actions/auth'
import { AuthDivider, GoogleSignInButton } from '@/components/auth/GoogleSignInButton'
import { PASSWORD_REQUIREMENTS_HINT } from '@/lib/constants'
import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

type ChapterOption = { id: string; name: string; school_name: string | null }
type Inviter = { first_name: string; last_name: string }

function inviteDescription(
  inviteToken: string,
  inviteChapter: ChapterOption | null,
  inviter: Inviter | null
): string {
  if (inviteToken && inviteChapter && inviter) {
    const name = `${inviter.first_name} ${inviter.last_name}`
    return inviteChapter.school_name
      ? `${name} invited you to ${inviteChapter.name} at ${inviteChapter.school_name}.`
      : `${name} invited you to ${inviteChapter.name}.`
  }
  if (inviteToken && inviteChapter) {
    return `You've been invited to join ${inviteChapter.name}${
      inviteChapter.school_name ? ` — ${inviteChapter.school_name}` : ''
    }.`
  }
  if (inviteToken) {
    return "You've been invited to join your chapter network."
  }
  return 'Join your chapter network. Select your chapter and submit for admin approval.'
}

export function RegisterForm({
  chapters = [],
  hasActiveChapters = true,
  inviteChapter = null,
  inviter = null,
}: {
  chapters?: ChapterOption[]
  hasActiveChapters?: boolean
  inviteChapter?: ChapterOption | null
  inviter?: Inviter | null
}) {
  const [state, action, isPending] = useActionState(register, undefined)
  const searchParams = useSearchParams()
  const inviteToken = searchParams.get('invite') ?? ''
  const fromProfileId = searchParams.get('from') ?? ''
  const canSelectChapter = !inviteToken && chapters.length > 0

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create an account</CardTitle>
        <CardDescription>
          {inviteDescription(inviteToken, inviteChapter, inviter)}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {state?.message && (
          <p className="text-sm text-destructive">{state.message}</p>
        )}
        <GoogleSignInButton
          invite={inviteToken || undefined}
          from={fromProfileId || undefined}
        />
        <AuthDivider label="or register with email" />
        <form action={action} className="space-y-4">
          {inviteToken && <input type="hidden" name="inviteToken" value={inviteToken} />}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="firstName">First name</Label>
              <Input id="firstName" name="firstName" placeholder="John" required />
              {state?.errors?.firstName && (
                <p className="text-xs text-destructive">{state.errors.firstName[0]}</p>
              )}
            </div>
            <div className="space-y-1">
              <Label htmlFor="lastName">Last name</Label>
              <Input id="lastName" name="lastName" placeholder="Smith" required />
              {state?.errors?.lastName && (
                <p className="text-xs text-destructive">{state.errors.lastName[0]}</p>
              )}
            </div>
          </div>
          <div className="space-y-1">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" placeholder="you@example.com" required />
            {state?.errors?.email && (
              <p className="text-xs text-destructive">{state.errors.email[0]}</p>
            )}
          </div>
          <div className="space-y-1">
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              name="phone"
              type="tel"
              placeholder="+1 555 000 0000"
              required
            />
            <p className="text-xs text-muted-foreground">
              Chapter admins use this to verify your identity while your account is pending.
            </p>
            {state?.errors?.phone && (
              <p className="text-xs text-destructive">{state.errors.phone[0]}</p>
            )}
          </div>
          <div className="space-y-1">
            <Label htmlFor="graduationYear">Graduation year</Label>
            <Input
              id="graduationYear"
              name="graduationYear"
              type="number"
              min={1950}
              max={2100}
              placeholder="2026"
              required
            />
            {state?.errors?.graduationYear && (
              <p className="text-xs text-destructive">{state.errors.graduationYear[0]}</p>
            )}
          </div>
          <div className="space-y-1">
            <Label htmlFor="password">Password</Label>
            <Input id="password" name="password" type="password" required minLength={8} />
            <p className="text-xs text-muted-foreground">{PASSWORD_REQUIREMENTS_HINT}</p>
            {state?.errors?.password && (
              <p className="text-xs text-destructive">{state.errors.password[0]}</p>
            )}
          </div>
          {canSelectChapter && (
            <div className="space-y-2">
              <div className="space-y-1">
                <Label htmlFor="chapterId">Chapter</Label>
                <select
                  id="chapterId"
                  name="chapterId"
                  required
                  className="w-full h-9 rounded-md border border-border bg-background px-3 text-sm"
                >
                  <option value="">Select your chapter</option>
                  {chapters.map((ch) => (
                    <option key={ch.id} value={ch.id}>
                      {ch.name} — {ch.school_name}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-muted-foreground">
                  Approval is required before you can view member details or send messages.
                </p>
              </div>
              <Link
                href="/start-chapter"
                className={cn(buttonVariants({ variant: 'outline' }), 'w-full')}
              >
                Don&apos;t see your chapter? Request to start it
              </Link>
            </div>
          )}
          {!inviteToken && !canSelectChapter && (
            <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 space-y-2">
              {hasActiveChapters ? (
                <p>Please pick a chapter to continue.</p>
              ) : (
                <>
                  <p>No active chapters are available yet. Request your chapter to get started, or ask your chapter admin for an invite link.</p>
                  <Link
                    href="/start-chapter"
                    className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'bg-white')}
                  >
                    Don&apos;t see your chapter? Request to start it
                  </Link>
                </>
              )}
            </div>
          )}
          <div className="space-y-2">
            <Label>I am a...</Label>
            <div className="grid grid-cols-2 gap-3">
              {[
                { value: 'undergrad', label: 'Current Undergrad' },
                { value: 'alumni', label: 'Alumni' },
              ].map(({ value, label }) => (
                <label
                  key={value}
                  className="flex items-center gap-2 border rounded-lg p-3 cursor-pointer hover:bg-muted has-[:checked]:border-primary has-[:checked]:bg-primary/5"
                >
                  <input type="radio" name="role" value={value} className="accent-primary" required />
                  <span className="text-sm font-medium">{label}</span>
                </label>
              ))}
            </div>
            {state?.errors?.role && (
              <p className="text-xs text-destructive">{state.errors.role[0]}</p>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            After registering, you&apos;ll complete a short profile. Messaging and full member
            profiles unlock once a chapter admin approves your account.
          </p>
          <Button
            type="submit"
            className="w-full"
            disabled={isPending || (!inviteToken && !canSelectChapter)}
          >
            {isPending ? 'Creating account…' : 'Create account'}
          </Button>
        </form>
        <p className="text-sm text-muted-foreground text-center">
          Already have an account?{' '}
          <Link href="/auth/login" className="underline underline-offset-4 hover:text-primary">
            Sign in
          </Link>
        </p>
      </CardContent>
    </Card>
  )
}
