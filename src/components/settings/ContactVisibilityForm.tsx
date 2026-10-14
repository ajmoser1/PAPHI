'use client'

import { useMemo, useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { updateContactVisibility } from '@/actions/profile'
import { hasVisibleContact, VISIBLE_CONTACT_REQUIRED_MESSAGE } from '@/lib/contact'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'

interface Contact {
  email: string | null
  phone: string | null
  linkedin_url: string | null
  show_email: boolean
  show_phone: boolean
  show_linkedin: boolean
}

function Row({
  id,
  label,
  value,
  checked,
  disabled,
  onChange,
}: {
  id: string
  label: string
  value: string | null | undefined
  checked: boolean
  disabled: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2.5">
      <div className="min-w-0">
        <label htmlFor={id} className="block text-sm font-medium">
          {label}
        </label>
        <p className="truncate text-xs text-muted-foreground">{value?.trim() || 'Not set'}</p>
      </div>
      <Switch id={id} checked={checked} disabled={disabled} onCheckedChange={onChange} aria-label={`Show ${label.toLowerCase()} to members`} />
    </div>
  )
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

  const hasAnyValue = Boolean(contact?.email?.trim() || contact?.phone?.trim() || contact?.linkedin_url?.trim())

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData()
    formData.set('showEmail', String(showEmail))
    formData.set('showPhone', String(showPhone))
    formData.set('showLinkedin', String(showLinkedin))
    startTransition(async () => {
      const result = await updateContactVisibility(formData)
      if ((result as { message?: string })?.message) toast.error((result as { message: string }).message)
      else {
        toast.success('Visibility saved.')
        router.refresh()
      }
    })
  }

  return (
    <Card id="contact-visibility">
      <CardHeader>
        <CardTitle as="h2" className="heading-4">
          Contact visibility
        </CardTitle>
        <CardDescription>Which of your details other members can see. At least one must stay on.</CardDescription>
      </CardHeader>
      <CardContent>
        {!hasAnyValue ? (
          <p className="text-sm text-muted-foreground">
            Add a phone, email, or LinkedIn on{' '}
            <Link href="/profile/edit#contact" className="font-medium text-primary underline-offset-4 hover:underline">
              your profile
            </Link>{' '}
            first, then choose what brothers can see.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="max-w-lg space-y-3">
            <Row id="show-phone" label="Phone" value={contact?.phone} checked={showPhone} disabled={!contact?.phone?.trim()} onChange={setShowPhone} />
            <Row id="show-email" label="Email" value={contact?.email} checked={showEmail} disabled={!contact?.email?.trim()} onChange={setShowEmail} />
            <Row id="show-linkedin" label="LinkedIn" value={contact?.linkedin_url} checked={showLinkedin} disabled={!contact?.linkedin_url?.trim()} onChange={setShowLinkedin} />
            {!canSubmit && <p className="text-xs font-medium text-destructive">{VISIBLE_CONTACT_REQUIRED_MESSAGE}</p>}
            <Button type="submit" disabled={isPending || !canSubmit}>
              {isPending ? 'Saving…' : 'Save visibility'}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  )
}
