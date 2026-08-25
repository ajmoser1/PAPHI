'use server'

import { revalidatePath } from 'next/cache'
import * as z from 'zod'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { hasVisibleContact, VISIBLE_CONTACT_REQUIRED_MESSAGE } from '@/lib/contact'

async function requireAuth() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')
  return { supabase, userId: user.id }
}

async function updateFeaturedPosition(userId: string, positionId: string | null) {
  const supabase = await createClient()
  let { error } = await supabase
    .from('profiles')
    .update({ featured_position_id: positionId })
    .eq('id', userId)

  if (error) {
    ;({ error } = await createAdminClient()
      .from('profiles')
      .update({ featured_position_id: positionId })
      .eq('id', userId))
  }

  return error
}

function companySlug(name: string) {
  const base = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  return `${base}-${Math.random().toString(36).slice(2, 6)}`
}

/** Find or create a company; set industry on create, or backfill if the company has none. */
async function findOrCreateCompany(
  companyName: string,
  userId: string,
  industryId: string | null
): Promise<{ companyId?: string; message?: string }> {
  const admin = createAdminClient()

  const { data: existing } = await admin
    .from('companies')
    .select('id, industry_id')
    .ilike('name', companyName)
    .limit(1)
    .maybeSingle()

  if (existing) {
    if (!existing.industry_id && industryId) {
      await admin
        .from('companies')
        .update({ industry_id: industryId })
        .eq('id', existing.id)
        .is('industry_id', null)
    }
    return { companyId: existing.id }
  }

  const { data: created, error: createErr } = await admin
    .from('companies')
    .insert({
      name: companyName,
      slug: companySlug(companyName),
      status: 'active',
      suggested_by: userId,
      industry_id: industryId,
    })
    .select('id')
    .single()

  if (createErr || !created) return { message: 'Could not save company.' }
  return { companyId: created.id }
}

const profileSchema = z.object({
  firstName: z.string().min(2, { error: 'First name required.' }),
  lastName: z.string().min(2, { error: 'Last name required.' }),
  bio: z.string().optional(),
  graduationYear: z.coerce.number().int().min(1900).max(2100).optional(),
})

export async function updateProfile(_prevState: unknown, formData: FormData) {
  const { supabase, userId } = await requireAuth()

  const validated = profileSchema.safeParse({
    firstName: formData.get('firstName'),
    lastName: formData.get('lastName'),
    bio: formData.get('bio') || undefined,
    graduationYear: formData.get('graduationYear') ? Number(formData.get('graduationYear')) : undefined,
  })

  if (!validated.success) {
    return { errors: validated.error.flatten().fieldErrors }
  }

  const updates = {
    first_name: validated.data.firstName,
    last_name: validated.data.lastName,
    bio: validated.data.bio || null,
    graduation_year: validated.data.graduationYear || null,
  }

  let { error } = await supabase.from('profiles').update(updates).eq('id', userId)
  if (error) {
    ;({ error } = await createAdminClient().from('profiles').update(updates).eq('id', userId))
  }

  if (error) return { message: error.message }
  revalidatePath('/profile/edit')
  return { success: true }
}

export async function updateContactInfo(formData: FormData) {
  const { supabase, userId } = await requireAuth()

  const phoneRaw = (formData.get('phone') as string | null)?.trim() ?? ''
  const digitCount = phoneRaw.replace(/\D/g, '').length
  if (!phoneRaw || digitCount < 10) {
    return { message: 'A valid phone number with at least 10 digits is required.' }
  }

  const email = ((formData.get('email') as string | null) ?? '').trim() || null
  const linkedin_url = ((formData.get('linkedinUrl') as string | null) ?? '').trim() || null

  const { data: existing } = await supabase
    .from('alumni_contact')
    .select('show_email, show_phone, show_linkedin')
    .eq('profile_id', userId)
    .maybeSingle()

  const show_email = existing?.show_email ?? false
  const show_phone = existing?.show_phone ?? true
  const show_linkedin = existing?.show_linkedin ?? false

  if (
    !hasVisibleContact({
      email,
      phone: phoneRaw,
      linkedin_url,
      show_email,
      show_phone,
      show_linkedin,
    })
  ) {
    return { message: VISIBLE_CONTACT_REQUIRED_MESSAGE }
  }

  const data = {
    profile_id: userId,
    email,
    phone: phoneRaw,
    linkedin_url,
    show_email,
    show_phone,
    show_linkedin,
  }

  let { error } = await supabase.from('alumni_contact').upsert(data, { onConflict: 'profile_id' })
  if (error) {
    ;({ error } = await createAdminClient()
      .from('alumni_contact')
      .upsert(data, { onConflict: 'profile_id' }))
  }

  if (error) return { message: error.message }

  await maybeCompleteProfileSetup(userId)

  revalidatePath('/profile/edit')
  revalidatePath('/settings')
  revalidatePath('/members')
  return { success: true }
}

export async function updateContactVisibility(formData: FormData) {
  const { supabase, userId } = await requireAuth()

  const show_email = formData.get('showEmail') === 'true'
  const show_phone = formData.get('showPhone') === 'true'
  const show_linkedin = formData.get('showLinkedin') === 'true'

  const { data: existing } = await supabase
    .from('alumni_contact')
    .select('email, phone, linkedin_url')
    .eq('profile_id', userId)
    .maybeSingle()

  if (!existing) {
    return { message: 'Add your contact details on Profile before changing visibility.' }
  }

  if (
    !hasVisibleContact({
      email: existing.email,
      phone: existing.phone,
      linkedin_url: existing.linkedin_url,
      show_email,
      show_phone,
      show_linkedin,
    })
  ) {
    return { message: VISIBLE_CONTACT_REQUIRED_MESSAGE }
  }

  const data = {
    profile_id: userId,
    email: existing.email,
    phone: existing.phone,
    linkedin_url: existing.linkedin_url,
    show_email,
    show_phone,
    show_linkedin,
  }

  let { error } = await supabase.from('alumni_contact').upsert(data, { onConflict: 'profile_id' })
  if (error) {
    ;({ error } = await createAdminClient()
      .from('alumni_contact')
      .upsert(data, { onConflict: 'profile_id' }))
  }

  if (error) return { message: error.message }

  await maybeCompleteProfileSetup(userId)

  revalidatePath('/settings')
  revalidatePath('/profile/edit')
  revalidatePath('/members')
  return { success: true }
}

async function maybeCompleteProfileSetup(userId: string) {
  const admin = createAdminClient()
  const { data: profile } = await admin
    .from('profiles')
    .select('status, profile_setup_completed_at')
    .eq('id', userId)
    .maybeSingle()

  if (!profile || profile.status !== 'active' || profile.profile_setup_completed_at) {
    return
  }

  const { data: contact } = await admin
    .from('alumni_contact')
    .select('email, phone, linkedin_url, show_email, show_phone, show_linkedin')
    .eq('profile_id', userId)
    .maybeSingle()

  if (!hasVisibleContact(contact)) return

  await admin
    .from('profiles')
    .update({ profile_setup_completed_at: new Date().toISOString() })
    .eq('id', userId)
}

export async function uploadAvatar(formData: FormData) {
  const { supabase, userId } = await requireAuth()

  const file = formData.get('avatar') as File
  if (!file || file.size === 0) return { message: 'No file provided.' }
  if (file.size > 5 * 1024 * 1024) return { message: 'File too large (max 5MB).' }

  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
  const path = `${userId}/avatar-${Date.now()}.${ext}`

  // Use admin client to bypass storage RLS
  const { createAdminClient } = await import('@/lib/supabase/server')
  const admin = createAdminClient()

  // Delete any existing avatar for this user to avoid accumulating old files
  const { data: existing } = await admin.storage.from('avatars').list(userId)
  if (existing?.length) {
    await admin.storage.from('avatars').remove(existing.map((f: { name: string }) => `${userId}/${f.name}`))
  }

  const { error: uploadError } = await admin.storage
    .from('avatars')
    .upload(path, file, { upsert: false })

  if (uploadError) return { message: uploadError.message }

  const { data } = admin.storage.from('avatars').getPublicUrl(path)

  let { error: updateError } = await supabase
    .from('profiles')
    .update({ avatar_url: data.publicUrl })
    .eq('id', userId)

  if (updateError) {
    ;({ error: updateError } = await admin
      .from('profiles')
      .update({ avatar_url: data.publicUrl })
      .eq('id', userId))
  }

  if (updateError) return { message: updateError.message }
  revalidatePath('/profile/edit')
  return { success: true, url: data.publicUrl }
}

export async function removeAvatar() {
  const { supabase, userId } = await requireAuth()

  const { createAdminClient } = await import('@/lib/supabase/server')
  const admin = createAdminClient()

  const { data: existing } = await admin.storage.from('avatars').list(userId)
  if (existing?.length) {
    await admin.storage.from('avatars').remove(existing.map((f: { name: string }) => `${userId}/${f.name}`))
  }

  let { error } = await supabase.from('profiles').update({ avatar_url: null }).eq('id', userId)
  if (error) {
    ;({ error } = await admin.from('profiles').update({ avatar_url: null }).eq('id', userId))
  }

  if (error) return { message: error.message }
  revalidatePath('/profile/edit')
  return { success: true }
}

export async function createPosition(formData: FormData) {
  const { supabase, userId } = await requireAuth()

  const companyName = (formData.get('companyName') as string)?.trim()
  const title = (formData.get('title') as string)?.trim()
  const industryId = (formData.get('industryId') as string) || null
  const startYear = formData.get('startYear') ? Number(formData.get('startYear')) : null
  const isCurrent = formData.get('isCurrent') === 'true'
  const endYear = isCurrent ? null : (formData.get('endYear') ? Number(formData.get('endYear')) : null)

  if (!companyName) return { message: 'Company name is required.' }
  if (!title) return { message: 'Title is required.' }

  const resolved = await findOrCreateCompany(companyName, userId, industryId)
  if (!resolved.companyId) return { message: resolved.message ?? 'Could not save company.' }

  const position = {
    profile_id: userId,
    company_id: resolved.companyId,
    title,
    industry_id: industryId,
    start_year: startYear,
    end_year: endYear,
    is_current: isCurrent,
  }

  let { data: created, error } = await supabase
    .from('positions')
    .insert(position)
    .select('id')
    .single()

  if (error) {
    const admin = createAdminClient()
    ;({ data: created, error } = await admin.from('positions').insert(position).select('id').single())
  }

  if (error || !created) return { message: error?.message ?? 'Could not save position.' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('featured_position_id')
    .eq('id', userId)
    .single()

  if (!profile?.featured_position_id) {
    await updateFeaturedPosition(userId, created.id)
  }

  revalidatePath('/profile/edit')
  revalidatePath('/members')
  return { success: true }
}

export async function setFeaturedPosition(positionId: string) {
  const { supabase, userId } = await requireAuth()

  const { data: position } = await supabase
    .from('positions')
    .select('id')
    .eq('id', positionId)
    .eq('profile_id', userId)
    .single()

  if (!position) return { message: 'Position not found.' }

  const error = await updateFeaturedPosition(userId, positionId)
  if (error) return { message: error.message }

  revalidatePath('/profile/edit')
  revalidatePath('/members')
  return { success: true }
}

export async function updatePosition(positionId: string, formData: FormData) {
  const { supabase, userId } = await requireAuth()

  const companyName = (formData.get('companyName') as string)?.trim()
  const title = (formData.get('title') as string)?.trim()
  const industryId = (formData.get('industryId') as string) || null
  const startYear = formData.get('startYear') ? Number(formData.get('startYear')) : null
  const isCurrent = formData.get('isCurrent') === 'true'
  const endYear = isCurrent ? null : (formData.get('endYear') ? Number(formData.get('endYear')) : null)

  if (!companyName) return { message: 'Company name is required.' }
  if (!title) return { message: 'Title is required.' }

  const resolved = await findOrCreateCompany(companyName, userId, industryId)
  if (!resolved.companyId) return { message: resolved.message ?? 'Could not save company.' }

  const updates = {
    company_id: resolved.companyId,
    title,
    industry_id: industryId,
    start_year: startYear,
    end_year: endYear,
    is_current: isCurrent,
  }

  let { error } = await supabase
    .from('positions')
    .update(updates)
    .eq('id', positionId)
    .eq('profile_id', userId)

  if (error) {
    const admin = createAdminClient()
    ;({ error } = await admin
      .from('positions')
      .update(updates)
      .eq('id', positionId)
      .eq('profile_id', userId))
  }

  if (error) return { message: error.message }
  revalidatePath('/profile/edit')
  return { success: true }
}

export async function deletePosition(positionId: string) {
  const { supabase, userId } = await requireAuth()

  const { data: profile } = await supabase
    .from('profiles')
    .select('featured_position_id')
    .eq('id', userId)
    .single()

  const wasFeatured = profile?.featured_position_id === positionId

  let { error } = await supabase
    .from('positions')
    .delete()
    .eq('id', positionId)
    .eq('profile_id', userId)

  if (error) {
    const admin = createAdminClient()
    ;({ error } = await admin
      .from('positions')
      .delete()
      .eq('id', positionId)
      .eq('profile_id', userId))
  }

  if (error) return { message: error.message }

  if (wasFeatured) {
    const { data: remaining } = await supabase
      .from('positions')
      .select('id')
      .eq('profile_id', userId)
      .order('is_current', { ascending: false })
      .order('start_year', { ascending: false })
      .limit(1)

    await updateFeaturedPosition(userId, remaining?.[0]?.id ?? null)
  }

  revalidatePath('/profile/edit')
  revalidatePath('/members')
  return { success: true }
}
