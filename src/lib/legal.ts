/**
 * Identity details used by the public Privacy Policy and Terms pages.
 * Update these before submitting the pages to Google for OAuth verification.
 */
export const LEGAL = {
  /** Who operates the service, as it should appear in the policies. */
  operatorName: 'Alex Moser',
  /** Where privacy and legal questions go. Falls back to the feedback address. */
  contactEmail: process.env.NEXT_PUBLIC_FEEDBACK_EMAIL?.trim() || 'alexjamoser@example.com',
  /** Governing law for the Terms. The founding chapter is in Pennsylvania. */
  governingLaw: 'the Commonwealth of Pennsylvania, USA',
  effectiveDate: '2026-10-02',
} as const

export function formatEffectiveDate(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  })
}
