'use server'

import { revalidatePath } from 'next/cache'
import * as z from 'zod'
import { createClient } from '@/lib/supabase/server'

async function requireAuth() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')
  return { supabase, userId: user.id }
}

const profileSchema = z.object({
  firstName: z.string().min(2, { error: 'First name required.' }),
  lastName: z.string().min(2, { error: 'Last name required.' }),
  bio: z.string().optional(),
  graduationYear: z.coerce.number().int().min(1900).max(2100).optional(),
  chapter: z.string().optional(),
})

export async function updateProfile(_prevState: unknown, formData: FormData) {
  const { supabase, userId } = await requireAuth()

  const validated = profileSchema.safeParse({
    firstName: formData.get('firstName'),
    lastName: formData.get('lastName'),
    bio: formData.get('bio') || undefined,
    graduationYear: formData.get('graduationYear') ? Number(formData.get('graduationYear')) : undefined,
    chapter: formData.get('chapter') || undefined,
  })

  if (!validated.success) {
    return { errors: validated.error.flatten().fieldErrors }
  }

  const { error } = await supabase
    .from('profiles')
    .update({
      first_name: validated.data.firstName,
      last_name: validated.data.lastName,
      bio: validated.data.bio || null,
      graduation_year: validated.data.graduationYear || null,
      chapter: validated.data.chapter || null,
    })
    .eq('id', userId)

  if (error) return { message: error.message }
  revalidatePath('/profile/edit')
  return { success: true }
}

export async function updateContactInfo(formData: FormData) {
  const { supabase, userId } = await requireAuth()

  const data = {
    profile_id: userId,
    email: formData.get('email') as string || null,
    phone: formData.get('phone') as string || null,
    linkedin_url: formData.get('linkedinUrl') as string || null,
    show_email: formData.get('showEmail') === 'true',
    show_phone: formData.get('showPhone') === 'true',
    show_linkedin: formData.get('showLinkedin') === 'true',
  }

  const { error } = await supabase
    .from('alumni_contact')
    .upsert(data, { onConflict: 'profile_id' })

  if (error) return { message: error.message }
  revalidatePath('/profile/edit')
  return { success: true }
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
    await admin.storage.from('avatars').remove(existing.map((f) => `${userId}/${f.name}`))
  }

  const { error: uploadError } = await admin.storage
    .from('avatars')
    .upload(path, file, { upsert: false })

  if (uploadError) return { message: uploadError.message }

  const { data } = admin.storage.from('avatars').getPublicUrl(path)

  const { error: updateError } = await supabase
    .from('profiles')
    .update({ avatar_url: data.publicUrl })
    .eq('id', userId)

  if (updateError) return { message: updateError.message }
  revalidatePath('/profile/edit')
  return { success: true, url: data.publicUrl }
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

  // Find or create the company using service role (bypasses RLS)
  const { createAdminClient } = await import('@/lib/supabase/server')
  const admin = createAdminClient()

  const { data: existing } = await admin
    .from('companies')
    .select('id')
    .ilike('name', companyName)
    .limit(1)
    .maybeSingle()

  let companyId: string

  if (existing) {
    companyId = existing.id
  } else {
    const baseSlug = companyName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    const slug = `${baseSlug}-${Math.random().toString(36).slice(2, 6)}`
    const { data: created, error: createErr } = await admin
      .from('companies')
      .insert({ name: companyName, slug, status: 'active', suggested_by: userId })
      .select('id')
      .single()
    if (createErr || !created) return { message: 'Could not save company.' }
    companyId = created.id
  }

  const { error } = await supabase.from('positions').insert({
    profile_id: userId,
    company_id: companyId,
    title,
    industry_id: industryId,
    start_year: startYear,
    end_year: endYear,
    is_current: isCurrent,
  })

  if (error) return { message: error.message }
  revalidatePath('/profile/edit')
  return { success: true }
}

export async function deletePosition(positionId: string) {
  const { supabase, userId } = await requireAuth()
  const { error } = await supabase
    .from('positions')
    .delete()
    .eq('id', positionId)
    .eq('profile_id', userId)
  if (error) return { message: error.message }
  revalidatePath('/profile/edit')
  return { success: true }
}
