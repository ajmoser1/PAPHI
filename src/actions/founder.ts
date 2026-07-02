'use server'

import { revalidatePath } from 'next/cache'
import { requireFounder } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/server'

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

  revalidatePath('/founder')
  return chapter
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

  const { error } = await adminClient
    .from('profiles')
    .update({ role: 'chapter_admin', chapter_id: chapterId, status: 'active' })
    .eq('id', authUser.id)

  if (error) throw new Error(error.message)
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
