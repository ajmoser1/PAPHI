'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { submitChapterRequest } from '@/actions/founder'
import { PASSWORD_REQUIREMENTS_HINT } from '@/lib/constants'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

type FormState =
  | { message?: string; success?: boolean; needsEmailConfirmation?: boolean }
  | undefined

async function submitRequest(_prev: FormState, formData: FormData): Promise<FormState> {
  return submitChapterRequest(formData)
}

export default function StartChapterPage() {
  const [state, action, isPending] = useActionState(submitRequest, undefined)

  if (state?.success) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle>Request submitted</CardTitle>
            <CardDescription>
              {state.needsEmailConfirmation
                ? 'Check your email to confirm your account. Once we approve your chapter, sign in with the password you just created.'
                : 'We&apos;ll review your chapter request shortly. Once approved, sign in with the email and password you just created.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <Link href="/auth/login" className="text-sm text-primary underline">
              Go to sign in
            </Link>
            <Link href="/" className="text-sm text-muted-foreground underline">
              Back to home
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-muted/30">
      <Card className="max-w-lg w-full">
        <CardHeader>
          <CardTitle>Start a Chapter</CardTitle>
          <CardDescription>
            Request to bring your chapter onto the platform and create your admin account. Free for
            all SAE chapters.
          </CardDescription>
        </CardHeader>
        <form action={action}>
          <CardContent className="space-y-4">
            {state?.message && (
              <p className="text-sm text-destructive">{state.message}</p>
            )}
            <div className="space-y-1">
              <Label htmlFor="chapterName">Chapter name</Label>
              <Input id="chapterName" name="chapterName" placeholder="e.g. PA PHI" required />
            </div>
            <div className="space-y-1">
              <Label htmlFor="schoolName">School</Label>
              <Input id="schoolName" name="schoolName" placeholder="e.g. Carnegie Mellon University" required />
            </div>
            <div className="space-y-1">
              <Label htmlFor="contactName">Your name</Label>
              <Input id="contactName" name="contactName" required />
            </div>
            <div className="space-y-1">
              <Label htmlFor="contactEmail">Your email</Label>
              <Input id="contactEmail" name="contactEmail" type="email" required />
            </div>
            <div className="space-y-1">
              <Label htmlFor="password">Password</Label>
              <Input id="password" name="password" type="password" required minLength={8} />
              <p className="text-xs text-muted-foreground">{PASSWORD_REQUIREMENTS_HINT}</p>
            </div>
            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending ? 'Submitting…' : 'Create account & submit request'}
            </Button>
          </CardContent>
        </form>
      </Card>
    </div>
  )
}
