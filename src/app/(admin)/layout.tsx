import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { logout } from '@/actions/auth'
import { Button } from '@/components/ui/button'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, first_name')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'admin') redirect('/dashboard')

  return (
    <div className="flex min-h-screen bg-zinc-50">
      <aside className="w-56 border-r bg-white h-screen sticky top-0 p-4 flex flex-col gap-1">
        <div className="px-2 py-3 mb-2">
          <p className="font-semibold text-sm">Admin Panel</p>
          <p className="text-xs text-muted-foreground">{profile.first_name}</p>
        </div>
        {[
          { href: '/admin/approvals', label: 'Approvals' },
          { href: '/admin/companies', label: 'Companies' },
          { href: '/admin/industries', label: 'Industries' },
          { href: '/dashboard', label: '← Back to app' },
        ].map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            className="flex items-center rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            {label}
          </Link>
        ))}
        <div className="mt-auto">
          <form action={logout}>
            <Button type="submit" variant="ghost" size="sm" className="w-full justify-start text-muted-foreground">
              Sign out
            </Button>
          </form>
        </div>
      </aside>
      <main className="flex-1 p-6 max-w-5xl">{children}</main>
    </div>
  )
}
