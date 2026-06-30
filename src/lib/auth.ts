'use server'

import { createClient, createAdminClient } from '@/lib/supabase/server'
import { ROLES } from '@/lib/constants'

export async function requireAuth() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')
  return { supabase, userId: user.id, user }
}

export async function requireActiveProfile() {
  const ctx = await requireAuth()
  const { data: profile } = await ctx.supabase
    .from('profiles')
    .select('id, role, status, chapter_id')
    .eq('id', ctx.userId)
    .single()
  if (!profile || profile.status !== 'active') {
    throw new Error('Active account required.')
  }
  return { ...ctx, profile }
}

export async function requireChapterAdmin() {
  const ctx = await requireAuth()
  const { data: profile } = await ctx.supabase
    .from('profiles')
    .select('id, role, status, chapter_id')
    .eq('id', ctx.userId)
    .single()

  if (!profile) throw new Error('Forbidden')
  if (profile.role === ROLES.FOUNDER) {
    return { ...ctx, profile, adminClient: createAdminClient() }
  }
  if (profile.role !== ROLES.CHAPTER_ADMIN && profile.role !== ROLES.ADMIN) {
    throw new Error('Forbidden')
  }
  if (!profile.chapter_id) throw new Error('No chapter assigned.')

  return { ...ctx, profile, adminClient: createAdminClient() }
}

export async function requireFounder() {
  const ctx = await requireAuth()
  const { data: profile } = await ctx.supabase
    .from('profiles')
    .select('id, role, chapter_id')
    .eq('id', ctx.userId)
    .single()

  if (!profile || profile.role !== ROLES.FOUNDER) throw new Error('Forbidden')

  return { ...ctx, profile, adminClient: createAdminClient() }
}
