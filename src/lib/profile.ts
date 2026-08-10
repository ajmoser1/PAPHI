import { createClient, createAdminClient } from '@/lib/supabase/server'
import { SEARCH_SCOPE } from '@/lib/constants'
import { applyUxPreviewToProfile, getUxPreviewModeForRole } from '@/lib/ux-preview'

export type AppShellProfile = {
  first_name: string | null
  last_name: string | null
  role: string
  status: string
  chapter_id: string | null
  search_scope: string
  profile_setup_completed_at: string | null
}

const APP_PROFILE_SELECT =
  'first_name, last_name, role, status, chapter_id, search_scope, profile_setup_completed_at' as const

const PROFILE_EDIT_SELECT =
  'id, first_name, last_name, role, status, chapter_id, avatar_url, bio, graduation_year, chapter, visibility_scope, privacy_settings, search_scope, featured_position_id, profile_setup_completed_at' as const

async function getAuthenticatedUserId(): Promise<string | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user?.id ?? null
}

async function fetchOwnProfileRow<T extends string>(
  select: T
): Promise<Record<string, unknown> | null> {
  const userId = await getAuthenticatedUserId()
  if (!userId) return null

  const supabase = await createClient()
  const { data: profile } = await supabase
    .from('profiles')
    .select(select)
    .eq('id', userId)
    .single()

  if (profile) return profile as Record<string, unknown>

  const { data: adminProfile, error: adminError } = await createAdminClient()
    .from('profiles')
    .select(select)
    .eq('id', userId)
    .single()

  if (adminProfile) return adminProfile as Record<string, unknown>

  // Older DBs may not have profile_setup_completed_at yet — retry without it.
  if (
    select.includes('profile_setup_completed_at') &&
    (adminError?.message?.includes('profile_setup_completed_at') ||
      adminError?.code === '42703')
  ) {
    const fallbackSelect = select
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s !== 'profile_setup_completed_at')
      .join(', ')
    const { data: fallback } = await createAdminClient()
      .from('profiles')
      .select(fallbackSelect)
      .eq('id', userId)
      .single()
    if (fallback) {
      return { ...fallback, profile_setup_completed_at: null } as Record<string, unknown>
    }
  }

  return null
}

export async function getOwnProfileForApp(): Promise<AppShellProfile | null> {
  const row = await fetchOwnProfileRow(APP_PROFILE_SELECT)
  let profile: AppShellProfile | null = row ? (row as AppShellProfile) : null

  if (!profile) {
    const minimal = await fetchOwnProfileRow('first_name, last_name, role, status')
    if (!minimal) return null
    profile = {
      first_name: (minimal.first_name as string | null) ?? null,
      last_name: (minimal.last_name as string | null) ?? null,
      role: minimal.role as string,
      status: minimal.status as string,
      chapter_id: null,
      search_scope: SEARCH_SCOPE.FRATERNITY,
      profile_setup_completed_at: null,
    }
  }

  const mode = await getUxPreviewModeForRole(profile.role)
  return applyUxPreviewToProfile(profile, mode)
}

export type ProfileEditRow = {
  id: string
  first_name: string | null
  last_name: string | null
  role: string
  status: string
  chapter_id: string | null
  avatar_url: string | null
  bio: string | null
  graduation_year: number | null
  chapter: string | null
  visibility_scope: string | null
  privacy_settings: Record<string, string> | null
  search_scope: string | null
  featured_position_id: string | null
  profile_setup_completed_at: string | null
}

export async function getOwnProfileRow(): Promise<ProfileEditRow | null> {
  const row = await fetchOwnProfileRow(PROFILE_EDIT_SELECT)
  let profile: ProfileEditRow | null = row ? (row as ProfileEditRow) : null

  if (!profile) {
    const minimal = await fetchOwnProfileRow(
      'id, first_name, last_name, role, status, chapter_id, avatar_url, bio, graduation_year, chapter'
    )
    if (!minimal) return null
    profile = {
      ...(minimal as ProfileEditRow),
      visibility_scope: 'fraternity',
      privacy_settings: null,
      search_scope: SEARCH_SCOPE.FRATERNITY,
      featured_position_id: null,
      profile_setup_completed_at: null,
    }
  }

  const mode = await getUxPreviewModeForRole(profile.role)
  return applyUxPreviewToProfile(profile, mode)
}
