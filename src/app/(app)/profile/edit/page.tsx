import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { getOwnProfileRow } from '@/lib/profile'
import { STATUS } from '@/lib/constants'
import { ProfileEditForm } from '@/components/profile/ProfileEditForm'
import { ContactForm } from '@/components/profile/ContactForm'
import { PositionsSection } from '@/components/profile/PositionsSection'
import { AvatarUpload } from '@/components/profile/AvatarUpload'
import { LinkedInImport } from '@/components/profile/LinkedInImport'
import { Separator } from '@/components/ui/separator'

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

  const [profile, { data: contact }, { data: positions }, { data: companies }, { data: industries }] = await Promise.all([
    getOwnProfileRow(),
    supabase
      .from('alumni_contact')
      .select('*')
      .eq('profile_id', user.id)
      .single(),
    supabase
      .from('positions')
      .select('*, companies(id, name), industries(id, name)')
      .eq('profile_id', user.id)
      .order('is_current', { ascending: false })
      .order('start_year', { ascending: false }),
    supabase
      .from('companies')
      .select('id, name, industry_id')
      .eq('status', 'active')
      .order('name'),
    supabase
      .from('industries')
      .select('id, name')
      .order('name'),
  ])

  if (!profile) redirect('/auth/pending')

  let chapterLabel: string | null = null
  if (profile.chapter_id) {
    const adminClient = createAdminClient()
    const { data: chapter } = await adminClient
      .from('chapters')
      .select('name, school_name')
      .eq('id', profile.chapter_id)
      .maybeSingle()
    if (chapter) {
      chapterLabel = chapter.school_name
        ? `${chapter.name} — ${chapter.school_name}`
        : chapter.name
    }
  }

  const isPending = profile.status === STATUS.PENDING_APPROVAL
  const needsSetup =
    profile.status === STATUS.ACTIVE && !profile.profile_setup_completed_at
  const showAdvancedOpen = forceEnrichment || needsSetup
  const essentialsOnly = isPending && !showAdvancedOpen

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-primary tracking-tight">
          {forceContact
            ? 'Add a visible contact method'
            : needsSetup || forceEnrichment
              ? 'Finish your profile'
              : 'Edit Profile'}
        </h1>
        <p className="text-muted-foreground">
          {forceContact
            ? 'Brothers need at least one way to reach you. Save a phone number (visible by default), or add email/LinkedIn and turn visibility on in Settings.'
            : isPending
              ? 'Add the essentials now. Privacy and visibility live in Settings.'
              : needsSetup || forceEnrichment
                ? 'Add work and contact details. Adjust privacy in Settings when you are ready.'
                : 'Update the information brothers see on your profile.'}
        </p>
        <p className="text-sm text-muted-foreground mt-2">
          <Link href="/settings" className="underline underline-offset-2">
            Open Settings
          </Link>{' '}
          for privacy, contact visibility, and search preferences.
        </p>
      </div>

      <AvatarUpload avatarUrl={profile.avatar_url} />

      <Separator />

      <ProfileEditForm
        profile={{
          first_name: profile.first_name ?? '',
          last_name: profile.last_name ?? '',
          bio: profile.bio,
          graduation_year: profile.graduation_year,
        }}
        chapterLabel={chapterLabel}
      />

      <Separator />
      <div>
        <h2 className="text-lg font-semibold mb-1">Work Experience</h2>
        {positions && positions.length > 1 && (
          <p className="text-sm text-muted-foreground mb-4">
            Choose which job appears on your profile and in member search results.
          </p>
        )}
        {(!positions || positions.length <= 1) && <div className="mb-4" />}
        <PositionsSection
          positions={positions ?? []}
          companies={companies ?? []}
          industries={industries ?? []}
          featuredPositionId={profile.featured_position_id}
          essentialsOnly={essentialsOnly}
        />
      </div>

      <Separator />
      <div>
        <h2 className="text-lg font-semibold mb-4">Contact Information</h2>
        <ContactForm
          contact={
            contact
              ? {
                  email: contact.email,
                  phone: contact.phone,
                  linkedin_url: contact.linkedin_url,
                  show_email: contact.show_email ?? false,
                  show_phone: contact.show_phone ?? false,
                  show_linkedin: contact.show_linkedin ?? false,
                }
              : null
          }
        />
      </div>

      {essentialsOnly && (
        <>
          <Separator />
          <details className="rounded-lg border bg-white group">
            <summary className="cursor-pointer list-none px-4 py-3 font-medium text-sm flex items-center justify-between">
              <span>Add more later</span>
              <span className="text-muted-foreground text-xs group-open:hidden">LinkedIn import</span>
              <span className="text-muted-foreground text-xs hidden group-open:inline">Hide</span>
            </summary>
            <div className="border-t px-4 py-4 space-y-4">
              <p className="text-sm text-muted-foreground">
                Optional for now. Privacy and who can see your contact info are in{' '}
                <Link href="/settings" className="underline underline-offset-2">
                  Settings
                </Link>
                .
              </p>
              <div className="space-y-2">
                <h3 className="text-base font-semibold">Import from LinkedIn</h3>
                <LinkedInImport industries={industries ?? []} />
              </div>
            </div>
          </details>
        </>
      )}
    </div>
  )
}
