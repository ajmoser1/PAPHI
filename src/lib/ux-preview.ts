// Server-only half: reads the cookie. Everything that is safe for client
// components and the proxy lives in ux-preview-shared.ts.
import { cookies } from 'next/headers'
import { ROLES } from '@/lib/constants'
import { parseUxPreviewMode, UX_PREVIEW_COOKIE, type UxPreviewMode } from '@/lib/ux-preview-shared'

export * from '@/lib/ux-preview-shared'

export async function getUxPreviewModeForRole(
  role: string | null | undefined
): Promise<UxPreviewMode | null> {
  if (role !== ROLES.FOUNDER) return null
  const jar = await cookies()
  return parseUxPreviewMode(jar.get(UX_PREVIEW_COOKIE)?.value)
}
