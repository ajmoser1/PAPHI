'use server'

import { revalidatePath } from 'next/cache'
import { requireFounder } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/server'
import { getSiteOrigin } from '@/lib/site'
import { ROLES, STATUS } from '@/lib/constants'

async function promoteToChapterAdmin(
  adminClient: ReturnType<typeof createAdminClient>,
  userId: string,
  chapterId: string
) {
  const { error } = await adminClient
    .from('profiles')
    .update({ role: ROLES.CHAPTER_ADMIN, status: STATUS.ACTIVE, chapter_id: chapterId })
    .eq('id', userId)

  if (error) throw new Error(error.message)
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

export async function submitChapterRequest(formData: FormData) {
  const chapterName = (formData.get('chapterName') as string)?.trim()
  const schoolName = (formData.get('schoolName') as string)?.trim()
  const contactName = (formData.get('contactName') as string)?.trim()
  const contactEmail = (formData.get('contactEmail') as string)?.trim()

  if (!chapterName || !schoolName || !contactName || !contactEmail) {
    return { message: 'All fields are required.' }
  }

  const adminClient = createAdminClient()
  const { error } = await adminClient.from('chapter_requests').insert({
    fraternity_slug: 'sae',
    chapter_name: chapterName,
    school_name: schoolName,
    contact_name: contactName,
    contact_email: contactEmail,
    status: 'pending',
  })

  if (error) return { message: error.message }
  return { success: true }
}

export async function approveChapterRequest(requestId: string) {
  const { adminClient } = await requireFounder()

  const { data: request } = await adminClient
    .from('chapter_requests')
    .select('*')
    .eq('id', requestId)
    .single()

  if (!request || request.status !== 'pending') {
    throw new Error('Request not found.')
  }

  const { data: fraternity } = await adminClient
    .from('fraternities')
    .select('id')
    .eq('slug', request.fraternity_slug)
    .single()

  if (!fraternity) throw new Error('Fraternity not found.')

  const baseSlug = slugify(`${request.chapter_name}-${request.school_name}`)
  let slug = baseSlug
  let attempt = 0
  while (attempt < 5) {
    const { data: existing } = await adminClient
      .from('chapters')
      .select('id')
      .eq('slug', slug)
      .maybeSingle()
    if (!existing) break
    attempt++
    slug = `${baseSlug}-${attempt}`
  }

  const { data: chapter, error: chapterError } = await adminClient
    .from('chapters')
    .insert({
      fraternity_id: fraternity.id,
      slug,
      name: request.chapter_name,
      school_name: request.school_name,
      status: 'active',
      display_title: `Sigma Alpha Epsilon ${request.chapter_name}`,
      tagline: 'Find brothers for referrals, mentorship, and opportunities.',
      contact_email: request.contact_email,
    })
    .select('id, slug, invite_token, contact_email')
    .single()

  if (chapterError) throw new Error(chapterError.message)

  await adminClient
    .from('chapter_requests')
    .update({ status: 'approved' })
    .eq('id', requestId)

  // The chapter itself is already created and approved at this point — don't let
  // a failure here (e.g. mailer rate limits) surface as a failed approval. The
  // founder dashboard's manual invite link and "assign admin" form are the fallback.
  try {
    await inviteChapterContact(adminClient, request.contact_email, request.contact_name, chapter.id)
  } catch {
    // swallow; fallbacks are always visible on the founder dashboard
  }

  revalidatePath('/founder')
  return chapter
}

async function inviteChapterContact(
  adminClient: ReturnType<typeof createAdminClient>,
  contactEmail: string,
  contactName: string,
  chapterId: string
) {
  const { data: invited, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(
    contactEmail,
    {
      redirectTo: `${getSiteOrigin()}/api/auth/callback?next=/auth/reset-password`,
      data: { first_name: contactName },
    }
  )

  if (!inviteError && invited.user) {
    await promoteToChapterAdmin(adminClient, invited.user.id, chapterId)
    return
  }

  // Most likely cause of failure: this email already has an account (e.g. they
  // registered before their chapter was approved). Promote them directly
  // instead of leaving them stranded — they can already sign in.
  const { data: authUsers } = await adminClient.auth.admin.listUsers()
  const existingUser = authUsers.users.find(
    (u: { email?: string }) => u.email?.toLowerCase() === contactEmail.toLowerCase()
  )
  if (existingUser) {
    await promoteToChapterAdmin(adminClient, existingUser.id, chapterId)
  }
}

export async function rejectChapterRequest(requestId: string) {
  const { adminClient } = await requireFounder()

  const { error } = await adminClient
    .from('chapter_requests')
    .update({ status: 'rejected' })
    .eq('id', requestId)

  if (error) throw new Error(error.message)
  revalidatePath('/founder')
}

export async function assignChapterAdmin(chapterId: string, email: string) {
  const { adminClient } = await requireFounder()

  const { data: authUsers } = await adminClient.auth.admin.listUsers()
  const authUser = authUsers.users.find(
    (u: { email?: string }) => u.email?.toLowerCase() === email.toLowerCase()
  )

  if (!authUser) {
    throw new Error('No user found with that email. They must register first.')
  }

  await promoteToChapterAdmin(adminClient, authUser.id, chapterId)
  revalidatePath('/founder')
}

export async function assignChapterAdminFromForm(chapterId: string, formData: FormData) {
  const email = (formData.get('email') as string)?.trim()
  if (!email) throw new Error('Email required.')
  await assignChapterAdmin(chapterId, email)
}

export async function suspendChapter(chapterId: string) {
  const { adminClient } = await requireFounder()

  const { error } = await adminClient
    .from('chapters')
    .update({ status: 'suspended' })
    .eq('id', chapterId)

  if (error) throw new Error(error.message)
  revalidatePath('/founder')
}
