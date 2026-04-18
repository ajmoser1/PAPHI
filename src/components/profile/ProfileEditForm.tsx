'use client'

import { useActionState } from 'react'
import { toast } from 'sonner'
import { useEffect } from 'react'
import { updateProfile } from '@/actions/profile'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

interface Props {
  profile: {
    first_name: string
    last_name: string
    bio: string | null
    graduation_year: number | null
    chapter: string | null
  }
}

export function ProfileEditForm({ profile }: Props) {
  const [state, action, isPending] = useActionState(updateProfile, undefined)

  useEffect(() => {
    if ((state as any)?.success) toast.success('Profile saved.')
    if ((state as any)?.message) toast.error((state as any).message)
  }, [state])

  const formKey = `${profile.first_name}|${profile.last_name}|${profile.bio}|${profile.graduation_year}|${profile.chapter}`

  return (
    <form key={formKey} action={action} className="space-y-4">
      <h2 className="text-lg font-semibold">Basic Info</h2>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <Label htmlFor="firstName">First name</Label>
          <Input id="firstName" name="firstName" defaultValue={profile.first_name} required />
          {state?.errors?.firstName && <p className="text-xs text-destructive">{state.errors.firstName[0]}</p>}
        </div>
        <div className="space-y-1">
          <Label htmlFor="lastName">Last name</Label>
          <Input id="lastName" name="lastName" defaultValue={profile.last_name} required />
          {state?.errors?.lastName && <p className="text-xs text-destructive">{state.errors.lastName[0]}</p>}
        </div>
      </div>
      <div className="space-y-1">
        <Label htmlFor="bio">Bio</Label>
        <Textarea id="bio" name="bio" defaultValue={profile.bio ?? ''} rows={3} placeholder="Tell the chapter about yourself..." />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <Label htmlFor="graduationYear">Graduation year</Label>
          <Input
            id="graduationYear"
            name="graduationYear"
            type="number"
            min={1900}
            max={2100}
            defaultValue={profile.graduation_year ?? ''}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="chapter">Chapter / School</Label>
          <Input id="chapter" name="chapter" defaultValue={profile.chapter ?? ''} />
        </div>
      </div>
      <Button type="submit" disabled={isPending}>
        {isPending ? 'Saving…' : 'Save changes'}
      </Button>
    </form>
  )
}
