'use client'

import { safeCssColorOrNull } from '@/lib/colors'

interface TenantThemeProps {
  primaryColor?: string | null
  accentColor?: string | null
}

export function TenantTheme({ primaryColor: rawPrimary, accentColor: rawAccent }: TenantThemeProps) {
  // Re-validate on render so a bad value already in the DB can't break out of <style>.
  const primaryColor = safeCssColorOrNull(rawPrimary)
  const accentColor = safeCssColorOrNull(rawAccent)
  if (!primaryColor && !accentColor) return null

  const css = `
    :root {
      ${primaryColor ? `--primary: ${primaryColor};` : ''}
      ${accentColor ? `--gold: ${accentColor}; --sidebar-primary: ${accentColor};` : ''}
    }
  `

  return <style dangerouslySetInnerHTML={{ __html: css }} />
}
