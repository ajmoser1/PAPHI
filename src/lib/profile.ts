import { createClient } from '@/lib/supabase/server'
import { SEARCH_SCOPE } from '@/lib/constants'

export type AppShellProfile = {
  first_name: string | null
  last_name: string | null
  role: string
  status: string
  chapter_id: string | null
  search_scope: string
}

export async function getOwnProfileForApp(): Promise<AppShellProfile | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data: full } = await supabase
    .from('profiles')
    .select('first_name, last_name, role, status, chapter_id, search_scope')
    .eq('id', user.id)
    .single()

  if (full) return full

  const { data: minimal } = await supabase
    .from('profiles')
    .select('first_name, last_name, role, status')
    .eq('id', user.id)
    .single()

  if (!minimal) return null

  return {
    ...minimal,
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
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data: full } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  if (full) return full as ProfileEditRow

  const { data: minimal } = await supabase
    .from('profiles')
    .select(
      'id, first_name, last_name, role, status, chapter_id, avatar_url, bio, graduation_year, chapter, linkedin_url, visibility_scope, privacy_settings, search_scope'
    )
    .eq('id', user.id)
    .single()

  return (minimal as ProfileEditRow) ?? null
}
