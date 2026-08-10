import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getOwnProfileForApp } from '@/lib/profile'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { logout } from '@/actions/auth'
import { STATUS } from '@/lib/constants'

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
            <CardTitle>Account not approved</CardTitle>
            <CardDescription>
              Your membership request was not approved, or your account has been suspended.
              Contact your chapter admin if you think this is a mistake.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <form action={logout}>
              <Button type="submit" variant="outline" className="w-full">
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
        <CardTitle>Finishing account setup</CardTitle>
        <CardDescription>
          We&apos;re still setting up your account. Please wait a moment and refresh, or sign out
          and try again.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <form action={logout}>
          <Button type="submit" variant="outline" className="w-full">
            Sign out
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
