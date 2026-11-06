import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { getOwnProfileRow } from '@/lib/profile'
import { STATUS, isAdminRole } from '@/lib/constants'
import { hasVisibleContact } from '@/lib/contact'
import { ProfileForm } from '@/components/profile/ProfileForm'
import { PositionsSection } from '@/components/profile/PositionsSection'
import { PageHeader } from '@/components/layout/PageHeader'
import { StepIndicator } from '@/components/forms/StepIndicator'
import { CompletenessBar, type CompletenessItem } from '@/components/forms/CompletenessBar'
import { Section } from '@/components/layout/Section'
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
    { id: 'photo', label: 'Add a photo', done: Boolean(profile.avatar_url), href: '#photo' },
    { id: 'job', label: 'Add your current job', done: (positions?.length ?? 0) > 0, href: '#experience' },
    { id: 'contact', label: 'Show a way to reach you', done: hasVisibleContact(contact), href: '#contact' },
    { id: 'bio', label: 'Write a short bio', done: Boolean(profile.bio?.trim()), href: '#basics' },
  ]

  return (
    <div className="mx-auto max-w-3xl space-y-10">
      <PageHeader
        eyebrow={setupMode ? undefined : 'My profile'}
        title={
          forceContact
            ? 'Add a visible contact method'
            : setupMode
              ? 'Make yourself findable'
              : 'Edit profile'
        }
        description={forceContact ? 'Switch on at least one way for brothers to reach you.' : undefined}
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

      <ProfileForm
        avatarUrl={profile.avatar_url}
        initials={initials}
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

      <Section id="experience" title="Experience">
          <PositionsSection
            positions={positions ?? []}
            companies={companies ?? []}
            industries={industries ?? []}
            featuredPositionId={profile.featured_position_id}
            essentialsOnly={isPending}
          />
      </Section>

      <p className="text-sm text-muted-foreground">
        <Link href="/settings" className="font-medium text-primary underline-offset-4 hover:underline">
          Privacy settings
        </Link>
        {isPending && (
          <>
            {' · '}
            <Link href="/members" className="font-medium text-primary underline-offset-4 hover:underline">
              Find a Brother
            </Link>
          </>
        )}
      </p>
    </div>
  )
}
