import { createClient, createAdminClient } from '@/lib/supabase/server'
import { SEARCH_SCOPE } from '@/lib/constants'

export type AppShellProfile = {
  first_name: string | null
  last_name: string | null
  role: string
  status: string
  chapter_id: string | null
  search_scope: string
}

const APP_PROFILE_SELECT =
  'first_name, last_name, role, status, chapter_id, search_scope' as const

const PROFILE_EDIT_SELECT =
  'id, first_name, last_name, role, status, chapter_id, avatar_url, bio, graduation_year, chapter, linkedin_url, visibility_scope, privacy_settings, search_scope' as const

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

  if (profile) return profile

  const { data: adminProfile } = await createAdminClient()
    .from('profiles')
    .select(select)
    .eq('id', userId)
    .single()

  return adminProfile
}

export async function getOwnProfileForApp(): Promise<AppShellProfile | null> {
  const row = await fetchOwnProfileRow(APP_PROFILE_SELECT)
  if (row) return row as AppShellProfile

  const minimal = await fetchOwnProfileRow('first_name, last_name, role, status')
  if (!minimal) return null

  return {
    first_name: (minimal.first_name as string | null) ?? null,
    last_name: (minimal.last_name as string | null) ?? null,
    role: minimal.role as string,
    status: minimal.status as string,
    chapter_id: null,
    search_scope: SEARCH_SCOPE.FRATERNITY,
  }
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
  linkedin_url: string | null
  visibility_scope: string | null
  privacy_settings: Record<string, string> | null
  search_scope: string | null
}

export async function getOwnProfileRow(): Promise<ProfileEditRow | null> {
  const row = await fetchOwnProfileRow(PROFILE_EDIT_SELECT)
  if (row) return row as ProfileEditRow

  const minimal = await fetchOwnProfileRow(
    'id, first_name, last_name, role, status, chapter_id, avatar_url, bio, graduation_year, chapter'
  )
  if (!minimal) return null

  return {
    ...(minimal as ProfileEditRow),
    linkedin_url: null,
    visibility_scope: 'fraternity',
    privacy_settings: null,
    search_scope: SEARCH_SCOPE.FRATERNITY,
  }
}
