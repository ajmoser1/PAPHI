'use client'

import { useMemo, useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { updateContactVisibility } from '@/actions/profile'
import { hasVisibleContact, VISIBLE_CONTACT_REQUIRED_MESSAGE } from '@/lib/contact'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface Contact {
  email: string | null
  phone: string | null
  linkedin_url: string | null
  show_email: boolean
  show_phone: boolean
  show_linkedin: boolean
}

export function ContactVisibilityForm({ contact }: { contact: Contact | null }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [showEmail, setShowEmail] = useState(contact?.show_email ?? false)
  const [showPhone, setShowPhone] = useState(contact?.show_phone ?? true)
  const [showLinkedin, setShowLinkedin] = useState(contact?.show_linkedin ?? false)

  const canSubmit = useMemo(
    () =>
      hasVisibleContact({
        email: contact?.email,
        phone: contact?.phone,
        linkedin_url: contact?.linkedin_url,
        show_email: showEmail,
        show_phone: showPhone,
        show_linkedin: showLinkedin,
      }),
    [contact, showEmail, showPhone, showLinkedin]
  )

  const hasAnyValue = Boolean(
    contact?.email?.trim() || contact?.phone?.trim() || contact?.linkedin_url?.trim()
  )

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData()
    formData.set('showEmail', String(showEmail))
    formData.set('showPhone', String(showPhone))
    formData.set('showLinkedin', String(showLinkedin))
    startTransition(async () => {
      const result = await updateContactVisibility(formData)
      if ((result as { message?: string })?.message) {
        toast.error((result as { message: string }).message)
      } else {
        toast.success('Visibility saved.')
        router.refresh()
      }
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Contact visibility</CardTitle>
      </CardHeader>
      <CardContent>
        {!hasAnyValue ? (
          <p className="text-sm text-muted-foreground">
            Add email, phone, or LinkedIn on{' '}
            <Link href="/profile/edit" className="underline underline-offset-2">
              Profile
            </Link>{' '}
            first, then choose what brothers can see.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 max-w-lg">
            <p className="text-sm text-muted-foreground">
              At least one contact method must stay visible to members.
            </p>

            <label className="flex items-center justify-between gap-3 rounded-md border px-3 py-2 cursor-pointer">
              <div>
                <Label className="cursor-pointer">Email</Label>
                <p className="text-xs text-muted-foreground truncate max-w-[16rem]">
                  {contact?.email?.trim() || 'Not set'}
                </p>
              </div>
              <input
                type="checkbox"
                checked={showEmail}
                disabled={!contact?.email?.trim()}
                onChange={(e) => setShowEmail(e.target.checked)}
                className="accent-primary"
              />
            </label>

            <label className="flex items-center justify-between gap-3 rounded-md border px-3 py-2 cursor-pointer">
              <div>
                <Label className="cursor-pointer">Phone</Label>
                <p className="text-xs text-muted-foreground truncate max-w-[16rem]">
                  {contact?.phone?.trim() || 'Not set'}
                </p>
              </div>
              <input
                type="checkbox"
                checked={showPhone}
                disabled={!contact?.phone?.trim()}
                onChange={(e) => setShowPhone(e.target.checked)}
                className="accent-primary"
              />
            </label>

            <label className="flex items-center justify-between gap-3 rounded-md border px-3 py-2 cursor-pointer">
              <div>
                <Label className="cursor-pointer">LinkedIn</Label>
                <p className="text-xs text-muted-foreground truncate max-w-[16rem]">
                  {contact?.linkedin_url?.trim() || 'Not set'}
                </p>
              </div>
              <input
                type="checkbox"
                checked={showLinkedin}
                disabled={!contact?.linkedin_url?.trim()}
                onChange={(e) => setShowLinkedin(e.target.checked)}
                className="accent-primary"
              />
            </label>

            {!canSubmit && (
              <p className="text-xs text-destructive">{VISIBLE_CONTACT_REQUIRED_MESSAGE}</p>
            )}

            <Button type="submit" disabled={isPending || !canSubmit}>
              {isPending ? 'Saving…' : 'Save visibility'}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  )
}
