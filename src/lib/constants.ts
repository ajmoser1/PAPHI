export const ROLES = {
  UNDERGRAD: 'undergrad',
  ALUMNI: 'alumni',
  ADMIN: 'admin',
  CHAPTER_ADMIN: 'chapter_admin',
  FOUNDER: 'founder',
  PENDING: 'pending',
} as const

export type Role = typeof ROLES[keyof typeof ROLES]

export const STATUS = {
  PENDING_APPROVAL: 'pending_approval',
  ACTIVE: 'active',
  SUSPENDED: 'suspended',
} as const

export type Status = typeof STATUS[keyof typeof STATUS]

export const SEARCH_SCOPE = {
  FRATERNITY: 'fraternity',
  CHAPTER: 'chapter',
} as const

export type SearchScope = typeof SEARCH_SCOPE[keyof typeof SEARCH_SCOPE]

export const VISIBILITY_SCOPE = {
  CHAPTER: 'chapter',
  FRATERNITY: 'fraternity',
  HIDDEN: 'hidden',
} as const

export type VisibilityScope = typeof VISIBILITY_SCOPE[keyof typeof VISIBILITY_SCOPE]

export const PRIVACY_AUDIENCE = {
  CHAPTER: 'chapter',
  FRATERNITY: 'fraternity',
  HIDDEN: 'hidden',
} as const

export type PrivacyAudience = typeof PRIVACY_AUDIENCE[keyof typeof PRIVACY_AUDIENCE]

export const DEFAULT_PRIVACY_SETTINGS = {
  show_contact_to: PRIVACY_AUDIENCE.FRATERNITY,
  show_positions_to: PRIVACY_AUDIENCE.FRATERNITY,
  show_bio_to: PRIVACY_AUDIENCE.FRATERNITY,
} as const

export function isActive(status: string): boolean {
  return status === STATUS.ACTIVE
}

export function isGhost(status: string): boolean {
  return status === STATUS.PENDING_APPROVAL
}

export function isAdminRole(role: string): boolean {
  return role === ROLES.ADMIN || role === ROLES.CHAPTER_ADMIN || role === ROLES.FOUNDER
}

export function isFounder(role: string): boolean {
  return role === ROLES.FOUNDER
}

export function isChapterAdmin(role: string): boolean {
  return role === ROLES.CHAPTER_ADMIN || role === ROLES.ADMIN || role === ROLES.FOUNDER
}

export const COMPANY_STATUS = {
  ACTIVE: 'active',
  SUGGESTED: 'suggested',
  REJECTED: 'rejected',
} as const
