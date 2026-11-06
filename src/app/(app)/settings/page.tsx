import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getOwnProfileRow } from '@/lib/profile'
import { getFeedbackEmail, getFeedbackMailtoUrl } from '@/lib/feedback'
import { PageHeader } from '@/components/layout/PageHeader'
import { VisibilitySettings } from '@/components/settings/VisibilitySettings'
import { AccountSettings } from '@/components/settings/AccountSettings'

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
  const privacy = profile.privacy_settings ?? {}

  return (
    <div className="mx-auto max-w-3xl space-y-10">
      <PageHeader title="Settings" description="Who can find you, what they see, and your sign-in details. Everything here saves automatically." />

      <VisibilitySettings
        visibilityScope={profile.visibility_scope ?? 'fraternity'}
        showContactTo={privacy.show_contact_to ?? 'fraternity'}
        showBioTo={privacy.show_bio_to ?? 'fraternity'}
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

      <AccountSettings
        email={user.email ?? null}
        searchScope={profile.search_scope ?? 'fraternity'}
        feedbackEmail={getFeedbackEmail()}
        feedbackMailto={getFeedbackMailtoUrl()}
      />
    </div>
  )
}
