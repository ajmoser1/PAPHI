export function getSiteOrigin(): string {
  const url = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
  return url.replace(/\/$/, '')
}

export function inviteRegisterUrl(inviteToken: string, fromProfileId?: string): string {
  const base = `${getSiteOrigin()}/auth/register?invite=${encodeURIComponent(inviteToken)}`
  if (!fromProfileId) return base
  return `${base}&from=${encodeURIComponent(fromProfileId)}`
}
