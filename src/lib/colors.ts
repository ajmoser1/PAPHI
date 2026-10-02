// Chapter branding colors are rendered into a <style> tag, so only accept
// plain CSS color values: hex, or rgb()/hsl()/oklch() with numeric arguments.
// Anything else (braces, quotes, `<`, `;`, url(), etc.) is rejected.
const HEX_COLOR = /^#(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i
const FUNCTIONAL_COLOR = /^(?:rgb|rgba|hsl|hsla|oklch|oklab)\(\s*[0-9.%\s,/+-]{1,60}\)$/i

export function isSafeCssColor(value: string): boolean {
  const trimmed = value.trim()
  return HEX_COLOR.test(trimmed) || FUNCTIONAL_COLOR.test(trimmed)
}

export function safeCssColorOrNull(value: string | null | undefined): string | null {
  if (!value) return null
  return isSafeCssColor(value) ? value.trim() : null
}
