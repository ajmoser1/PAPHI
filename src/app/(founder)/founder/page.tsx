import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/server'
import { createClient } from '@/lib/supabase/server'
import { logout } from '@/actions/auth'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  approveChapterRequest,
  rejectChapterRequest,
  assignChapterAdminFromForm,
  suspendChapter,
} from '@/actions/founder'
import { ROLES } from '@/lib/constants'

export default async function FounderPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== ROLES.FOUNDER) redirect('/members')

  const adminClient = createAdminClient()

  const [{ data: requests }, { data: chapters }] = await Promise.all([
    adminClient
      .from('chapter_requests')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: true }),
    adminClient
      .from('chapters')
      .select('id, slug, name, school_name, status, invite_token')
      .order('name'),
  ])

  type ChapterRequest = {
    id: string
    chapter_name: string
    school_name: string
    contact_name: string
    contact_email: string
  }
  type ChapterRow = {
    id: string
    slug: string
    name: string
    school_name: string | null
    status: string
    invite_token: string
  }

  const requestList = (requests ?? []) as ChapterRequest[]
  const chapterList = (chapters ?? []) as ChapterRow[]

  return (
    <div className="flex min-h-screen bg-zinc-50">
      <aside className="w-56 border-r bg-white h-screen sticky top-0 p-4 flex flex-col gap-1">
        <div className="px-2 py-3 mb-2">
          <p className="font-semibold text-sm">Founder Panel</p>
        </div>
        <Link
          href="/founder"
          className="flex items-center rounded-lg px-3 py-2 text-sm font-medium bg-muted text-foreground"
        >
          Dashboard
        </Link>
        <Link
          href="/members"
          className="flex items-center rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted"
        >
          ← Back to app
        </Link>
        <div className="mt-auto">
          <form action={logout}>
            <Button type="submit" variant="ghost" size="sm" className="w-full justify-start">
              Sign out
            </Button>
          </form>
        </div>
      </aside>

      <main className="flex-1 p-6 max-w-4xl space-y-8">
        <div>
          <h1 className="text-2xl font-bold">Founder Dashboard</h1>
          <p className="text-muted-foreground">Manage chapter requests and onboarding</p>
        </div>

        <section className="space-y-4">
          <h2 className="text-lg font-semibold">Pending Chapter Requests</h2>
          {!requestList.length ? (
            <p className="text-muted-foreground text-sm">No pending requests.</p>
          ) : (
            requestList.map((req) => (
              <Card key={req.id}>
                <CardContent className="py-4 space-y-3">
                  <div>
                    <p className="font-medium">{req.chapter_name}</p>
                    <p className="text-sm text-muted-foreground">{req.school_name}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {req.contact_name} · {req.contact_email}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <form action={approveChapterRequest.bind(null, req.id)}>
                      <Button type="submit" size="sm">Approve</Button>
                    </form>
                    <form action={rejectChapterRequest.bind(null, req.id)}>
                      <Button type="submit" size="sm" variant="destructive">Reject</Button>
                    </form>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </section>

        <section className="space-y-4">
          <h2 className="text-lg font-semibold">Chapters</h2>
          {chapterList.map((ch) => (
            <Card key={ch.id}>
              <CardContent className="py-4 space-y-3">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-medium">{ch.name}</p>
                    <p className="text-sm text-muted-foreground">{ch.school_name}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Subdomain: {ch.slug}.yourapp.com
                    </p>
                    <Badge variant="secondary" className="mt-2">{ch.status}</Badge>
                  </div>
                  {ch.status === 'active' && (
                    <form action={suspendChapter.bind(null, ch.id)}>
                      <Button type="submit" size="sm" variant="outline">Suspend</Button>
                    </form>
                  )}
                </div>
                <div className="text-xs bg-muted p-2 rounded font-mono break-all">
                  Invite: /auth/register?invite={ch.invite_token}
                </div>
                <form action={assignChapterAdminFromForm.bind(null, ch.id)} className="flex gap-2">
                  <Input name="email" type="email" placeholder="Admin email" required className="max-w-xs" />
                  <Button type="submit" size="sm" variant="secondary">Assign admin</Button>
                </form>
              </CardContent>
            </Card>
          ))}
        </section>
      </main>
    </div>
  )
}
