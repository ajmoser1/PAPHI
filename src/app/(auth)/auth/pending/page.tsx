import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getOwnProfileForApp } from '@/lib/profile'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { logout } from '@/actions/auth'

export default async function PendingPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    const profile = await getOwnProfileForApp()

    if (profile?.status === 'pending_approval') {
      redirect('/profile/edit')
    }

    if (profile?.status === 'active') {
      redirect('/members')
    }
  }

  return (
    <Card>
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-yellow-100">
          <span className="text-2xl">⏳</span>
        </div>
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
