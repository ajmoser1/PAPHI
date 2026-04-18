export const ROLES = {
  UNDERGRAD: 'undergrad',
  ALUMNI: 'alumni',
  ADMIN: 'admin',
  PENDING: 'pending',
} as const

export type Role = typeof ROLES[keyof typeof ROLES]

export const STATUS = {
  PENDING_APPROVAL: 'pending_approval',
  ACTIVE: 'active',
  SUSPENDED: 'suspended',
} as const

export type Status = typeof STATUS[keyof typeof STATUS]

export const COMPANY_STATUS = {
  ACTIVE: 'active',
  SUGGESTED: 'suggested',
  REJECTED: 'rejected',
} as const
