'use client'

import { useActionState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { register } from '@/actions/auth'
import { PASSWORD_REQUIREMENTS_HINT } from '@/lib/constants'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'

type ChapterOption = { id: string; name: string; school_name: string | null }

export function RegisterForm({ chapters = [] }: { chapters?: ChapterOption[] }) {
  const [state, action, isPending] = useActionState(register, undefined)
  const searchParams = useSearchParams()
  const inviteToken = searchParams.get('invite') ?? ''

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create an account</CardTitle>
        <CardDescription>
          {inviteToken
            ? "You've been invited to join your chapter network."
            : 'Join your chapter network — you can complete your profile while awaiting approval.'}
        </CardDescription>
      </CardHeader>
      <form action={action}>
        <CardContent className="space-y-4">
          {inviteToken && <input type="hidden" name="inviteToken" value={inviteToken} />}
          {state?.message && (
            <p className="text-sm text-destructive">{state.message}</p>
          )}
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
            <Label htmlFor="password">Password</Label>
            <Input id="password" name="password" type="password" required minLength={8} />
            <p className="text-xs text-muted-foreground">{PASSWORD_REQUIREMENTS_HINT}</p>
            {state?.errors?.password && (
              <p className="text-xs text-destructive">{state.errors.password[0]}</p>
            )}
          </div>
          {!inviteToken && chapters.length > 0 && (
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
            After registering, you&apos;ll enter the site immediately to complete your profile.
            Messaging unlocks once a chapter admin approves your account.
          </p>
        </CardContent>
        <CardFooter className="flex flex-col gap-3">
          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? 'Creating account…' : 'Create account'}
          </Button>
          <p className="text-sm text-muted-foreground text-center">
            Already have an account?{' '}
            <Link href="/auth/login" className="underline underline-offset-4 hover:text-primary">
              Sign in
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  )
}
