'use client'

import { useActionState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { completeProfileSetup } from '@/actions/profile'
import { Button } from '@/components/ui/button'

export function ProfileSetupActions({
  hasVisibleContact,
  showFinishLater,
}: {
  hasVisibleContact: boolean
  showFinishLater: boolean
}) {
  const router = useRouter()
  const [state, action, isPending] = useActionState(completeProfileSetup, undefined)

  useEffect(() => {
    if (state?.success) {
      toast.success('Profile setup complete.')
      router.refresh()
    }
    if (state?.message) toast.error(state.message)
  }, [state, router])

  if (!showFinishLater) return null

  return (
    <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 space-y-3">
      <div>
        <p className="font-semibold text-primary">Finish your profile</p>
        <p className="text-sm text-muted-foreground mt-1">
          {hasVisibleContact
            ? 'You can mark setup complete now, or keep editing work experience and privacy below.'
            : 'Show at least one contact method to members (email, phone, or LinkedIn), then mark setup complete.'}
        </p>
      </div>
      <form action={action}>
        <Button type="submit" disabled={isPending || !hasVisibleContact}>
          {isPending ? 'Saving…' : 'Mark setup complete'}
        </Button>
      </form>
    </div>
  )
}
