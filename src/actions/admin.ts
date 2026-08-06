'use server'

import { revalidatePath } from 'next/cache'
import * as z from 'zod'
import { requireChapterAdmin } from '@/lib/auth'
import { ROLES } from '@/lib/constants'

export async function approveUser(profileId: string) {
  const { profile, adminClient } = await requireChapterAdmin()

  const { data: authUser, error: authUserError } = await adminClient.auth.admin.getUserById(profileId)
  if (authUserError || !authUser?.user) {
    throw new Error('Cannot approve profile without a valid auth account.')
  }

  const { data: target } = await adminClient
    .from('profiles')
    .select('role, chapter_id')
    .eq('id', profileId)
    .single()

  if (!target) throw new Error('Profile not found.')
  if (profile.role !== ROLES.FOUNDER && target.chapter_id !== profile.chapter_id) {
    throw new Error('Cannot approve users outside your chapter.')
  }
  if (!target.chapter_id && profile.role === ROLES.FOUNDER) {
    throw new Error('Cannot approve a user without an assigned chapter.')
  }

  const chapterIdForActivation = target.chapter_id ?? profile.chapter_id
  if (!chapterIdForActivation) {
    throw new Error('Cannot approve a user without an assigned chapter.')
  }

  const { error } = await adminClient
    .from('profiles')
    .update({
      status: 'active',
      role: target.role === 'pending' ? 'undergrad' : target.role,
      chapter_id: chapterIdForActivation,
      visibility_scope: 'fraternity',
      search_scope: 'fraternity',
    })
    .eq('id', profileId)

  if (error) throw new Error(error.message)
  revalidatePath('/admin/approvals')
}

export async function rejectUser(profileId: string) {
  const { profile, adminClient } = await requireChapterAdmin()

  const { data: target } = await adminClient
    .from('profiles')
    .select('chapter_id')
    .eq('id', profileId)
    .single()

  if (!target) throw new Error('Profile not found.')
  if (profile.role !== ROLES.FOUNDER && target.chapter_id !== profile.chapter_id) {
    throw new Error('Cannot reject users outside your chapter.')
  }

  const { error } = await adminClient
    .from('profiles')
    .update({ status: 'suspended' })
    .eq('id', profileId)

  if (error) throw new Error(error.message)
  revalidatePath('/admin/approvals')
}

export async function removeAcceptedProfile(profileId: string) {
  const { profile, adminClient, userId } = await requireChapterAdmin()

  if (profileId === userId) {
    throw new Error('You cannot remove your own profile.')
  }

  const { data: targetProfile } = await adminClient
    .from('profiles')
    .select('id, status, role, chapter_id')
    .eq('id', profileId)
    .single()

  if (!targetProfile) throw new Error('Profile not found.')
  if (
    profile.role !== ROLES.FOUNDER &&
    targetProfile.chapter_id !== profile.chapter_id
  ) {
    throw new Error('Cannot remove users outside your chapter.')
  }
  if (targetProfile.role === ROLES.CHAPTER_ADMIN || targetProfile.role === ROLES.FOUNDER) {
    throw new Error('Cannot remove an admin profile.')
  }
  if (targetProfile.status !== 'active') {
    throw new Error('Only accepted profiles can be removed.')
  }

  const { error } = await adminClient
    .from('profiles')
    .update({ status: 'suspended' })
    .eq('id', profileId)

  if (error) throw new Error(error.message)
  revalidatePath('/admin/approvals')
  revalidatePath('/members')
}

const companySchema = z.object({
  name: z.string().min(1, { error: 'Name is required.' }),
  slug: z.string().min(1, { error: 'Slug is required.' }),
  industryId: z.string().optional(),
  website: z.string().optional(),
})

export async function createCompany(formData: FormData): Promise<void> {
  const { adminClient } = await requireChapterAdmin()
  const validated = companySchema.safeParse({
    name: formData.get('name'),
    slug: formData.get('slug'),
    industryId: formData.get('industryId') || undefined,
    website: formData.get('website') || undefined,
  })
  if (!validated.success) return
  await adminClient.from('companies').insert({
    name: validated.data.name,
    slug: validated.data.slug,
    industry_id: validated.data.industryId || null,
    website: validated.data.website || null,
    status: 'active',
  })
  revalidatePath('/admin/companies')
}

export async function createIndustry(formData: FormData): Promise<void> {
  const { adminClient } = await requireChapterAdmin()
  const name = (formData.get('name') as string)?.trim()
  if (!name) return
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
  await adminClient.from('industries').insert({ name, slug })
  revalidatePath('/admin/industries')
}

export async function promoteToChapterAdmin(profileId: string) {
  const { profile, adminClient, userId } = await requireChapterAdmin()

  if (profileId === userId) throw new Error('You are already an admin.')

  const { data: target } = await adminClient
    .from('profiles')
    .select('chapter_id, status')
    .eq('id', profileId)
    .single()

  if (!target || target.chapter_id !== profile.chapter_id) {
    throw new Error('User is not in your chapter.')
  }
  if (target.status !== 'active') {
    throw new Error('Only active members can be promoted.')
  }

  const { error } = await adminClient
    .from('profiles')
    .update({ role: ROLES.CHAPTER_ADMIN })
    .eq('id', profileId)

  if (error) throw new Error(error.message)
  revalidatePath('/admin/approvals')
}
