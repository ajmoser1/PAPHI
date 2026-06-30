'use client'

import { updatePrivacySettings } from '@/actions/chapter-admin'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

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
  { value: 'chapter', label: 'My chapter only' },
  { value: 'fraternity', label: 'All chapters in my fraternity' },
  { value: 'hidden', label: 'Hidden' },
]

export function PrivacySettingsForm({ visibilityScope, privacySettings }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Privacy settings</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={updatePrivacySettings} className="space-y-4 max-w-lg">
          <div className="space-y-1">
            <Label htmlFor="visibilityScope">Who can find me in search?</Label>
            <select
              id="visibilityScope"
              name="visibilityScope"
              defaultValue={visibilityScope}
              className="w-full h-9 rounded-md border border-border bg-background px-3 text-sm"
            >
              {OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          {[
            { name: 'showContactTo', label: 'Contact info visible to', default: privacySettings.show_contact_to },
            { name: 'showPositionsTo', label: 'Work experience visible to', default: privacySettings.show_positions_to },
            { name: 'showBioTo', label: 'Bio visible to', default: privacySettings.show_bio_to },
          ].map(({ name, label, default: defaultVal }) => (
            <div key={name} className="space-y-1">
              <Label htmlFor={name}>{label}</Label>
              <select
                id={name}
                name={name}
                defaultValue={defaultVal ?? 'fraternity'}
                className="w-full h-9 rounded-md border border-border bg-background px-3 text-sm"
              >
                {OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
          ))}

          <Button type="submit">Save privacy settings</Button>
        </form>
      </CardContent>
    </Card>
  )
}
