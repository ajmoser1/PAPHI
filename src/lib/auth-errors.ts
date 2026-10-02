/**
 * Supabase Auth returns terse, developer-facing strings. Map the common ones to
 * copy a non-technical member can act on, and always include a next step.
 */
const FRIENDLY_MESSAGES: Array<[RegExp, string]> = [
  [
    /invalid login credentials/i,
    "That email and password don't match. Check both, or use \"Forgot password?\" below.",
  ],
  [/email not confirmed/i, 'Confirm your email first. We can send the link again.'],
  [
    /user already registered|already been registered/i,
    'An account with this email already exists. Sign in instead, or reset your password.',
  ],
  [
    /auth session missing|session.*expired|invalid.*token|otp.*expired/i,
    'This link has expired or was already used. Request a new one below.',
  ],
  [/rate limit|too many requests|over_email_send_rate_limit/i, 'Too many attempts. Wait a minute, then try again.'],
  [/network|fetch failed/i, 'We could not reach the server. Check your connection and try again.'],
]

export type AuthErrorCode = 'email_unconfirmed' | 'already_registered' | 'link_expired'

/** Machine-readable hint so forms can offer a recovery action (resend, sign in, new link). */
export function classifyAuthError(message: string): AuthErrorCode | undefined {
  if (/email not confirmed/i.test(message)) return 'email_unconfirmed'
  if (/already registered|already been registered/i.test(message)) return 'already_registered'
  if (/auth session missing|session.*expired|invalid.*token|otp.*expired/i.test(message)) return 'link_expired'
  return undefined
}

export function formatAuthErrorMessage(message: string): string {
  for (const [pattern, friendly] of FRIENDLY_MESSAGES) {
    if (pattern.test(message)) return friendly
  }

  const normalized = message.toLowerCase()

  const isComplexityError =
    normalized.includes('character of each') ||
    (normalized.includes('password') &&
      normalized.includes('uppercase') &&
      normalized.includes('lowercase') &&
      (normalized.includes('number') || normalized.includes('digit')))

  if (!isComplexityError) {
    return message
  }

  const requirements: string[] = []
  if (message.includes('0123456789') || normalized.includes('digit') || normalized.includes('number')) {
    requirements.push('a number')
  }
  if (message.includes('ABCDEFGHIJKLMNOPQRSTUVWXYZ') || normalized.includes('uppercase')) {
    requirements.push('an uppercase character')
  }
  if (message.includes('abcdefghijklmnopqrstuvwxyz') || normalized.includes('lowercase')) {
    requirements.push('a lowercase character')
  }
  if (message.includes('!@#$') || normalized.includes('symbol')) {
    requirements.push('a symbol')
  }

  if (requirements.length === 0) {
    return 'Your password must include a number, an uppercase character, and a lowercase character.'
  }

  const last = requirements.pop()!
  const rest = requirements.join(', ')
  const list = rest ? `${rest}, and ${last}` : last

  return `Your password must include ${list}.`
}
