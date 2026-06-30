import { getChapterSlugFromHost } from '@/lib/tenant'

const CHAPTER_SLUG_COOKIE = 'chapter_slug'

export function resolveChapterSlug(request: { headers: Headers; cookies: { get: (n: string) => { value: string } | undefined } }): string | null {
  const host = request.headers.get('host') ?? ''
  const hostSlug = getChapterSlugFromHost(host)
  if (hostSlug) return hostSlug
  return request.cookies.get(CHAPTER_SLUG_COOKIE)?.value ?? null
}
