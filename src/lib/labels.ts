import { ROLES, STATUS, COMPANY_STATUS } from '@/lib/constants'

/** Human labels for enum values stored in the database. Never show raw values to members. */
export function roleLabel(role: string): string {
  switch (role) {
    case ROLES.UNDERGRAD:
      return 'Undergrad'
    case ROLES.ALUMNI:
      return 'Alumni'
    case ROLES.CHAPTER_ADMIN:
      return 'Chapter admin'
    case ROLES.ADMIN:
      return 'Admin'
    case ROLES.FOUNDER:
      return 'Founder'
    case ROLES.PENDING:
      return 'Pending'
    default:
      return role
  }
}

export function statusLabel(status: string): string {
  switch (status) {
    case STATUS.ACTIVE:
      return 'Active'
    case STATUS.PENDING_APPROVAL:
      return 'Pending approval'
    case STATUS.SUSPENDED:
      return 'Suspended'
    default:
      return status
  }
}

export function companyStatusLabel(status: string): string {
  switch (status) {
    case COMPANY_STATUS.ACTIVE:
      return 'Active'
    case COMPANY_STATUS.SUGGESTED:
      return 'Suggested'
    case COMPANY_STATUS.REJECTED:
      return 'Rejected'
    default:
      return status
  }
}
