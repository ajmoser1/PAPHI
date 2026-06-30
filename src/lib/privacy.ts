import { SEARCH_SCOPE, VISIBILITY_SCOPE, PRIVACY_AUDIENCE } from '@/lib/constants'

type PrivacySettings = {
  show_contact_to?: string
  show_positions_to?: string
  show_bio_to?: string
}

export function canViewField(
  audience: string | undefined,
  viewerChapterId: string | null,
  targetChapterId: string | null,
  sameChapter: boolean
): boolean {
  const level = audience ?? PRIVACY_AUDIENCE.FRATERNITY
  if (level === PRIVACY_AUDIENCE.HIDDEN) return false
  if (level === PRIVACY_AUDIENCE.CHAPTER) return sameChapter
  return true // fraternity — same fraternity assumed by caller
}

export function canViewBio(
  privacySettings: PrivacySettings | null,
  viewerChapterId: string | null,
  targetChapterId: string | null
): boolean {
  const sameChapter = !!viewerChapterId && viewerChapterId === targetChapterId
  return canViewField(privacySettings?.show_bio_to, viewerChapterId, targetChapterId, sameChapter)
}

export function canViewPositions(
  privacySettings: PrivacySettings | null,
  viewerChapterId: string | null,
  targetChapterId: string | null
): boolean {
  const sameChapter = !!viewerChapterId && viewerChapterId === targetChapterId
  return canViewField(privacySettings?.show_positions_to, viewerChapterId, targetChapterId, sameChapter)
}

export function canViewContact(
  privacySettings: PrivacySettings | null,
  viewerChapterId: string | null,
  targetChapterId: string | null
): boolean {
  const sameChapter = !!viewerChapterId && viewerChapterId === targetChapterId
  return canViewField(privacySettings?.show_contact_to, viewerChapterId, targetChapterId, sameChapter)
}

export function isVisibleInSearch(
  visibilityScope: string,
  viewerChapterId: string | null,
  targetChapterId: string | null
): boolean {
  if (visibilityScope === VISIBILITY_SCOPE.HIDDEN) return false
  if (visibilityScope === VISIBILITY_SCOPE.CHAPTER) {
    return !!viewerChapterId && viewerChapterId === targetChapterId
  }
  return true
}

export { SEARCH_SCOPE }
