'use client'

import { useActionState, useEffect, useRef, useState, useTransition } from 'react'
import { toast } from 'sonner'
import { saveProfile, type SaveProfileState } from '@/actions/profile'
import { Section } from '@/components/layout/Section'
import { Textarea } from '@/components/ui/textarea'
import { FormAlert, FormField, FieldShell } from '@/components/ui/form-field'
import { StickySaveBar } from '@/components/forms/StickySaveBar'

type Props = {
  profile: { first_name: string; last_name: string; bio: string | null; graduation_year: number | null }
  contact: {
    email: string | null
    phone: string | null
    linkedin_url: string | null
    show_email: boolean
    show_phone: boolean
    show_linkedin: boolean
  } | null
  chapterLabel: string | null
  /** Members must give a phone and show one contact method; admins are exempt. */
  contactRequired?: boolean
}

const FIELD_LABELS: Record<string, string> = {
  firstName: 'First name',
  lastName: 'Last name',
  bio: 'Bio',
  graduationYear: 'Graduation year',
  email: 'Email',
  phone: 'Phone',
  linkedinUrl: 'LinkedIn',
  showPhone: 'Contact visibility',
}

function snapshot(form: HTMLFormElement | null): string {
  if (!form) return ''
  const fd = new FormData(form)
  return Array.from(fd.entries())
    .map(([k, v]) => `${k}=${typeof v === 'string' ? v : ''}`)
    .join('&')
}

/** Name, bio, class year, contact details and their visibility, saved together. */
export function ProfileForm({ profile, contact, chapterLabel, contactRequired = true }: Props) {
  const [state, action, isPending] = useActionState<SaveProfileState, FormData>(saveProfile, undefined)
  const [, startTransition] = useTransition()
  const formRef = useRef<HTMLFormElement>(null)
  const [initial, setInitial] = useState('')
  const [dirty, setDirty] = useState(false)

  const formKey = JSON.stringify({ profile, contact })

  useEffect(() => {
    setInitial(snapshot(formRef.current))
    setDirty(false)
  }, [formKey])

  useEffect(() => {
    if (state?.success) {
      toast.success('Profile saved.')
      setInitial(snapshot(formRef.current))
      setDirty(false)
    }
  }, [state])

  useEffect(() => {
    if (!dirty) return
    function warn(e: BeforeUnloadEvent) {
      e.preventDefault()
    }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])

  const errors = state?.errors ?? {}
  const err = (k: string) => errors[k]?.[0]

  return (
    <form
      key={formKey}
      ref={formRef}
      // Submitting via onSubmit (not the action prop) keeps React 19 from
      // resetting every field when the action returns validation errors.
      onSubmit={(e) => {
        e.preventDefault()
        const fd = new FormData(e.currentTarget)
        startTransition(() => action(fd))
      }}
      onChange={() => setDirty(snapshot(formRef.current) !== initial)}
      className="space-y-10"
    >
      <FormAlert message={state?.message} errors={state?.errors} fieldLabels={FIELD_LABELS} />

      <Section id="basics" title="About you">
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField id="firstName" name="firstName" label="First name" defaultValue={profile.first_name} required autoComplete="given-name" error={err('firstName')} />
            <FormField id="lastName" name="lastName" label="Last name" defaultValue={profile.last_name} required autoComplete="family-name" error={err('lastName')} />
          </div>
          <FieldShell id="bio" label="Bio" error={err('bio')}>
            {(a11y) => (
              <Textarea id="bio" name="bio" defaultValue={profile.bio ?? ''} rows={3} placeholder="Product manager in fintech, happy to chat about breaking into PM…" {...a11y} />
            )}
          </FieldShell>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              id="graduationYear"
              name="graduationYear"
              label="Graduation year"
              type="number"
              inputMode="numeric"
              min={1900}
              max={2100}
              defaultValue={profile.graduation_year ?? ''}
              error={err('graduationYear')}
            />
            <div className="space-y-1.5">
              <p className="text-sm font-medium" id="chapterLabel-label">
                Chapter
              </p>
              <p
                aria-labelledby="chapterLabel-label"
                className="flex h-11 items-center rounded-lg border border-border bg-muted/40 px-3 text-base text-muted-foreground md:h-10 md:text-sm"
              >
                {chapterLabel ?? 'No chapter assigned'}
              </p>
            </div>
          </div>
        </div>
      </Section>

      <Section id="contact" title="Contact">
        <div className="space-y-4">
          <ContactField
            id="phone"
            name="phone"
            label="Phone"
            type="tel"
            autoComplete="tel"
            inputMode="tel"
            required={contactRequired}
            defaultValue={contact?.phone ?? ''}
            placeholder="+1 555 000 0000"
            error={err('phone')}
            toggleName="showPhone"
            toggleDefault={contact?.show_phone ?? true}
          />
          <ContactField
            id="email"
            name="email"
            label="Email"
            type="email"
            autoComplete="email"
            inputMode="email"
            defaultValue={contact?.email ?? ''}
            placeholder="you@example.com"
            error={err('email')}
            toggleName="showEmail"
            toggleDefault={contact?.show_email ?? false}
          />
          <ContactField
            id="linkedinUrl"
            name="linkedinUrl"
            label="LinkedIn"
            type="url"
            autoComplete="url"
            inputMode="url"
            defaultValue={contact?.linkedin_url ?? ''}
            placeholder="https://linkedin.com/in/…"
            error={err('linkedinUrl')}
            toggleName="showLinkedin"
            toggleDefault={contact?.show_linkedin ?? false}
          />
          {err('showPhone') && <p className="text-xs font-medium text-destructive">{err('showPhone')}</p>}
        </div>
      </Section>

      <StickySaveBar
        visible={dirty || Boolean(state?.message) || Object.keys(errors).length > 0}
        isPending={isPending}
        onDiscard={() => {
          formRef.current?.reset()
          setDirty(false)
        }}
      />
    </form>
  )
}

function ContactField({
  id,
  name,
  label,
  error,
  toggleName,
  toggleDefault,
  ...input
}: React.ComponentProps<typeof FormField> & { toggleName: string; toggleDefault: boolean }) {
  return (
    <div className="grid gap-2 sm:grid-cols-[1fr_auto] sm:items-end">
      <FormField id={id} name={name} label={label} error={error} {...input} />
      <label className="flex h-11 cursor-pointer items-center gap-2 rounded-lg border border-border px-3 text-sm whitespace-nowrap md:h-10">
        <input type="checkbox" id={toggleName} name={toggleName} defaultChecked={toggleDefault} className="size-4 accent-primary" />
        Visible to members
      </label>
    </div>
  )
}
