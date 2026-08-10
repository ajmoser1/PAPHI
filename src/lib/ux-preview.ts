import { cookies } from 'next/headers'
import { ROLES } from '@/lib/constants'

export const UX_PREVIEW_COOKIE = 'ux_preview'

export type UxPreviewMode = 'pending' | 'post_approval'

export const UX_PREVIEW_MODES: { id: UxPreviewMode; label: string; description: string }[] = [
  {
    id: 'pending',
    label: 'Pending approval',
    description:
      'Blurred Find a Brother, pending banner, essentials-only profile, Messages hidden.',
  },
  {
    id: 'post_approval',
    label: 'Just approved (finish profile)',
    description:
      'Full directory access with the post-approval “finish your profile” prompt.',
  },
]

export function parseUxPreviewMode(value: string | undefined | null): UxPreviewMode | null {
  if (value === 'pending' || value === 'post_approval') return value
  return null
}

/** Only founders can use preview; ignores the cookie for everyone else. */
export function resolveUxPreviewMode(
  role: string | null | undefined,
  cookieValue: string | undefined | null
): UxPreviewMode | null {
  if (role !== ROLES.FOUNDER) return null
  return parseUxPreviewMode(cookieValue)
}

export async function getUxPreviewModeForRole(
  role: string | null | undefined
): Promise<UxPreviewMode | null> {
  if (role !== ROLES.FOUNDER) return null
  const jar = await cookies()
  return parseUxPreviewMode(jar.get(UX_PREVIEW_COOKIE)?.value)
}

type PreviewableProfile = {
  status: string
  role: string
  profile_setup_completed_at?: string | null
}

/** Overlay status / setup flags for UI without mutating the database. */
export function applyUxPreviewToProfile<T extends PreviewableProfile>(
  profile: T,
  mode: UxPreviewMode | null
): T {
  if (!mode || profile.role !== ROLES.FOUNDER) return profile

  if (mode === 'pending') {
    return {
      ...profile,
      status: 'pending_approval',
    }
  }

  return {
    ...profile,
    status: 'active',
    profile_setup_completed_at: null,
  }
}
