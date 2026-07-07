'use server'

import { revalidatePath } from 'next/cache'
import { requireFounder } from '@/lib/auth'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { getSiteOrigin } from '@/lib/site'
import { formatAuthErrorMessage } from '@/lib/auth-errors'
import { DEFAULT_PRIVACY_SETTINGS, ROLES, STATUS } from '@/lib/constants'

function splitContactName(contactName: string): { firstName: string; lastName: string } {
  const parts = contactName.trim().split(/\s+/)
  const firstName = parts[0] ?? contactName
  const lastName = parts.slice(1).join(' ') || 'Admin'
  return { firstName, lastName }
}

async function promoteToChapterAdmin(
  adminClient: ReturnType<typeof createAdminClient>,
  userId: string,
  chapterId: string,
  contactName?: string
) {
  const { data: existing } = await adminClient
    .from('profiles')
    .select('id')
    .eq('id', userId)
    .maybeSingle()

  if (existing) {
    const { error } = await adminClient
      .from('profiles')
      .update({
        role: ROLES.CHAPTER_ADMIN,
        status: STATUS.ACTIVE,
        chapter_id: chapterId,
      })
      .eq('id', userId)

    if (error) throw new Error(error.message)
    return
  }

  const { firstName, lastName } = splitContactName(contactName ?? 'Chapter Admin')
  const { error } = await adminClient.from('profiles').insert({
    id: userId,
    first_name: firstName,
    last_name: lastName,
    role: ROLES.CHAPTER_ADMIN,
    status: STATUS.ACTIVE,
    chapter_id: chapterId,
    privacy_settings: DEFAULT_PRIVACY_SETTINGS,
  })

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
  const password = formData.get('password') as string

  if (!chapterName || !schoolName || !contactName || !contactEmail || !password) {
    return { message: 'All fields are required.' }
  }

  if (password.length < 8) {
    return { message: 'Password must be at least 8 characters.' }
  }

  const { firstName, lastName } = splitContactName(contactName)
  const supabase = await createClient()
  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email: contactEmail,
    password,
    options: {
      data: { first_name: firstName, last_name: lastName },
    },
  })

  if (signUpError) {
    const message = formatAuthErrorMessage(signUpError.message)
    if (message.toLowerCase().includes('already registered')) {
      return {
        message:
          'An account with this email already exists. Sign in instead, or use a different email.',
      }
    }
    return { message }
  }

  if (!signUpData.user) {
    return { message: 'Could not create your account. Please try again.' }
  }

  const adminClient = createAdminClient()
  const { error: profileError } = await adminClient.from('profiles').upsert(
    {
      id: signUpData.user.id,
      first_name: firstName,
      last_name: lastName,
      role: ROLES.PENDING,
      status: STATUS.PENDING_APPROVAL,
      privacy_settings: DEFAULT_PRIVACY_SETTINGS,
    },
    { onConflict: 'id' }
  )

  if (profileError) {
    return {
      message:
        'Your account was created, but setup did not finish. Try signing in, or contact support if this keeps happening.',
    }
  }

  const { error: requestError } = await adminClient.from('chapter_requests').insert({
    fraternity_slug: 'sae',
    chapter_name: chapterName,
    school_name: schoolName,
    contact_name: contactName,
    contact_email: contactEmail,
    contact_user_id: signUpData.user.id,
    status: 'pending',
  })

  if (requestError) {
    return { message: requestError.message }
  }

  return {
    success: true,
    needsEmailConfirmation: !signUpData.session,
  }
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

  try {
    await setupChapterAdmin(adminClient, {
      userId: request.contact_user_id,
      contactEmail: request.contact_email,
      contactName: request.contact_name,
      chapterId: chapter.id,
    })
  } catch {
    // Chapter is live; founder dashboard invite link and assign-admin are fallbacks.
  }

  revalidatePath('/founder')
  return chapter
}

async function setupChapterAdmin(
  adminClient: ReturnType<typeof createAdminClient>,
  opts: {
    userId?: string | null
    contactEmail: string
    contactName: string
    chapterId: string
  }
) {
  let userId = opts.userId ?? null

  if (!userId) {
    const { data: authUsers } = await adminClient.auth.admin.listUsers()
    const existingUser = authUsers.users.find(
      (u: { email?: string }) => u.email?.toLowerCase() === opts.contactEmail.toLowerCase()
    )
    userId = existingUser?.id ?? null
  }

  if (userId) {
    await promoteToChapterAdmin(adminClient, userId, opts.chapterId, opts.contactName)
    return
  }

  await inviteChapterContact(
    adminClient,
    opts.contactEmail,
    opts.contactName,
    opts.chapterId
  )
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
    await promoteToChapterAdmin(adminClient, invited.user.id, chapterId, contactName)
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
