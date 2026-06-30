export function getSiteOrigin(): string {
  const url = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
  return url.replace(/\/$/, '')
}

export function inviteRegisterUrl(inviteToken: string): string {
  return `${getSiteOrigin()}/auth/register?invite=${inviteToken}`
}
