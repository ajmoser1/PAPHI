import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AppShell } from '@/components/layout/AppShell'
import { TenantTheme } from '@/components/layout/TenantTheme'
import { getTenantContext, getBrandingForUser } from '@/lib/tenant'
import { getOwnProfileForApp } from '@/lib/profile'
import { getUxPreviewModeForRole } from '@/lib/ux-preview'
import { getUnreadConversations, totalUnread } from '@/lib/unread'
import { ROLES, STATUS } from '@/lib/constants'
import {
  ALUMNI_CONTACT_VISIBLE_SELECT,
  hasVisibleContact,
} from '@/lib/contact'

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login')

  const profile = await getOwnProfileForApp()

  if (!profile) redirect('/auth/pending')
  // Use real suspended status: preview never overlays suspended.
  if (profile.status === 'suspended') redirect('/auth/pending')

  const tenant = await getTenantContext()

  let userChapter = null
  if (profile.chapter_id) {
    const { data } = await supabase
      .from('chapters')
      .select('id, slug, name, school_name, display_title, tagline, logo_url, crest_url, primary_color, accent_color, fraternity_id')
      .eq('id', profile.chapter_id)
      .single()
    userChapter = data
  }

  const branding = getBrandingForUser(tenant, profile, userChapter)

  const isMemberRole =
    profile.role === ROLES.UNDERGRAD || profile.role === ROLES.ALUMNI

  const { data: contact } =
    profile.status === STATUS.ACTIVE && isMemberRole
      ? await supabase
          .from('alumni_contact')
          .select(ALUMNI_CONTACT_VISIBLE_SELECT)
          .eq('profile_id', user.id)
          .maybeSingle()
      : { data: null }

  const forceVisibleContact =
    profile.status === STATUS.ACTIVE && isMemberRole && !hasVisibleContact(contact)

  // Photos are mandatory for every active member. The dialog gates the app
  // (except Profile and Settings) until one is uploaded.
  const needsPhoto = profile.status === STATUS.ACTIVE && isMemberRole && !profile.avatar_url

  const needsProfileSetup =
    profile.status === STATUS.ACTIVE &&
    isMemberRole &&
    !forceVisibleContact &&
    !profile.profile_setup_completed_at

  const uxPreviewMode = await getUxPreviewModeForRole(profile.role)
  const unreadCount =
    profile.status === STATUS.ACTIVE ? totalUnread(await getUnreadConversations()) : 0

  return (
    <>
      <TenantTheme primaryColor={branding.primaryColor} accentColor={branding.accentColor} />
      <AppShell
        user={{
          firstName: profile.first_name ?? '',
          lastName: profile.last_name ?? '',
          avatarUrl: profile.avatar_url,
          role: profile.role,
        }}
        status={profile.status}
        brand={{ title: branding.title, logoUrl: branding.logoUrl }}
        showFounderLink={profile.role === ROLES.FOUNDER}
        unreadCount={unreadCount}
        needsProfileSetup={needsProfileSetup}
        needsPhoto={needsPhoto}
        forceVisibleContact={forceVisibleContact}
        uxPreviewMode={uxPreviewMode}
      >
        {children}
      </AppShell>
    </>
  )
}
