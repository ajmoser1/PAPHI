'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { submitChapterRequest } from '@/actions/founder'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

type FormState = { message?: string; success?: boolean } | undefined

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
              We&apos;ll review your chapter request and get back to you shortly.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/" className="text-sm text-primary underline">
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
            Request to bring your chapter onto the platform. Free for all SAE chapters.
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
            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending ? 'Submitting…' : 'Submit request'}
            </Button>
          </CardContent>
        </form>
      </Card>
    </div>
  )
}
