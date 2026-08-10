import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AppShell } from '@/components/layout/AppShell'
import { TenantTheme } from '@/components/layout/TenantTheme'
import { getTenantContext, getBrandingForUser } from '@/lib/tenant'
import { getOwnProfileForApp } from '@/lib/profile'
import { getChapterAdminContacts } from '@/lib/chapter-admins'
import { getUxPreviewModeForRole } from '@/lib/ux-preview'
import { ROLES, STATUS } from '@/lib/constants'

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

  const isPending = profile.status === STATUS.PENDING_APPROVAL
  const needsProfileSetup =
    profile.status === STATUS.ACTIVE && !profile.profile_setup_completed_at

  const adminContacts = isPending
    ? await getChapterAdminContacts(profile.chapter_id)
    : null

  const uxPreviewMode = await getUxPreviewModeForRole(profile.role)

  return (
    <>
      <TenantTheme primaryColor={branding.primaryColor} accentColor={branding.accentColor} />
      <AppShell
        role={profile.role}
        firstName={profile.first_name ?? ''}
        status={profile.status}
        brandTitle={branding.title}
        searchScope={profile.search_scope ?? 'fraternity'}
        showFounderLink={profile.role === ROLES.FOUNDER}
        needsProfileSetup={needsProfileSetup}
        adminContacts={adminContacts}
        uxPreviewMode={uxPreviewMode}
      >
        {children}
      </AppShell>
    </>
  )
}
