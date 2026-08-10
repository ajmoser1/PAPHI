'use client'

import { useMemo, useState, useTransition } from 'react'
import { toast } from 'sonner'
import { updateContactInfo } from '@/actions/profile'
import { hasVisibleContact, VISIBLE_CONTACT_REQUIRED_MESSAGE } from '@/lib/contact'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface Contact {
  email: string | null
  phone: string | null
  linkedin_url: string | null
  show_email: boolean
  show_phone: boolean
  show_linkedin: boolean
}

interface Props {
  contact: Contact | null
}

export function ContactForm({ contact }: Props) {
  const [isPending, startTransition] = useTransition()
  const [email, setEmail] = useState(contact?.email ?? '')
  const [phone, setPhone] = useState(contact?.phone ?? '')
  const [linkedinUrl, setLinkedinUrl] = useState(contact?.linkedin_url ?? '')
  const [showEmail, setShowEmail] = useState(contact?.show_email ?? false)
  const [showPhone, setShowPhone] = useState(contact?.show_phone ?? true)
  const [showLinkedin, setShowLinkedin] = useState(contact?.show_linkedin ?? false)
  const [clientError, setClientError] = useState<string | null>(null)

  const canSubmit = useMemo(
    () =>
      hasVisibleContact({
        email,
        phone,
        linkedin_url: linkedinUrl,
        show_email: showEmail,
        show_phone: showPhone,
        show_linkedin: showLinkedin,
      }),
    [email, phone, linkedinUrl, showEmail, showPhone, showLinkedin]
  )

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!canSubmit) {
      setClientError(VISIBLE_CONTACT_REQUIRED_MESSAGE)
      return
    }
    setClientError(null)
    const formData = new FormData(e.currentTarget)
    formData.set('showEmail', String(showEmail))
    formData.set('showPhone', String(showPhone))
    formData.set('showLinkedin', String(showLinkedin))
    startTransition(async () => {
      const result = await updateContactInfo(formData)
      if ((result as { message?: string })?.message) toast.error((result as { message: string }).message)
      else toast.success('Contact info saved.')
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Admins use your phone to verify you while your account is pending. At least one contact
        method must be visible to members (email, phone, or LinkedIn).
      </p>

      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <Label htmlFor="email">Email</Label>
          <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showEmail}
              onChange={(e) => setShowEmail(e.target.checked)}
              className="accent-primary"
            />
            Visible to members
          </label>
        </div>
        <Input
          id="email"
          name="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
        />
      </div>

      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <Label htmlFor="phone">Phone</Label>
          <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showPhone}
              onChange={(e) => setShowPhone(e.target.checked)}
              className="accent-primary"
            />
            Visible to members
          </label>
        </div>
        <Input
          id="phone"
          name="phone"
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="+1 555 000 0000"
          required
        />
      </div>

      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <Label htmlFor="linkedinUrl">LinkedIn URL</Label>
          <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showLinkedin}
              onChange={(e) => setShowLinkedin(e.target.checked)}
              className="accent-primary"
            />
            Visible to members
          </label>
        </div>
        <Input
          id="linkedinUrl"
          name="linkedinUrl"
          type="url"
          value={linkedinUrl}
          onChange={(e) => setLinkedinUrl(e.target.value)}
          placeholder="https://linkedin.com/in/..."
        />
      </div>

      {!canSubmit && (
        <p className="text-xs text-muted-foreground">{VISIBLE_CONTACT_REQUIRED_MESSAGE}</p>
      )}
      {clientError && <p className="text-xs text-destructive">{clientError}</p>}

      <Button type="submit" disabled={isPending || !canSubmit}>
        {isPending ? 'Saving…' : 'Save contact info'}
      </Button>
    </form>
  )
}
