'use client'

import { useActionState, useEffect, useState, useTransition } from 'react'
import { toast } from 'sonner'
import { updatePrivacySettings } from '@/actions/chapter-admin'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { SelectField, FormAlert } from '@/components/ui/form-field'

type PrivacySettings = {
  show_contact_to?: string
  show_positions_to?: string
  show_bio_to?: string
}

interface Props {
  visibilityScope: string
  privacySettings: PrivacySettings
}

const OPTIONS = [
  { value: 'fraternity', label: 'All chapters in my fraternity' },
  { value: 'chapter', label: 'My chapter only' },
  { value: 'hidden', label: 'Hidden' },
]

const HINTS: Record<string, string> = {
  fraternity: 'Any approved brother, at any chapter, can see this.',
  chapter: 'Only brothers from your own chapter can see this.',
  hidden: 'Nobody sees this. You can still message and be messaged.',
}

type State = { message?: string; success?: boolean } | undefined

export function PrivacySettingsForm({ visibilityScope, privacySettings }: Props) {
  const [state, action, isPending] = useActionState<State, FormData>(
    async (_prev, fd) => (await updatePrivacySettings(fd)) as State,
    undefined
  )

  const [, startTransition] = useTransition()
  const [scope, setScope] = useState(visibilityScope)

  useEffect(() => {
    if (state?.success) toast.success('Privacy settings saved.')
  }, [state])

  return (
    <Card id="privacy">
      <CardHeader>
        <CardTitle as="h2" className="heading-4">
          Privacy
        </CardTitle>
        <CardDescription>Who can find you and what they see. Work experience is always visible to brothers so you can be found by company and field.</CardDescription>
      </CardHeader>
      <CardContent>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            const fd = new FormData(e.currentTarget)
            startTransition(() => action(fd))
          }}
          className="max-w-lg space-y-4"
        >
          <FormAlert message={state?.success ? undefined : state?.message} />
          <SelectField id="visibilityScope" name="visibilityScope" label="Who can find me in search" value={scope} onChange={(e) => setScope(e.target.value)} hint={HINTS[scope]}>
            {OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </SelectField>
          <SelectField id="showContactTo" name="showContactTo" label="Who sees my contact details" defaultValue={privacySettings.show_contact_to ?? 'fraternity'} hint="Only the details you ticked as visible on your profile.">
            {OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </SelectField>
          <SelectField id="showBioTo" name="showBioTo" label="Who sees my bio" defaultValue={privacySettings.show_bio_to ?? 'fraternity'}>
            {OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </SelectField>
          <Button type="submit" disabled={isPending}>
            {isPending ? 'Saving…' : 'Save privacy'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
