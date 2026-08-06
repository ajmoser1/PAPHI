import { createAdminClient } from '@/lib/supabase/server'

export type PlatformStats = {
  userCount: number
  chapterCount: number
  companyCount: number
}

const EMPTY_STATS: PlatformStats = {
  userCount: 0,
  chapterCount: 0,
  companyCount: 0,
}

export async function getPlatformStats(): Promise<PlatformStats> {
  const supabase = createAdminClient()
  const { data, error } = await supabase.rpc('get_platform_stats')

  if (error || !data?.[0]) {
    return EMPTY_STATS
  }

  const row = data[0]
  return {
    userCount: Number(row.user_count ?? 0),
    chapterCount: Number(row.chapter_count ?? 0),
    companyCount: Number(row.company_count ?? 0),
  }
}
