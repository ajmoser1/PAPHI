import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { getOwnProfileRow } from '@/lib/profile'
import { STATUS, isAdminRole } from '@/lib/constants'
import { hasVisibleContact } from '@/lib/contact'
import { ProfileForm } from '@/components/profile/ProfileForm'
import { PositionsSection } from '@/components/profile/PositionsSection'
import { AvatarUpload } from '@/components/profile/AvatarUpload'
import { PageHeader } from '@/components/layout/PageHeader'
import { StepIndicator } from '@/components/forms/StepIndicator'
import { CompletenessBar, type CompletenessItem } from '@/components/forms/CompletenessBar'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { buttonVariants } from '@/components/ui/button'

export default async function ProfileEditPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const raw = await searchParams
  const setupParam = Array.isArray(raw.setup) ? raw.setup[0] : raw.setup
  const contactParam = Array.isArray(raw.contact) ? raw.contact[0] : raw.contact
  const forceEnrichment = setupParam === '1'
  const forceContact = contactParam === '1'

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const [profile, { data: contact }, { data: positions }, { data: companies }, { data: industries }, dismissedRow] = await Promise.all([
    getOwnProfileRow(),
    supabase.from('alumni_contact').select('*').eq('profile_id', user.id).maybeSingle(),
    supabase
      .from('positions')
      .select('*, companies(id, name), industries(id, name)')
      .eq('profile_id', user.id)
      .order('is_current', { ascending: false })
      .order('start_year', { ascending: false }),
    supabase.from('companies').select('id, name, industry_id').eq('status', 'active').order('name'),
    supabase.from('industries').select('id, name').order('name'),
    // Tolerates the column not existing yet (migration pending): then the card always shows.
    supabase.from('profiles').select('profile_completeness_dismissed_at').eq('id', user.id).maybeSingle(),
  ])

  if (!profile) redirect('/auth/pending')
  const completenessDismissed = Boolean(!dismissedRow.error && dismissedRow.data?.profile_completeness_dismissed_at)

  let chapterLabel: string | null = null
  if (profile.chapter_id) {
    const { data: chapter } = await createAdminClient().from('chapters').select('name, school_name').eq('id', profile.chapter_id).maybeSingle()
    if (chapter) chapterLabel = chapter.school_name ? `${chapter.name} — ${chapter.school_name}` : chapter.name
  }

  const isPending = profile.status === STATUS.PENDING_APPROVAL
  const needsSetup = profile.status === STATUS.ACTIVE && !profile.profile_setup_completed_at
  const setupMode = isPending || needsSetup || forceEnrichment
  const initials = `${profile.first_name?.[0] ?? ''}${profile.last_name?.[0] ?? ''}`.toUpperCase() || '?'

  const items: CompletenessItem[] = [
    { id: 'photo', label: 'Add a photo', done: Boolean(profile.avatar_url), href: '#photo', why: 'Required. Brothers recognize faces.' },
    { id: 'job', label: 'Add your current job', done: (positions?.length ?? 0) > 0, href: '#experience', why: 'Brothers search by company and field.' },
    { id: 'contact', label: 'Show a way to reach you', done: hasVisibleContact(contact), href: '#contact', why: 'So a brother can follow up after a message.' },
    { id: 'bio', label: 'Write a short bio', done: Boolean(profile.bio?.trim()), href: '#basics', why: 'One line about what you do and how you can help.' },
  ]

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        eyebrow={setupMode ? undefined : 'My profile'}
        title={
          forceContact
            ? 'Add a visible contact method'
            : setupMode
              ? 'Make yourself findable'
              : 'Edit profile'
        }
        description={
          forceContact
            ? 'Brothers need at least one way to reach you. Tick "Visible to members" on your phone, email, or LinkedIn.'
            : isPending
              ? 'A photo and your current job help your chapter admin recognize you and approve you faster.'
              : setupMode
                ? 'This is what brothers see when they find you. Photo, job, and a way to reach you are the essentials.'
                : 'This is what brothers see when they find you.'
        }
        actions={
          !isPending ? (
            <Link href={`/members/${user.id}`} className={buttonVariants({ variant: 'outline' })}>
              View as a brother
            </Link>
          ) : undefined
        }
      />

      {setupMode && (
        <StepIndicator steps={['Create your account', 'Your chapter', 'Make yourself findable']} current={3} />
      )}

      {!(completenessDismissed && items.every((i) => i.done)) && <CompletenessBar items={items} />}

      <Card id="photo">
        <CardHeader>
          <CardTitle as="h2" className="heading-4">
            Photo
          </CardTitle>
          <CardDescription>Every member has one. It is the first thing a brother sees.</CardDescription>
        </CardHeader>
        <CardContent>
          <AvatarUpload avatarUrl={profile.avatar_url} initials={initials} />
        </CardContent>
      </Card>

      <ProfileForm
        profile={{
          first_name: profile.first_name ?? '',
          last_name: profile.last_name ?? '',
          bio: profile.bio,
          graduation_year: profile.graduation_year,
        }}
        contact={
          contact
            ? {
                email: contact.email,
                phone: contact.phone,
                linkedin_url: contact.linkedin_url,
                show_email: contact.show_email ?? false,
                show_phone: contact.show_phone ?? true,
                show_linkedin: contact.show_linkedin ?? false,
              }
            : null
        }
        chapterLabel={chapterLabel}
        contactRequired={!isAdminRole(profile.role)}
      />

      <Card id="experience">
        <CardHeader>
          <CardTitle as="h2" className="heading-4">
            Experience
          </CardTitle>
          <CardDescription>
            {positions && positions.length > 1
              ? 'Each job saves on its own. The featured one shows on your card in search.'
              : 'Each job saves on its own. Add your current role first.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PositionsSection
            positions={positions ?? []}
            companies={companies ?? []}
            industries={industries ?? []}
            featuredPositionId={profile.featured_position_id}
            essentialsOnly={isPending}
          />
        </CardContent>
      </Card>

      <p className="text-sm text-muted-foreground">
        Who can find you in search and who sees your bio live in{' '}
        <Link href="/settings" className="font-medium text-primary underline-offset-4 hover:underline">
          Settings
        </Link>
        .
        {isPending && (
          <>
            {' '}
            Done for now?{' '}
            <Link href="/members" className="font-medium text-primary underline-offset-4 hover:underline">
              Go to Find a Brother
            </Link>
            .
          </>
        )}
      </p>
    </div>
  )
}
