import { createClient } from '@/lib/supabase/server'

export type MemberProfileRow = {
  id: string
  first_name: string
  last_name: string
  avatar_url: string | null
  bio: string | null
  graduation_year: number | null
  chapter: string | null
  chapter_id: string | null
  role: string
  status: string
  privacy_settings: Record<string, string> | null
  featured_position_id: string | null
}

const MEMBER_PROFILE_SELECT =
  'id, first_name, last_name, avatar_url, bio, graduation_year, chapter, chapter_id, role, status, privacy_settings, featured_position_id'

const MEMBER_PROFILE_SELECT_BASE =
  'id, first_name, last_name, avatar_url, bio, graduation_year, chapter, chapter_id, role, status, privacy_settings'

export async function getMemberProfile(id: string): Promise<MemberProfileRow | null> {
  const supabase = await createClient()

  const { data: full } = await supabase
    .from('profiles')
    .select(MEMBER_PROFILE_SELECT)
    .eq('id', id)
    .single()

  if (full) return full as MemberProfileRow

  const { data: base } = await supabase
    .from('profiles')
    .select(MEMBER_PROFILE_SELECT_BASE)
    .eq('id', id)
    .single()

  if (base) {
    return { ...(base as MemberProfileRow), featured_position_id: null }
  }

  return null
}

export type MemberPositionRow = {
  id: string
  title: string
  is_current: boolean
  start_year: number | null
  end_year: number | null
  companies: { name: string } | null
  industries: { name: string } | null
}

export async function getMemberPositions(profileId: string): Promise<MemberPositionRow[]> {
  const supabase = await createClient()
  const select =
    'id, title, is_current, start_year, end_year, companies(name), industries(name)'

  const { data } = await supabase
    .from('positions')
    .select(select)
    .eq('profile_id', profileId)
    .order('is_current', { ascending: false })
    .order('start_year', { ascending: false })

  return (data as unknown as MemberPositionRow[]) ?? []
}
