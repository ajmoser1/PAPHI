'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { updateContactInfo } from '@/actions/profile'
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
  const [showEmail, setShowEmail] = useState(contact?.show_email ?? false)
  const [showPhone, setShowPhone] = useState(contact?.show_phone ?? false)
  const [showLinkedin, setShowLinkedin] = useState(contact?.show_linkedin ?? true)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    formData.set('showEmail', String(showEmail))
    formData.set('showPhone', String(showPhone))
    formData.set('showLinkedin', String(showLinkedin))
    startTransition(async () => {
      const result = await updateContactInfo(formData)
      if ((result as any)?.message) toast.error((result as any).message)
      else toast.success('Contact info saved.')
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Choose what contact information is visible to other members. Phone is required so chapter
        admins can verify your identity.
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
          defaultValue={contact?.email ?? ''}
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
          defaultValue={contact?.phone ?? ''}
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
          defaultValue={contact?.linkedin_url ?? ''}
          placeholder="https://linkedin.com/in/..."
        />
      </div>

      <Button type="submit" disabled={isPending}>
        {isPending ? 'Saving…' : 'Save contact info'}
      </Button>
    </form>
  )
}
