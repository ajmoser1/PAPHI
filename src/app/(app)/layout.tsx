import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AppShell } from '@/components/layout/AppShell'

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('first_name, last_name, role, status')
    .eq('id', user.id)
    .single()

  if (!profile || profile.status !== 'active') redirect('/auth/pending')

  return (
    <AppShell role={profile.role} firstName={profile.first_name}>
      {children}
    </AppShell>
  )
}
