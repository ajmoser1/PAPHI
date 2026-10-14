import { createAdminClient } from '@/lib/supabase/server'

/** Raster types the avatars bucket accepts, mapped to the stored extension. */
export const AVATAR_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
}

export const MAX_AVATAR_BYTES = 5 * 1024 * 1024

/** Magic-byte check so a spoofed Content-Type (e.g. SVG sent as image/png) is rejected. */
export function hasImageSignatureBytes(b: Uint8Array, type: string): boolean {
  switch (type) {
    case 'image/jpeg':
      return b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff
    case 'image/png':
      return b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47
    case 'image/gif':
      return b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x38
    case 'image/webp':
      return (
        b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 &&
        b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50
      )
    default:
      return false
  }
}

export async function hasImageSignature(file: File, type: string): Promise<boolean> {
  return hasImageSignatureBytes(new Uint8Array(await file.slice(0, 12).arrayBuffer()), type)
}

/** Only Google's own image CDN is ever fetched; user metadata is client-writable. */
const GOOGLE_PHOTO_HOST = /(^|\.)googleusercontent\.com$/i

/**
 * Copies a Google profile picture into the avatars bucket and sets
 * profiles.avatar_url, so a Google sign-up starts with a photo and the strict
 * CSP (images only from self + Supabase) still holds. Best-effort: any failure
 * leaves the profile untouched and the photo gate asks for one instead.
 *
 * Hardened against attacker-controlled URLs: only https://*.googleusercontent.com,
 * no redirects, 5s total budget including the body, size cap enforced while
 * streaming, and a magic-byte check before upload.
 */
export async function importAvatarFromUrl(userId: string, sourceUrl: string): Promise<boolean> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 5000)
  try {
    const url = new URL(sourceUrl)
    if (url.protocol !== 'https:' || !GOOGLE_PHOTO_HOST.test(url.hostname)) return false

    // Google serves a small default size; ask for a larger one.
    const target = `${url.origin}${url.pathname.replace(/=s\d+(-c)?$/, '')}=s512-c`
    const res = await fetch(target, { signal: controller.signal, redirect: 'error' })
    if (!res.ok || !res.body) return false

    const contentType = (res.headers.get('content-type') ?? '').split(';')[0].trim()
    const ext = AVATAR_TYPES[contentType]
    if (!ext) return false
    const declared = Number(res.headers.get('content-length') ?? 0)
    if (declared > MAX_AVATAR_BYTES) return false

    const chunks: Uint8Array[] = []
    let total = 0
    const reader = res.body.getReader()
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      total += value.byteLength
      if (total > MAX_AVATAR_BYTES) {
        await reader.cancel()
        return false
      }
      chunks.push(value)
    }
    const bytes = new Uint8Array(total)
    let offset = 0
    for (const c of chunks) {
      bytes.set(c, offset)
      offset += c.byteLength
    }
    if (bytes.byteLength === 0 || !hasImageSignatureBytes(bytes.subarray(0, 12), contentType)) return false

    const admin = createAdminClient()
    const path = `${userId}/avatar-${Date.now()}.${ext}`
    const { error: uploadError } = await admin.storage.from('avatars').upload(path, bytes, { upsert: false, contentType })
    if (uploadError) return false

    const { data } = admin.storage.from('avatars').getPublicUrl(path)
    const { error } = await admin.from('profiles').update({ avatar_url: data.publicUrl }).eq('id', userId).is('avatar_url', null)
    return !error
  } catch {
    return false
  } finally {
    clearTimeout(timer)
  }
}
