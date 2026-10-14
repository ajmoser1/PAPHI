import { getTenantContext } from '@/lib/tenant'
import { TenantTheme } from './TenantTheme'

/**
 * Applies the chapter theme for the current host/cookie. Used by layouts that
 * don't already know the user's chapter (auth, landing).
 */
export async function TenantThemeFromRequest() {
  const tenant = await getTenantContext()
  const source = tenant.chapter ?? tenant.fraternity
  if (!source) return null
  return <TenantTheme primaryColor={source.primary_color} accentColor={source.accent_color} />
}
