// Chapter branding colors are rendered into a <style> tag, so only accept
// plain CSS color values: hex, or rgb()/hsl()/oklch()/oklab() with numeric
// arguments. Anything else (braces, quotes, `<`, `;`, url(), etc.) is rejected.
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

/* ---------------------------------------------------------------------------
 * Color math. Small, dependency-free conversions used to pick a readable text
 * color for a chapter's brand colors and to express the default OKLCH tokens
 * as hex for the admin color picker.
 * ------------------------------------------------------------------------- */

type Rgb = [number, number, number] // 0..1, sRGB (gamma encoded)

const DARK_FOREGROUND = 'oklch(0.15 0 0)'
const LIGHT_FOREGROUND = 'oklch(0.98 0 0)'

/** Relative luminance at which white text stops meeting 4.5:1 (WCAG). */
const FOREGROUND_FLIP_LUMINANCE = 0.18

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n))
}

function linearToSrgb(c: number): number {
  const v = clamp01(c)
  return v <= 0.0031308 ? 12.92 * v : 1.055 * Math.pow(v, 1 / 2.4) - 0.055
}

function srgbToLinear(c: number): number {
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
}

function oklabToRgb(L: number, a: number, b: number): Rgb {
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b
  const s_ = L - 0.0894841775 * a - 1.291485548 * b
  const l = l_ * l_ * l_
  const m = m_ * m_ * m_
  const s = s_ * s_ * s_
  const r = 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s
  const g = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s
  const bb = -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s
  return [linearToSrgb(r), linearToSrgb(g), linearToSrgb(bb)]
}

function oklchToRgb(L: number, C: number, h: number): Rgb {
  const hr = (h * Math.PI) / 180
  return oklabToRgb(L, C * Math.cos(hr), C * Math.sin(hr))
}

function hslToRgb(h: number, s: number, l: number): Rgb {
  const k = (n: number) => (n + h / 30) % 12
  const a = s * Math.min(l, 1 - l)
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)))
  return [f(0), f(8), f(4)]
}

function hexToRgb(hex: string): Rgb | null {
  let h = hex.slice(1)
  if (h.length === 3 || h.length === 4) {
    h = h
      .split('')
      .map((c) => c + c)
      .join('')
  }
  if (h.length !== 6 && h.length !== 8) return null
  const n = parseInt(h.slice(0, 6), 16)
  if (Number.isNaN(n)) return null
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]
}

function numericArgs(inner: string): number[] {
  // Accepts "a, b, c", "a b c", and "a b c / alpha"; alpha is dropped.
  const beforeAlpha = inner.split('/')[0]
  return beforeAlpha
    .split(/[\s,]+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => (s.endsWith('%') ? { v: parseFloat(s) / 100, pct: true } : { v: parseFloat(s), pct: false }))
    .filter((x) => !Number.isNaN(x.v))
    .map((x) => x.v)
}

function parseToRgb(color: string): Rgb | null {
  const value = color.trim()
  if (HEX_COLOR.test(value)) return hexToRgb(value)
  const m = /^(rgba?|hsla?|oklch|oklab)\((.*)\)$/i.exec(value)
  if (!m) return null
  const fn = m[1].toLowerCase()
  const inner = m[2]
  const rawTokens = inner
    .split('/')[0]
    .split(/[\s,]+/)
    .map((s) => s.trim())
    .filter(Boolean)
  const args = numericArgs(inner)
  if (args.length < 3) return null
  const isPct = (i: number) => rawTokens[i]?.endsWith('%') ?? false

  if (fn.startsWith('rgb')) {
    const [r, g, b] = args
    return [
      isPct(0) ? r : r / 255,
      isPct(1) ? g : g / 255,
      isPct(2) ? b : b / 255,
    ].map(clamp01) as Rgb
  }
  if (fn.startsWith('hsl')) {
    const [h, s, l] = args
    return hslToRgb(h, isPct(1) ? s : s / 100, isPct(2) ? l : l / 100)
  }
  if (fn === 'oklch') {
    const [L, C, h] = args
    return oklchToRgb(isPct(0) ? L : L > 1 ? L / 100 : L, isPct(1) ? C * 0.4 : C, h)
  }
  const [L, a, b] = args
  return oklabToRgb(isPct(0) ? L : L > 1 ? L / 100 : L, isPct(1) ? a * 0.4 : a, isPct(2) ? b * 0.4 : b)
}

function relativeLuminance([r, g, b]: Rgb): number {
  return 0.2126 * srgbToLinear(r) + 0.7152 * srgbToLinear(g) + 0.0722 * srgbToLinear(b)
}

/** WCAG relative luminance (0 = black, 1 = white), or null when unparseable. */
export function perceivedLightness(color: string): number | null {
  const rgb = parseToRgb(color)
  return rgb ? relativeLuminance(rgb) : null
}

/** Text color that stays readable on `color`. Unparseable colors assume a dark brand. */
export function contrastForeground(color: string): string {
  const lum = perceivedLightness(color)
  if (lum === null) return LIGHT_FOREGROUND
  return lum > FOREGROUND_FLIP_LUMINANCE ? DARK_FOREGROUND : LIGHT_FOREGROUND
}

/** WCAG contrast ratio between two colors, or null when either is unparseable. */
export function contrastRatio(a: string, b: string): number | null {
  const la = perceivedLightness(a)
  const lb = perceivedLightness(b)
  if (la === null || lb === null) return null
  const [hi, lo] = la > lb ? [la, lb] : [lb, la]
  return (hi + 0.05) / (lo + 0.05)
}

function toHex(rgb: Rgb): string {
  return (
    '#' +
    rgb
      .map((c) => Math.round(clamp01(c) * 255).toString(16).padStart(2, '0'))
      .join('')
  )
}

/** Hex form of any accepted color, for <input type="color"> which only takes #rrggbb. */
export function toHexColor(color: string): string | null {
  const rgb = parseToRgb(color)
  return rgb ? toHex(rgb) : null
}

export type BrandTokens = {
  primary: string | null
  accent: string | null
  primaryForeground: string | null
  accentForeground: string | null
}

/** Validated brand inputs plus their contrast foregrounds. Null when neither color is set. */
export function buildBrandTokens(
  primary?: string | null,
  accent?: string | null
): BrandTokens | null {
  const p = safeCssColorOrNull(primary)
  const a = safeCssColorOrNull(accent)
  if (!p && !a) return null
  return {
    primary: p,
    accent: a,
    primaryForeground: p ? contrastForeground(p) : null,
    accentForeground: a ? contrastForeground(a) : null,
  }
}

/** The default OKLCH brand tokens from globals.css, as hex for the color picker. */
export const BRAND_DEFAULT_HEX = {
  primary: toHex(oklchToRgb(0.32, 0.16, 295)),
  accent: toHex(oklchToRgb(0.75, 0.13, 78)),
} as const
