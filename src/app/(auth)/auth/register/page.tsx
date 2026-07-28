import { Suspense } from 'react'
import { createAdminClient } from '@/lib/supabase/server'
import { RegisterForm } from './RegisterForm'

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ invite?: string }>
}) {
  const { invite } = await searchParams
  const adminClient = createAdminClient()

  const { data: chapters } = await adminClient
    .from('chapters')
    .select('id, name, school_name')
    .eq('status', 'active')
    .order('name')

  const activeChapters = chapters ?? []

  let inviteChapter: { name: string; school_name: string | null } | null = null
  if (invite) {
    const { data: chapter } = await adminClient
      .from('chapters')
      .select('name, school_name')
      .eq('invite_token', invite)
      .eq('status', 'active')
      .maybeSingle()
    if (chapter) inviteChapter = chapter
  }

  return (
    <Suspense fallback={<div className="text-center text-muted-foreground">Loading…</div>}>
      <RegisterForm
        chapters={activeChapters}
        hasActiveChapters={activeChapters.length > 0}
        inviteChapter={inviteChapter}
      />
    </Suspense>
  )
}
