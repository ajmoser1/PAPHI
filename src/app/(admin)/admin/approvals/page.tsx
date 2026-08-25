import { createAdminClient } from '@/lib/supabase/server'
import { createClient } from '@/lib/supabase/server'
import { approveUser, rejectUser, removeAcceptedProfile } from '@/actions/admin'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Building2, Linkedin, Mail, Phone } from 'lucide-react'
import { ROLES } from '@/lib/constants'
import {
  ALUMNI_CONTACT_VISIBLE_SELECT,
  CONTACT_REQUIRED_FOR_APPROVAL_MESSAGE,
  hasVisibleContact,
  type VisibleContactInput,
} from '@/lib/contact'
import { inviteRegisterUrl } from '@/lib/site'
import { InviteLinkCard } from '@/components/admin/InviteLinkCard'

type PendingContact = VisibleContactInput & { profile_id: string }

type PendingProfile = {
  id: string
  first_name: string
  last_name: string
  role: string
  created_at: string
  chapter_id: string | null
}

type ActiveProfile = {
  id: string
  first_name: string
  last_name: string
  role: string
  created_at: string
  chapter_id: string | null
}

export default async function MembersPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: adminProfile } = user
    ? await supabase.from('profiles').select('role, chapter_id').eq('id', user.id).single()
    : { data: null }

  const adminClient = createAdminClient()
  const isFounder = adminProfile?.role === ROLES.FOUNDER
  const chapterScoped = !isFounder && Boolean(adminProfile?.chapter_id)

  if (!isFounder && !adminProfile?.chapter_id) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Members</h1>
          <p className="text-muted-foreground">No chapter assigned to your admin account.</p>
        </div>
      </div>
    )
  }

  let pendingQuery = adminClient
    .from('profiles')
    .select('id, first_name, last_name, role, created_at, chapter_id')
    .eq('status', 'pending_approval')
    .order('created_at', { ascending: true })

  if (chapterScoped) {
    pendingQuery = pendingQuery.eq('chapter_id', adminProfile!.chapter_id)
  }

  let activeQuery = adminClient
    .from('profiles')
    .select('id, first_name, last_name, role, created_at, chapter_id')
    .eq('status', 'active')
    .not('role', 'in', `(${ROLES.FOUNDER},${ROLES.CHAPTER_ADMIN},${ROLES.ADMIN})`)
    .order('created_at', { ascending: false })

  if (chapterScoped) {
    activeQuery = activeQuery.eq('chapter_id', adminProfile!.chapter_id)
  }

  const [{ data: pending }, { data: active }] = await Promise.all([pendingQuery, activeQuery])

  const pendingList = (pending ?? []) as PendingProfile[]
  const activeList = (active ?? []) as ActiveProfile[]

  const pendingIds = pendingList.map((p) => p.id)
  const { data: contacts } = pendingIds.length
    ? await adminClient
        .from('alumni_contact')
        .select(`profile_id, ${ALUMNI_CONTACT_VISIBLE_SELECT}`)
        .in('profile_id', pendingIds)
    : { data: [] }

  const contactByProfile = Object.fromEntries(
    ((contacts ?? []) as PendingContact[]).map((c) => [c.profile_id, c])
  )

  const chapterIds = [
    ...new Set(
      [...pendingList, ...activeList]
        .map((p) => p.chapter_id)
        .filter((id): id is string => Boolean(id))
    ),
  ]
  const { data: chapters } = chapterIds.length
    ? await adminClient
        .from('chapters')
        .select('id, name, school_name')
        .in('id', chapterIds)
    : { data: [] }

  const chapterLabelById = Object.fromEntries(
    (
      (chapters ?? []) as { id: string; name: string; school_name: string | null }[]
    ).map((ch) => [
      ch.id,
      ch.school_name ? `${ch.name} — ${ch.school_name}` : ch.name,
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
      inviteUrl = inviteRegisterUrl(chapter.invite_token, user?.id)
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Members</h1>
        <p className="text-muted-foreground">
          {pendingList.length} pending · {activeList.length} active
        </p>
      </div>

      {inviteUrl ? (
        <InviteLinkCard inviteUrl={inviteUrl} emptyPending={!pendingList.length} />
      ) : isFounder ? (
        <Card>
          <CardContent className="py-4 text-sm text-muted-foreground">
            Founder accounts without a chapter assignment can copy invite links from the founder
            dashboard for each chapter.
          </CardContent>
        </Card>
      ) : null}

      <section className="space-y-4 border-t pt-6">
        <div>
          <h2 className="text-lg font-semibold">Pending approval</h2>
          <p className="text-sm text-muted-foreground">
            {pendingList.length} accounts awaiting review
          </p>
        </div>

        {!pendingList.length ? (
          <p className="text-muted-foreground text-sm">
            {inviteUrl
              ? 'No pending accounts yet. Share your invite link to get members.'
              : 'No pending accounts.'}
          </p>
        ) : (
          <div className="space-y-3">
            {pendingList.map((p) => {
              const contact = contactByProfile[p.id]
              const canApprove = hasVisibleContact(contact)
              const chapterLabel = p.chapter_id ? chapterLabelById[p.chapter_id] : null
              const email = contact?.email?.trim()
              const phone = contact?.phone?.trim()
              const linkedin = contact?.linkedin_url?.trim()
              return (
                <Card key={p.id}>
                  <CardContent className="flex items-center justify-between py-4 gap-4">
                    <div className="min-w-0">
                      <p className="font-medium">
                        {p.first_name} {p.last_name}
                      </p>
                      <div className="flex flex-wrap items-center gap-2 mt-1">
                        <Badge variant="secondary">{p.role}</Badge>
                        <span className="text-xs text-muted-foreground">
                          Registered {new Date(p.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="mt-2 space-y-1 text-sm">
                        <div className="flex items-center gap-1.5">
                          <Phone className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                          {phone ? (
                            <span className="font-mono font-medium">
                              {phone}
                              {contact?.show_phone ? '' : ' (hidden)'}
                            </span>
                          ) : (
                            <span className="text-muted-foreground italic">No phone</span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Mail className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                          {email ? (
                            <span className="truncate">
                              {email}
                              {contact?.show_email ? '' : ' (hidden)'}
                            </span>
                          ) : (
                            <span className="text-muted-foreground italic">No email</span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Linkedin className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                          {linkedin ? (
                            <span className="truncate">
                              LinkedIn{contact?.show_linkedin ? '' : ' (hidden)'}
                            </span>
                          ) : (
                            <span className="text-muted-foreground italic">No LinkedIn</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 mt-1.5 text-sm">
                        <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                        {chapterLabel ? (
                          <span>{chapterLabel}</span>
                        ) : (
                          <span className="text-muted-foreground italic">No chapter assigned</span>
                        )}
                      </div>
                      {!canApprove && (
                        <p className="mt-2 text-xs text-destructive max-w-md">
                          {CONTACT_REQUIRED_FOR_APPROVAL_MESSAGE}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <form action={approveUser.bind(null, p.id)}>
                        <Button type="submit" size="sm" disabled={!canApprove}>
                          Approve
                        </Button>
                      </form>
                      <form action={rejectUser.bind(null, p.id)}>
                        <Button type="submit" size="sm" variant="destructive">
                          Reject
                        </Button>
                      </form>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </section>

      <section className="space-y-4 border-t pt-6">
        <div>
          <h2 className="text-lg font-semibold">Active members</h2>
          <p className="text-sm text-muted-foreground">
            {activeList.length} accepted profiles
          </p>
        </div>

        {!activeList.length ? (
          <p className="text-muted-foreground text-sm">No active profiles found.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {activeList.map((profile) => {
              const chapterLabel = profile.chapter_id
                ? chapterLabelById[profile.chapter_id]
                : null
              return (
                <Card key={profile.id}>
                  <CardContent className="flex items-center justify-between py-4 gap-3">
                    <div className="min-w-0">
                      <p className="font-medium truncate">
                        {profile.first_name} {profile.last_name}
                      </p>
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        <Badge variant="secondary">{profile.role}</Badge>
                        <span className="text-xs text-muted-foreground">
                          Accepted {new Date(profile.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 mt-1.5 text-sm text-muted-foreground">
                        <Building2 className="h-3.5 w-3.5 shrink-0" />
                        {chapterLabel ? (
                          <span className="truncate">{chapterLabel}</span>
                        ) : (
                          <span className="italic">No chapter assigned</span>
                        )}
                      </div>
                    </div>
                    <form action={removeAcceptedProfile.bind(null, profile.id)}>
                      <Button type="submit" size="sm" variant="destructive">
                        Remove
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
