import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Building2, Calendar, GraduationCap, Pencil, ShieldCheck } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { getMemberProfile, getMemberPositions } from '@/lib/members'
import { getOwnProfileForApp } from '@/lib/profile'
import { buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { MemberAvatar } from '@/components/members/MemberAvatar'
import { RoleMarker, roleKind } from '@/components/members/RoleMarker'
import { MessageStarter } from '@/components/messaging/MessageStarter'
import { ContactRow } from '@/components/profile/ContactRow'
import { canViewBio, canViewContact, canViewPositions } from '@/lib/privacy'
import { pickDisplayPosition } from '@/lib/positions'
import { cn } from '@/lib/utils'

function safeBack(value: string | string[] | undefined): string {
  const v = Array.isArray(value) ? value[0] : value
  if (v && v.startsWith('/members') && !v.startsWith('//')) return v
  return '/members'
}

export default async function MemberProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const [{ id }, sp] = await Promise.all([params, searchParams])
  const backHref = safeBack(sp.back)
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const viewerProfile = await getOwnProfileForApp()
  const viewerIsActive = viewerProfile?.status === 'active'
  const viewerChapterId = viewerProfile?.chapter_id ?? null

  if (!viewerIsActive) {
    return (
      <div className="mx-auto max-w-2xl">
        <Card>
          <CardContent className="space-y-4 pt-6">
            <h1 className="heading-3 text-primary">Approval required</h1>
            <p className="text-sm text-muted-foreground">
              Your account is pending chapter admin approval. Member profiles and messaging unlock after approval.
            </p>
            <div className="flex flex-wrap gap-2">
              <Link href="/members" className={buttonVariants({ variant: 'outline' })}>
                Back to Find a Brother
              </Link>
              <Link href="/profile/edit" className={buttonVariants()}>
                Complete your profile
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const [{ profile }, positions, { data: contact }] = await Promise.all([
    getMemberProfile(id).then((data) => ({ profile: data })),
    getMemberPositions(id),
    supabase
      .from('alumni_contact_public')
      .select('email, phone, linkedin_url, show_email, show_phone, show_linkedin')
      .eq('profile_id', id)
      .single(),
  ])

  let targetChapter = null
  if (profile?.chapter_id) {
    const { data } = await supabase.from('chapters').select('name, school_name').eq('id', profile.chapter_id).single()
    targetChapter = data
  }

  if (
    !profile ||
    profile.status !== 'active' ||
    !['undergrad', 'alumni', 'admin', 'chapter_admin', 'founder'].includes(profile.role)
  ) {
    notFound()
  }

  const privacySettings = (profile.privacy_settings as Record<string, string>) ?? {}
  const showBio = canViewBio(privacySettings, viewerChapterId, profile.chapter_id)
  const showPositions = canViewPositions(privacySettings, viewerChapterId, profile.chapter_id)
  const showContact = viewerIsActive && canViewContact(privacySettings, viewerChapterId, profile.chapter_id)

  const displayPosition = pickDisplayPosition(
    (positions ?? []) as Parameters<typeof pickDisplayPosition>[0],
    profile.featured_position_id
  )
  const displayCompany = (displayPosition as { companies?: { name?: string } } | undefined)?.companies?.name ?? null
  const isOwnProfile = user.id === id
  const isAlumni = roleKind(profile.role) === 'alumni'

  const visibleContact =
    showContact && contact && ((contact.show_email && contact.email) || (contact.show_phone && contact.phone) || (contact.show_linkedin && contact.linkedin_url))
  const hasExperience = showPositions && positions && positions.length > 0
  const hasBio = showBio && Boolean(profile.bio)
  const limitedProfile = !hasBio && !hasExperience && !visibleContact

  const sortedPositions = [...(positions ?? [])].sort((a, b) => {
    if (a.is_current !== b.is_current) return a.is_current ? -1 : 1
    return (b.start_year ?? 0) - (a.start_year ?? 0)
  })

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link
        href={backHref}
        className="inline-flex min-h-9 items-center gap-1.5 text-sm font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Back to Find a Brother
      </Link>

      <Card>
        <CardContent className="flex flex-col gap-5 pt-2 sm:flex-row sm:items-start">
          <MemberAvatar
            firstName={profile.first_name ?? ''}
            lastName={profile.last_name ?? ''}
            avatarUrl={profile.avatar_url}
            size={96}
            highlight={isAlumni}
          />
          <div className="min-w-0 flex-1 space-y-3">
            <div>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <h1 className="heading-1">
                  {profile.first_name} {profile.last_name}
                </h1>
                <RoleMarker role={profile.role} />
              </div>
              {displayPosition && showPositions && (
                <p className="mt-1 text-base text-foreground/85">
                  {displayPosition.title}
                  {displayCompany ? ` at ${displayCompany}` : ''}
                </p>
              )}
            </div>
            <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
              {profile.graduation_year && (
                <li className="inline-flex items-center gap-1.5">
                  <Calendar className="size-4" aria-hidden="true" /> Class of {profile.graduation_year}
                </li>
              )}
              {targetChapter?.name && (
                <li className="inline-flex items-center gap-1.5">
                  <ShieldCheck className="size-4" aria-hidden="true" /> {targetChapter.name}
                </li>
              )}
              {targetChapter?.school_name && (
                <li className="inline-flex items-center gap-1.5">
                  <GraduationCap className="size-4" aria-hidden="true" /> {targetChapter.school_name}
                </li>
              )}
            </ul>
            <div className="flex flex-wrap gap-2 pt-1">
              {isOwnProfile ? (
                <Link href="/profile/edit" className={buttonVariants({ variant: 'outline' })}>
                  <Pencil data-icon="inline-start" aria-hidden="true" />
                  Edit profile
                </Link>
              ) : (
                <MessageStarter
                  otherId={id}
                  otherFirstName={profile.first_name ?? 'there'}
                  otherCompany={displayCompany}
                  viewerFirstName={viewerProfile?.first_name ?? ''}
                />
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {limitedProfile && (
        <p className="rounded-lg bg-muted/60 px-4 py-3 text-sm text-muted-foreground">
          {isOwnProfile
            ? 'Your profile is empty. Add a bio, your job, and a contact method so brothers can find and reach you.'
            : `${profile.first_name} hasn't shared more yet, or has limited who can see it. You can still send a message.`}
        </p>
      )}

      {hasBio && (
        <Card>
          <CardHeader>
            <CardTitle as="h2" className="heading-4">
              About
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed whitespace-pre-line">{profile.bio}</p>
          </CardContent>
        </Card>
      )}

      {hasExperience && (
        <Card>
          <CardHeader>
            <CardTitle as="h2" className="heading-4 flex items-center gap-2">
              <Building2 className="size-4 text-muted-foreground" aria-hidden="true" /> Experience
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="relative space-y-5 border-l border-border pl-5">
              {sortedPositions.map((pos) => {
                const company = (pos as { companies?: { name?: string } }).companies?.name
                const field = (pos as { industries?: { name?: string } }).industries?.name
                return (
                  <li key={pos.id} className="relative">
                    <span
                      aria-hidden="true"
                      className={cn(
                        'absolute top-1.5 -left-[1.4375rem] size-2.5 rounded-full ring-4 ring-card',
                        pos.is_current ? 'bg-primary' : 'bg-border'
                      )}
                    />
                    <p className="font-medium">{pos.title}</p>
                    {company && <p className="text-sm text-foreground/80">{company}</p>}
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {pos.start_year ?? '—'} – {pos.is_current ? 'Present' : (pos.end_year ?? '—')}
                      {field ? ` · ${field}` : ''}
                    </p>
                  </li>
                )
              })}
            </ol>
          </CardContent>
        </Card>
      )}

      {visibleContact && contact && (
        <Card>
          <CardHeader>
            <CardTitle as="h2" className="heading-4">
              Contact
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="divide-y divide-border">
              {contact.show_email && contact.email && (
                <ContactRow kind="email" label="Email" value={contact.email} href={`mailto:${contact.email}`} />
              )}
              {contact.show_phone && contact.phone && (
                <ContactRow kind="phone" label="Phone" value={contact.phone} href={`tel:${contact.phone}`} />
              )}
              {contact.show_linkedin && contact.linkedin_url && (
                <ContactRow kind="linkedin" label="LinkedIn" value={contact.linkedin_url} href={contact.linkedin_url} external />
              )}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
