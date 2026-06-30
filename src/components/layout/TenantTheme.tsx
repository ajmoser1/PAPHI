'use client'

interface TenantThemeProps {
  primaryColor?: string | null
  accentColor?: string | null
}

export function TenantTheme({ primaryColor, accentColor }: TenantThemeProps) {
  if (!primaryColor && !accentColor) return null

  const css = `
    :root {
      ${primaryColor ? `--primary: ${primaryColor};` : ''}
      ${accentColor ? `--gold: ${accentColor}; --sidebar-primary: ${accentColor};` : ''}
    }
  `

  return <style dangerouslySetInnerHTML={{ __html: css }} />
}
