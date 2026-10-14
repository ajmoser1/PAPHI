import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getOwnProfileRow } from '@/lib/profile'
import { PrivacySettingsForm } from '@/components/profile/PrivacySettingsForm'
import { ContactVisibilityForm } from '@/components/settings/ContactVisibilityForm'
import { SearchScopeSettingsForm } from '@/components/settings/SearchScopeSettingsForm'
import { AccountSettingsCard } from '@/components/settings/AccountSettingsCard'
import { FeedbackCard } from '@/components/settings/FeedbackCard'
import { PageHeader } from '@/components/layout/PageHeader'

export default async function SettingsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const [profile, { data: contact }] = await Promise.all([
    getOwnProfileRow(),
    supabase.from('alumni_contact').select('*').eq('profile_id', user.id).maybeSingle(),
  ])

  if (!profile) redirect('/auth/pending')

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        title="Settings"
        description="Who can find you, what they see, and your sign-in details."
      />

      <PrivacySettingsForm
        visibilityScope={profile.visibility_scope ?? 'fraternity'}
        privacySettings={profile.privacy_settings ?? {}}
      />


      <ContactVisibilityForm
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
      />


      <SearchScopeSettingsForm currentScope={profile.search_scope ?? 'fraternity'} />


      <AccountSettingsCard email={user.email ?? null} />


      <FeedbackCard />
    </div>
  )
}
