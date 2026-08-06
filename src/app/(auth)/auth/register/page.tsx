import { Suspense } from 'react'
import { createAdminClient } from '@/lib/supabase/server'
import { ROLES, STATUS } from '@/lib/constants'
import { RegisterForm } from './RegisterForm'

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ invite?: string; from?: string }>
}) {
  const { invite, from } = await searchParams
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

  return (
    <Suspense fallback={<div className="text-center text-muted-foreground">Loading…</div>}>
      <RegisterForm
        chapters={activeChapters}
        hasActiveChapters={activeChapters.length > 0}
        inviteChapter={inviteChapter}
        inviter={inviter}
      />
    </Suspense>
  )
}
