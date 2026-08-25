'use server'

import { revalidatePath } from 'next/cache'
import * as z from 'zod'
import { requireChapterAdmin } from '@/lib/auth'
import { ROLES } from '@/lib/constants'
import {
  ALUMNI_CONTACT_VISIBLE_SELECT,
  CONTACT_REQUIRED_FOR_APPROVAL_MESSAGE,
  hasVisibleContact,
} from '@/lib/contact'

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

  // Incomplete stubs (auth trigger, no chapter yet) can be assigned the approver's chapter.
  const chapterIdForActivation = target.chapter_id ?? profile.chapter_id
  if (!chapterIdForActivation) {
    throw new Error(
      'Cannot approve this member until they finish signup and choose a chapter, or you have a chapter assigned to your admin account.'
    )
  }

  const { data: contact } = await adminClient
    .from('alumni_contact')
    .select(ALUMNI_CONTACT_VISIBLE_SELECT)
    .eq('profile_id', profileId)
    .maybeSingle()

  if (!hasVisibleContact(contact)) {
    throw new Error(CONTACT_REQUIRED_FOR_APPROVAL_MESSAGE)
  }

  const { error } = await adminClient
    .from('profiles')
    .update({
      status: 'active',
      role: target.role === 'pending' ? 'undergrad' : target.role,
      chapter_id: chapterIdForActivation,
      visibility_scope: 'fraternity',
      search_scope: 'fraternity',
      // Force post-approval enrichment prompt for newly approved members.
      profile_setup_completed_at: null,
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
  name: z.string().min(1),
  slug: z.string().optional(),
  industryId: z.string().optional(),
  website: z.string().optional(),
})

function slugifyName(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

export async function createCompany(formData: FormData): Promise<{ message?: string }> {
  const { adminClient } = await requireChapterAdmin()
  const name = (formData.get('name') as string)?.trim()
  const slugInput = (formData.get('slug') as string)?.trim()
  const validated = companySchema.safeParse({
    name,
    slug: slugInput || (name ? slugifyName(name) : undefined),
    industryId: formData.get('industryId') || undefined,
    website: formData.get('website') || undefined,
  })
  if (!validated.success) return { message: 'Company name is required.' }

  const slug = validated.data.slug || slugifyName(validated.data.name)
  const { error } = await adminClient.from('companies').insert({
    name: validated.data.name,
    slug,
    industry_id: validated.data.industryId || null,
    website: validated.data.website || null,
    status: 'active',
  })
  if (error) return { message: error.message }
  revalidatePath('/admin/companies')
  return {}
}

export async function updateCompany(formData: FormData): Promise<{ message?: string }> {
  const { adminClient } = await requireChapterAdmin()
  const id = (formData.get('id') as string)?.trim()
  const name = (formData.get('name') as string)?.trim()
  const industryId = (formData.get('industryId') as string) || null
  const website = (formData.get('website') as string)?.trim() || null
  const status = (formData.get('status') as string)?.trim()

  if (!id) return { message: 'Company id is required.' }
  if (!name) return { message: 'Company name is required.' }
  if (!['active', 'suggested', 'rejected'].includes(status)) {
    return { message: 'Invalid status.' }
  }

  const { error } = await adminClient
    .from('companies')
    .update({
      name,
      industry_id: industryId,
      website,
      status,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (error) return { message: error.message }
  revalidatePath('/admin/companies')
  revalidatePath('/members')
  revalidatePath('/profile/edit')
  return {}
}

export async function setCompanyStatus(
  companyId: string,
  status: 'active' | 'rejected'
): Promise<{ message?: string }> {
  const { adminClient } = await requireChapterAdmin()
  if (!companyId) return { message: 'Company id is required.' }

  const { error } = await adminClient
    .from('companies')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', companyId)

  if (error) return { message: error.message }
  revalidatePath('/admin/companies')
  revalidatePath('/members')
  revalidatePath('/profile/edit')
  return {}
}

/** Reassign positions from absorbId onto keepId, then reject the absorbed company. */
export async function mergeCompanies(
  keepId: string,
  absorbId: string
): Promise<{ message?: string }> {
  const { adminClient } = await requireChapterAdmin()
  if (!keepId || !absorbId) return { message: 'Both companies are required.' }
  if (keepId === absorbId) return { message: 'Cannot merge a company into itself.' }

  const { data: companies, error: fetchErr } = await adminClient
    .from('companies')
    .select('id, industry_id')
    .in('id', [keepId, absorbId])

  if (fetchErr) return { message: fetchErr.message }
  if (!companies || companies.length !== 2) return { message: 'Company not found.' }

  const keep = companies.find((c: { id: string; industry_id: string | null }) => c.id === keepId)
  const absorb = companies.find((c: { id: string; industry_id: string | null }) => c.id === absorbId)
  if (!keep || !absorb) return { message: 'Company not found.' }

  const { error: reassignErr } = await adminClient
    .from('positions')
    .update({ company_id: keepId })
    .eq('company_id', absorbId)

  if (reassignErr) return { message: reassignErr.message }

  if (!keep.industry_id && absorb.industry_id) {
    await adminClient
      .from('companies')
      .update({ industry_id: absorb.industry_id })
      .eq('id', keepId)
      .is('industry_id', null)
  }

  const { error: rejectErr } = await adminClient
    .from('companies')
    .update({ status: 'rejected', updated_at: new Date().toISOString() })
    .eq('id', absorbId)

  if (rejectErr) return { message: rejectErr.message }

  revalidatePath('/admin/companies')
  revalidatePath('/members')
  revalidatePath('/profile/edit')
  return {}
}

export async function createIndustry(formData: FormData): Promise<{ message?: string }> {
  const { adminClient } = await requireChapterAdmin()
  const name = (formData.get('name') as string)?.trim()
  if (!name) return { message: 'Industry name is required.' }
  const slug = slugifyName(name)
  const { error } = await adminClient.from('industries').insert({ name, slug })
  if (error) return { message: error.message }
  revalidatePath('/admin/industries')
  revalidatePath('/members')
  revalidatePath('/profile/edit')
  return {}
}

export async function updateIndustry(formData: FormData): Promise<{ message?: string }> {
  const { adminClient } = await requireChapterAdmin()
  const id = (formData.get('id') as string)?.trim()
  const name = (formData.get('name') as string)?.trim()
  if (!id) return { message: 'Industry id is required.' }
  if (!name) return { message: 'Industry name is required.' }

  const { error } = await adminClient
    .from('industries')
    .update({ name, slug: slugifyName(name) })
    .eq('id', id)

  if (error) return { message: error.message }
  revalidatePath('/admin/industries')
  revalidatePath('/members')
  revalidatePath('/profile/edit')
  revalidatePath('/admin/companies')
  return {}
}

export async function deleteIndustry(industryId: string): Promise<{ message?: string }> {
  const { adminClient } = await requireChapterAdmin()
  if (!industryId) return { message: 'Industry id is required.' }

  const [{ count: companyCount }, { count: positionCount }] = await Promise.all([
    adminClient
      .from('companies')
      .select('id', { count: 'exact', head: true })
      .eq('industry_id', industryId),
    adminClient
      .from('positions')
      .select('id', { count: 'exact', head: true })
      .eq('industry_id', industryId),
  ])

  if ((companyCount ?? 0) > 0 || (positionCount ?? 0) > 0) {
    return {
      message:
        'Cannot delete an industry still used by companies or positions. Remap them first.',
    }
  }

  const { error } = await adminClient.from('industries').delete().eq('id', industryId)
  if (error) return { message: error.message }
  revalidatePath('/admin/industries')
  revalidatePath('/members')
  revalidatePath('/profile/edit')
  return {}
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
