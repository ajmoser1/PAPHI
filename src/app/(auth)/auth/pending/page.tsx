import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getOwnProfileForApp } from '@/lib/profile'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { RetryButton } from '@/components/auth/RetryButton'
import { logout } from '@/actions/auth'
import { STATUS } from '@/lib/constants'

export const metadata: Metadata = { title: 'Account status' }

export default async function PendingPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    const profile = await getOwnProfileForApp()

    if (profile?.status === STATUS.PENDING_APPROVAL) {
      redirect('/profile/edit')
    }

    if (profile?.status === STATUS.ACTIVE) {
      redirect('/members')
    }

    if (profile?.status === STATUS.SUSPENDED) {
      return (
        <Card>
          <CardHeader className="text-center">
            <CardTitle as="h1" className="text-xl">Account not approved</CardTitle>
            <CardDescription>
              Your membership request was not approved, or your account has been suspended.
              Contact your chapter admin if you think this is a mistake.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <form action={logout}>
              <Button type="submit" variant="outline" size="lg" className="h-11 w-full text-base md:h-10 md:text-sm">
                Sign out
              </Button>
            </form>
          </CardContent>
        </Card>
      )
    }
  }

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle as="h1" className="text-xl">Finishing account setup</CardTitle>
        <CardDescription>
          We&apos;re still setting up your account. This usually takes a few seconds.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <RetryButton label="Check again" />
        <form action={logout}>
          <Button type="submit" variant="ghost" size="lg" className="h-11 w-full text-base md:h-10 md:text-sm">
            Sign out and try later
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
