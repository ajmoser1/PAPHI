import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getOwnProfileRow } from '@/lib/profile'
import { ProfileEditForm } from '@/components/profile/ProfileEditForm'
import { ContactForm } from '@/components/profile/ContactForm'
import { PositionsSection } from '@/components/profile/PositionsSection'
import { AvatarUpload } from '@/components/profile/AvatarUpload'
import { PrivacySettingsForm } from '@/components/profile/PrivacySettingsForm'
import { Separator } from '@/components/ui/separator'

export default async function ProfileEditPage() {
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

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-primary tracking-tight">Edit Profile</h1>
        <p className="text-muted-foreground">Update your information visible to other members.</p>
      </div>

      <AvatarUpload avatarUrl={profile.avatar_url} />

      <Separator />

      <ProfileEditForm
        profile={{
          first_name: profile.first_name ?? '',
          last_name: profile.last_name ?? '',
          bio: profile.bio,
          graduation_year: profile.graduation_year,
          chapter: profile.chapter,
        }}
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
        />
      </div>
      <Separator />
      <div>
        <h2 className="text-lg font-semibold mb-4">Contact Information</h2>
        <ContactForm contact={contact} />
      </div>

      <Separator />
      <PrivacySettingsForm
        visibilityScope={profile.visibility_scope ?? 'fraternity'}
        privacySettings={profile.privacy_settings ?? {}}
      />
    </div>
  )
}
