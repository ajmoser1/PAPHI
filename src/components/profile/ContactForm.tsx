'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
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
  const [email, setEmail] = useState(contact?.email ?? '')
  const [phone, setPhone] = useState(contact?.phone ?? '')
  const [linkedinUrl, setLinkedinUrl] = useState(contact?.linkedin_url ?? '')

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    startTransition(async () => {
      const result = await updateContactInfo(formData)
      if ((result as { message?: string })?.message) {
        toast.error((result as { message: string }).message)
      } else {
        toast.success('Contact info saved.')
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Admins use your phone to verify you while your account is pending. Choose what brothers can
        see under{' '}
        <Link href="/settings" className="underline underline-offset-2">
          Settings
        </Link>
        .
      </p>

      <div className="space-y-1">
        <Label htmlFor="email">Email</Label>
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
        <Label htmlFor="phone">Phone</Label>
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
        <Label htmlFor="linkedinUrl">LinkedIn URL</Label>
        <Input
          id="linkedinUrl"
          name="linkedinUrl"
          type="url"
          value={linkedinUrl}
          onChange={(e) => setLinkedinUrl(e.target.value)}
          placeholder="https://linkedin.com/in/..."
        />
      </div>

      <Button type="submit" disabled={isPending}>
        {isPending ? 'Saving…' : 'Save contact info'}
      </Button>
    </form>
  )
}
