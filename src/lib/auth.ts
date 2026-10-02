import 'server-only'

import { createClient, createAdminClient } from '@/lib/supabase/server'
import { ROLES, STATUS } from '@/lib/constants'

// Guards are server-only helpers, not Server Actions — never mark this file
// 'use server', or each export becomes a publicly callable endpoint.

export async function requireAuth() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')
  return { supabase, userId: user.id, user }
}

/** Signed in and not suspended (pending members may still edit their own profile). */
export async function requireNotSuspended() {
  const ctx = await requireAuth()
  const { data: profile } = await ctx.supabase
    .from('profiles')
    .select('status')
    .eq('id', ctx.userId)
    .maybeSingle()
  if (profile?.status === STATUS.SUSPENDED) {
    throw new Error('Your account is suspended.')
  }
  return ctx
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
  if (profile.status !== STATUS.ACTIVE) throw new Error('Forbidden')
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
    .select('id, role, status, chapter_id')
    .eq('id', ctx.userId)
    .single()

  if (!profile || profile.role !== ROLES.FOUNDER || profile.status !== STATUS.ACTIVE) {
    throw new Error('Forbidden')
  }

  return { ...ctx, profile, adminClient: createAdminClient() }
}
