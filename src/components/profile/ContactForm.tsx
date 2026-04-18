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
        Choose what contact information is visible to other members.
      </p>

      {[
        {
          id: 'email', label: 'Email', name: 'email', type: 'email',
          value: contact?.email, show: showEmail, setShow: setShowEmail, placeholder: 'you@example.com',
        },
        {
          id: 'phone', label: 'Phone', name: 'phone', type: 'tel',
          value: contact?.phone, show: showPhone, setShow: setShowPhone, placeholder: '+1 555 000 0000',
        },
        {
          id: 'linkedinUrl', label: 'LinkedIn URL', name: 'linkedinUrl', type: 'url',
          value: contact?.linkedin_url, show: showLinkedin, setShow: setShowLinkedin, placeholder: 'https://linkedin.com/in/...',
        },
      ].map(({ id, label, name, type, value, show, setShow, placeholder }) => (
        <div key={id} className="space-y-1">
          <div className="flex items-center justify-between">
            <Label htmlFor={id}>{label}</Label>
            <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer select-none">
              <input
                type="checkbox"
                checked={show}
                onChange={(e) => setShow(e.target.checked)}
                className="accent-primary"
              />
              Visible to members
            </label>
          </div>
          <Input id={id} name={name} type={type} defaultValue={value ?? ''} placeholder={placeholder} />
        </div>
      ))}

      <Button type="submit" disabled={isPending}>
        {isPending ? 'Saving…' : 'Save contact info'}
      </Button>
    </form>
  )
}
