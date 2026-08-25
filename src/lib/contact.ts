/** Contact fields used for the “at least one visible to members” rule. */
export type VisibleContactInput = {
  email?: string | null
  phone?: string | null
  linkedin_url?: string | null
  show_email?: boolean | null
  show_phone?: boolean | null
  show_linkedin?: boolean | null
}

export function hasVisibleContact(contact: VisibleContactInput | null | undefined): boolean {
  if (!contact) return false
  const email = contact.email?.trim()
  const phone = contact.phone?.trim()
  const linkedin = contact.linkedin_url?.trim()
  return Boolean(
    (email && contact.show_email) ||
      (phone && contact.show_phone) ||
      (linkedin && contact.show_linkedin)
  )
}

export const VISIBLE_CONTACT_REQUIRED_MESSAGE =
  'Show at least one contact method to members (email, phone, or LinkedIn).'

export const CONTACT_REQUIRED_FOR_APPROVAL_MESSAGE =
  'This member must finish signup and show at least one contact method (email, phone, or LinkedIn) before you can approve them.'

/** Columns needed to evaluate the visible-contact rule. */
export const ALUMNI_CONTACT_VISIBLE_SELECT =
  'email, phone, linkedin_url, show_email, show_phone, show_linkedin' as const
