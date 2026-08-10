import { cookies, headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { SEARCH_SCOPE } from '@/lib/constants'
import { applyUxPreviewToProfile, getUxPreviewModeForRole } from '@/lib/ux-preview'

export type ChapterBranding = {
  id: string
  slug: string
  name: string
  school_name: string | null
  display_title: string | null
  tagline: string | null
  logo_url: string | null
  crest_url: string | null
  primary_color: string | null
  accent_color: string | null
  fraternity_id: string
}

export type FraternityBranding = {
  id: string
  slug: string
  name: string
  logo_url: string | null
  primary_color: string | null
  accent_color: string | null
}

export type TenantContext = {
  chapter: ChapterBranding | null
  fraternity: FraternityBranding | null
  isApex: boolean
  chapterSlug: string | null
}

const CHAPTER_SLUG_COOKIE = 'chapter_slug'

export function getChapterSlugFromHost(host: string): string | null {
  const hostname = host.split(':')[0]
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return null
  }
  // Vercel's own preview/production domains (<project>.vercel.app) are not
  // customer-facing chapter subdomains — those live on the app's own apex
  // domain (e.g. cmu-paphi.yourapp.com). Without this, a project named
  // "paphi" collides with a "paphi" chapter slug lookup on paphi.vercel.app.
  if (hostname.endsWith('.vercel.app')) {
    return null
  }
  const parts = hostname.split('.')
  if (parts.length >= 3 && parts[0] !== 'www') {
    return parts[0]
  }
  return null
}

export async function getTenantContext(): Promise<TenantContext> {
  const headersList = await headers()
  const cookieStore = await cookies()
  const host = headersList.get('host') ?? 'localhost'
  const hostSlug = getChapterSlugFromHost(host)
  const cookieSlug = cookieStore.get(CHAPTER_SLUG_COOKIE)?.value ?? null
  const chapterSlug = hostSlug ?? cookieSlug

  if (!chapterSlug) {
    return { chapter: null, fraternity: null, isApex: true, chapterSlug: null }
  }

  const supabase = await createClient()
  const { data: chapter } = await supabase
    .from('chapters')
    .select(
      'id, slug, name, school_name, display_title, tagline, logo_url, crest_url, primary_color, accent_color, fraternity_id'
    )
    .eq('slug', chapterSlug)
    .eq('status', 'active')
    .single()

  if (!chapter) {
    return { chapter: null, fraternity: null, isApex: true, chapterSlug }
  }

  const { data: fraternity } = await supabase
    .from('fraternities')
    .select('id, slug, name, logo_url, primary_color, accent_color')
    .eq('id', chapter.fraternity_id)
    .single()

  return {
    chapter: chapter as ChapterBranding,
    fraternity: (fraternity as FraternityBranding) ?? null,
    isApex: false,
    chapterSlug,
  }
}

export async function getCurrentUserProfile() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select(
      'id, first_name, last_name, role, status, chapter_id, search_scope, visibility_scope, privacy_settings'
    )
    .eq('id', user.id)
    .single()

  if (!profile) return null

  const mode = await getUxPreviewModeForRole(profile.role)
  return applyUxPreviewToProfile(profile, mode)
}

export async function getSearchFilters(profile: {
  chapter_id: string | null
  search_scope: string
}) {
  const supabase = await createClient()

  if (!profile.chapter_id) {
    return { filter_fraternity_id: null, filter_chapter_id: null, viewer_chapter_id: null }
  }

  const { data: chapter } = await supabase
    .from('chapters')
    .select('fraternity_id')
    .eq('id', profile.chapter_id)
    .single()

  const fraternityId = chapter?.fraternity_id ?? null
  const chapterOnly = profile.search_scope === SEARCH_SCOPE.CHAPTER

  return {
    filter_fraternity_id: fraternityId,
    filter_chapter_id: chapterOnly ? profile.chapter_id : null,
    viewer_chapter_id: profile.chapter_id,
  }
}

export function getBrandingForUser(
  tenant: TenantContext,
  profile: { search_scope: string; chapter_id: string | null } | null,
  userChapter: ChapterBranding | null
) {
  const fraternityWide = profile?.search_scope === SEARCH_SCOPE.FRATERNITY

  if (fraternityWide && tenant.fraternity) {
    return {
      title: tenant.fraternity.name,
      primaryColor: tenant.fraternity.primary_color,
      accentColor: tenant.fraternity.accent_color,
      logoUrl: tenant.fraternity.logo_url,
      mode: 'fraternity' as const,
    }
  }

  const chapter = userChapter ?? tenant.chapter
  if (chapter) {
    return {
      title: chapter.display_title ?? chapter.name,
      primaryColor: chapter.primary_color,
      accentColor: chapter.accent_color,
      logoUrl: chapter.logo_url,
      mode: 'chapter' as const,
    }
  }

  return {
    title: 'Chapter Network',
    primaryColor: null,
    accentColor: null,
    logoUrl: null,
    mode: 'platform' as const,
  }
}
