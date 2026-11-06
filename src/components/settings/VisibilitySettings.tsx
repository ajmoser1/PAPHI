'use client'

import { useState } from 'react'
import Link from 'next/link'
import { updatePrivacySettings } from '@/actions/chapter-admin'
import { updateContactVisibility } from '@/actions/profile'
import { Switch } from '@/components/ui/switch'
import { hasVisibleContact, VISIBLE_CONTACT_REQUIRED_MESSAGE } from '@/lib/contact'
import { Section, SectionRow } from '@/components/layout/Section'
import { SaveStatusText } from './SaveStatusText'
import { useAutosave } from './useAutosave'

type Contact = {
  email: string | null
  phone: string | null
  linkedin_url: string | null
  show_email: boolean
  show_phone: boolean
  show_linkedin: boolean
}

const AUDIENCES = [
  { value: 'fraternity', label: 'All chapters in my fraternity' },
  { value: 'chapter', label: 'My chapter only' },
  { value: 'hidden', label: 'Hidden' },
]

const selectClass =
  'h-10 w-full rounded-lg border border-input bg-card px-3 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50'

export function VisibilitySettings({
  visibilityScope,
  showContactTo,
  showBioTo,
  contact,
}: {
  visibilityScope: string
  showContactTo: string
  showBioTo: string
  contact: Contact | null
}) {
  const privacy = useAutosave()
  const contactSave = useAutosave()

  const [scope, setScope] = useState(visibilityScope)
  const [contactTo, setContactTo] = useState(showContactTo)
  const [bioTo, setBioTo] = useState(showBioTo)
  const [showEmail, setShowEmail] = useState(contact?.show_email ?? false)
  const [showPhone, setShowPhone] = useState(contact?.show_phone ?? true)
  const [showLinkedin, setShowLinkedin] = useState(contact?.show_linkedin ?? false)
  const [contactError, setContactError] = useState<string | null>(null)

  function savePrivacy(next: { scope?: string; contactTo?: string; bioTo?: string }) {
    const fd = new FormData()
    fd.set('visibilityScope', next.scope ?? scope)
    fd.set('showContactTo', next.contactTo ?? contactTo)
    fd.set('showBioTo', next.bioTo ?? bioTo)
    privacy.run(() => updatePrivacySettings(fd))
  }

  function saveContact(next: { email?: boolean; phone?: boolean; linkedin?: boolean }) {
    const values = {
      show_email: next.email ?? showEmail,
      show_phone: next.phone ?? showPhone,
      show_linkedin: next.linkedin ?? showLinkedin,
    }
    if (!hasVisibleContact({ ...contact, ...values })) {
      setContactError(VISIBLE_CONTACT_REQUIRED_MESSAGE)
      return false
    }
    setContactError(null)
    const fd = new FormData()
    fd.set('showEmail', String(values.show_email))
    fd.set('showPhone', String(values.show_phone))
    fd.set('showLinkedin', String(values.show_linkedin))
    contactSave.run(() => updateContactVisibility(fd))
    return true
  }

  const hasAnyContact = Boolean(contact?.email?.trim() || contact?.phone?.trim() || contact?.linkedin_url?.trim())

  return (
    <Section flush
      id="visibility"
      title="Who sees what"
      description="Changes save as you make them. Work experience is always visible to brothers so you can be found by company and field."
      aside={<SaveStatusText status={privacy.status === 'idle' ? contactSave.status : privacy.status} error={privacy.error ?? contactSave.error} />}
    >
      <SectionRow label="Who can find me in search" htmlFor="visibilityScope" hint={scope === 'hidden' ? 'Nobody finds you. You can still message and be messaged.' : scope === 'chapter' ? 'Only brothers from your own chapter.' : 'Any approved brother, at any chapter.'}>
        <select
          id="visibilityScope"
          value={scope}
          onChange={(e) => {
            setScope(e.target.value)
            savePrivacy({ scope: e.target.value })
          }}
          className={selectClass}
        >
          {AUDIENCES.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </SectionRow>
      <SectionRow label="Who sees my contact details" htmlFor="showContactTo" hint="Only the details switched on below.">
        <select
          id="showContactTo"
          value={contactTo}
          onChange={(e) => {
            setContactTo(e.target.value)
            savePrivacy({ contactTo: e.target.value })
          }}
          className={selectClass}
        >
          {AUDIENCES.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </SectionRow>
      <SectionRow label="Who sees my bio" htmlFor="showBioTo">
        <select
          id="showBioTo"
          value={bioTo}
          onChange={(e) => {
            setBioTo(e.target.value)
            savePrivacy({ bioTo: e.target.value })
          }}
          className={selectClass}
        >
          {AUDIENCES.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </SectionRow>

      {!hasAnyContact ? (
        <p className="py-3 text-sm text-muted-foreground">
          Add a phone, email, or LinkedIn on{' '}
          <Link href="/profile/edit#contact" className="font-medium text-primary underline-offset-4 hover:underline">
            your profile
          </Link>{' '}
          to choose which ones brothers can see.
        </p>
      ) : (
        <>
          <ToggleRow id="show-phone" label="Show my phone" value={contact?.phone} checked={showPhone} onChange={(v) => saveContact({ phone: v }) && setShowPhone(v)} />
          <ToggleRow id="show-email" label="Show my email" value={contact?.email} checked={showEmail} onChange={(v) => saveContact({ email: v }) && setShowEmail(v)} />
          <ToggleRow id="show-linkedin" label="Show my LinkedIn" value={contact?.linkedin_url} checked={showLinkedin} onChange={(v) => saveContact({ linkedin: v }) && setShowLinkedin(v)} />
          {contactError && <p className="py-2 text-xs font-medium text-destructive">{contactError}</p>}
        </>
      )}
    </Section>
  )
}

function ToggleRow({
  id,
  label,
  value,
  checked,
  onChange,
}: {
  id: string
  label: string
  value: string | null | undefined
  checked: boolean
  onChange: (v: boolean) => void
}) {
  const set = Boolean(value?.trim())
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div className="min-w-0">
        <label htmlFor={id} className="block text-sm font-medium">
          {label}
        </label>
        <p className="truncate text-xs text-muted-foreground">{set ? value : 'Not set'}</p>
      </div>
      <Switch id={id} checked={checked} disabled={!set} onCheckedChange={onChange} />
    </div>
  )
}
