import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { RegisterForm } from './RegisterForm'

export default async function RegisterPage() {
  const supabase = await createClient()
  const { data: chapters } = await supabase
    .from('chapters')
    .select('id, name, school_name')
    .eq('status', 'active')
    .order('name')
  const activeChapters = chapters ?? []

  return (
    <Suspense fallback={<div className="text-center text-muted-foreground">Loading…</div>}>
      <RegisterForm chapters={activeChapters} hasActiveChapters={activeChapters.length > 0} />
    </Suspense>
  )
}
