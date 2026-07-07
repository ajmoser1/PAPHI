export function formatAuthErrorMessage(message: string): string {
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
