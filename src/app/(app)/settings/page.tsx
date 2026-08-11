import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getOwnProfileRow } from '@/lib/profile'
import { PrivacySettingsForm } from '@/components/profile/PrivacySettingsForm'
import { ContactVisibilityForm } from '@/components/settings/ContactVisibilityForm'
import { SearchScopeSettingsForm } from '@/components/settings/SearchScopeSettingsForm'
import { AccountSettingsCard } from '@/components/settings/AccountSettingsCard'
import { Separator } from '@/components/ui/separator'

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
    <div className="max-w-2xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-primary tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Control how you appear to brothers and how Find a Brother searches by default.
        </p>
      </div>

      <PrivacySettingsForm
        visibilityScope={profile.visibility_scope ?? 'fraternity'}
        privacySettings={profile.privacy_settings ?? {}}
      />

      <Separator />

      <ContactVisibilityForm
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

      <Separator />

      <SearchScopeSettingsForm currentScope={profile.search_scope ?? 'fraternity'} />

      <Separator />

      <AccountSettingsCard email={user.email ?? null} />
    </div>
  )
}
