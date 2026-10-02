import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { ROLES, STATUS, isMembershipIncomplete } from '@/lib/constants'
import { CompleteSignupForm, type SignupPrefill } from './CompleteSignupForm'

export const metadata: Metadata = { title: 'Tell us about yourself' }

function metaString(meta: Record<string, unknown>, ...keys: string[]): string {
  for (const key of keys) {
    const v = meta[key]
    if (typeof v === 'string' && v.trim()) return v.trim()
    if (typeof v === 'number' && Number.isFinite(v)) return String(v)
  }
  return ''
}

/** Name from Google (given/family) or from our own signup metadata; falls back to splitting a full name. */
function nameFromMetadata(meta: Record<string, unknown>): { firstName: string; lastName: string } {
  const given = metaString(meta, 'given_name', 'first_name')
  const family = metaString(meta, 'family_name', 'last_name')
  if (given || family) return { firstName: given, lastName: family }

  const full = metaString(meta, 'full_name', 'name')
  const parts = full.split(/\s+/).filter(Boolean)
  if (parts.length === 0) return { firstName: '', lastName: '' }
  if (parts.length === 1) return { firstName: parts[0], lastName: '' }
  return { firstName: parts[0], lastName: parts.slice(1).join(' ') }
}

export default async function CompleteSignupPage({
  searchParams,
}: {
  searchParams: Promise<{ invite?: string; from?: string }>
}) {
  const params = await searchParams
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user?.email) {
    redirect('/auth/login')
  }

  const { data: existingProfile } = await supabase
    .from('profiles')
    .select('status, role, chapter_id')
    .eq('id', user.id)
    .maybeSingle()

  if (existingProfile && !isMembershipIncomplete(existingProfile)) {
    if (existingProfile.status === STATUS.PENDING_APPROVAL) {
      redirect('/profile/edit')
    }
    redirect('/members')
  }

  const meta = (user.user_metadata ?? {}) as Record<string, unknown>
  const provider = (user.app_metadata?.provider as string | undefined) ?? 'email'

  // The URL wins; otherwise reuse the invite token saved when they registered,
  // so an email-confirmation round trip does not lose their chapter.
  const invite = params.invite || metaString(meta, 'signup_invite_token') || undefined
  const from = params.from

  const adminClient = createAdminClient()
  const { data: chapters } = await adminClient
    .from('chapters')
    .select('id, name, school_name')
    .eq('status', 'active')
    .order('name')

  const activeChapters = chapters ?? []

  let inviteChapter: { id: string; name: string; school_name: string | null } | null = null
  if (invite) {
    const { data: chapter } = await adminClient
      .from('chapters')
      .select('id, name, school_name')
      .eq('invite_token', invite)
      .eq('status', 'active')
      .maybeSingle()
    if (chapter) inviteChapter = chapter
  }

  let inviter: { first_name: string; last_name: string } | null = null
  if (from && inviteChapter) {
    const { data: profile } = await adminClient
      .from('profiles')
      .select('first_name, last_name, chapter_id, status, role')
      .eq('id', from)
      .maybeSingle()

    if (
      profile &&
      profile.status === STATUS.ACTIVE &&
      (profile.chapter_id === inviteChapter.id || profile.role === ROLES.FOUNDER)
    ) {
      inviter = { first_name: profile.first_name, last_name: profile.last_name }
    }
  }

  const inviteValid = Boolean(invite && inviteChapter)
  const prefill: SignupPrefill = {
    ...nameFromMetadata(meta),
    phone: metaString(meta, 'signup_phone'),
    graduationYear: metaString(meta, 'signup_graduation_year'),
    role: metaString(meta, 'signup_role'),
    chapterId: metaString(meta, 'signup_chapter_id'),
  }

  return (
    <CompleteSignupForm
      email={user.email}
      provider={provider}
      prefill={prefill}
      chapters={activeChapters}
      inviteToken={inviteValid ? invite! : ''}
      inviteBroken={Boolean(invite && !inviteChapter)}
      inviteChapter={inviteChapter}
      inviter={inviter}
    />
  )
}
