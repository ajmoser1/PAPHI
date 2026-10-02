import { getSiteOrigin } from '@/lib/site'

const DEFAULT_SUBJECT = 'Chapter Connect feedback'

export function getFeedbackEmail(): string | null {
  const email = process.env.NEXT_PUBLIC_FEEDBACK_EMAIL?.trim()
  return email || null
}

export function getFeedbackMailtoUrl(): string | null {
  const email = getFeedbackEmail()
  if (!email) return null

  const params = new URLSearchParams({
    subject: DEFAULT_SUBJECT,
    body: `Hi — I have feedback about Chapter Connect (${getSiteOrigin()}):\n\n`,
  })

  return `mailto:${email}?${params.toString()}`
}
