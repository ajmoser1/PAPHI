import { createAdminClient } from '@/lib/supabase/server'
import { createClient } from '@/lib/supabase/server'
import { approveUser, rejectUser } from '@/actions/admin'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Phone } from 'lucide-react'
import { ROLES } from '@/lib/constants'
import { inviteRegisterUrl } from '@/lib/site'
import { InviteLinkCard } from '@/components/admin/InviteLinkCard'

export default async function ApprovalsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: adminProfile } = user
    ? await supabase.from('profiles').select('role, chapter_id').eq('id', user.id).single()
    : { data: null }

  const adminClient = createAdminClient()

  let query = adminClient
    .from('profiles')
    .select('id, first_name, last_name, role, created_at, chapter_id')
    .eq('status', 'pending_approval')
    .order('created_at', { ascending: true })

  if (adminProfile?.role !== ROLES.FOUNDER && adminProfile?.chapter_id) {
    query = query.eq('chapter_id', adminProfile.chapter_id)
  }

  const { data: pending } = await query

  type PendingProfile = { id: string; first_name: string; last_name: string; role: string; created_at: string }
  const pendingList = (pending ?? []) as PendingProfile[]

  const pendingIds = pendingList.map((p) => p.id)
  const { data: contacts } = pendingIds.length
    ? await adminClient
        .from('alumni_contact')
        .select('profile_id, phone')
        .in('profile_id', pendingIds)
    : { data: [] }

  const phoneByProfile = Object.fromEntries(
    ((contacts ?? []) as { profile_id: string; phone: string | null }[]).map((c) => [
      c.profile_id,
      c.phone,
    ])
  )

  let inviteUrl: string | null = null
  if (adminProfile?.chapter_id) {
    const { data: chapter } = await adminClient
      .from('chapters')
      .select('invite_token')
      .eq('id', adminProfile.chapter_id)
      .maybeSingle()
    if (chapter?.invite_token) {
      inviteUrl = inviteRegisterUrl(chapter.invite_token)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Pending Approvals</h1>
        <p className="text-muted-foreground">{pendingList.length} accounts awaiting review</p>
      </div>

      {inviteUrl ? (
        <InviteLinkCard inviteUrl={inviteUrl} emptyPending={!pendingList.length} />
      ) : adminProfile?.role === ROLES.FOUNDER ? (
        <Card>
          <CardContent className="py-4 text-sm text-muted-foreground">
            Founder accounts without a chapter assignment can copy invite links from the founder
            dashboard for each chapter.
          </CardContent>
        </Card>
      ) : null}

      {!pendingList.length ? (
        <p className="text-muted-foreground">
          {inviteUrl
            ? 'No pending accounts yet. Share your invite link to get members.'
            : 'No pending accounts.'}
        </p>
      ) : (
        <div className="space-y-3">
          {pendingList.map((p) => {
            const phone = phoneByProfile[p.id]
            return (
              <Card key={p.id}>
                <CardContent className="flex items-center justify-between py-4 gap-4">
                  <div>
                    <p className="font-medium">{p.first_name} {p.last_name}</p>
                    <div className="flex flex-wrap items-center gap-2 mt-1">
                      <Badge variant="secondary">{p.role}</Badge>
                      <span className="text-xs text-muted-foreground">
                        Registered {new Date(p.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 mt-2 text-sm">
                      <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                      {phone ? (
                        <span className="font-mono font-medium">{phone}</span>
                      ) : (
                        <span className="text-muted-foreground italic">No phone yet</span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <form action={approveUser.bind(null, p.id)}>
                      <Button type="submit" size="sm">Approve</Button>
                    </form>
                    <form action={rejectUser.bind(null, p.id)}>
                      <Button type="submit" size="sm" variant="destructive">Reject</Button>
                    </form>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
