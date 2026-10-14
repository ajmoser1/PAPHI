import { buildBrandTokens } from '@/lib/colors'

interface TenantThemeProps {
  primaryColor?: string | null
  accentColor?: string | null
}

/**
 * Sets the two brand inputs for a chapter. Every other brand-dependent token
 * (sidebar, ring, hover, tints) derives from these in globals.css, so this is
 * all a chapter needs to re-theme the whole app.
 */
export function TenantTheme({ primaryColor, accentColor }: TenantThemeProps) {
  // Re-validate on render so a bad value already in the DB can't break out of <style>.
  const tokens = buildBrandTokens(primaryColor, accentColor)
  if (!tokens) return null

  const decls: string[] = []
  if (tokens.primary) {
    decls.push(`--brand-primary:${tokens.primary}`)
    decls.push(`--brand-primary-foreground:${tokens.primaryForeground}`)
  }
  if (tokens.accent) {
    decls.push(`--brand-accent:${tokens.accent}`)
    decls.push(`--brand-accent-foreground:${tokens.accentForeground}`)
  }

  return <style dangerouslySetInnerHTML={{ __html: `:root{${decls.join(';')}}` }} />
}
