'use server'

import { revalidatePath } from 'next/cache'
import * as z from 'zod'
import { createClient, createAdminClient } from '@/lib/supabase/server'

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  if (profile?.role !== 'admin') throw new Error('Forbidden')
  return { supabase, adminClient: createAdminClient() }
}

export async function approveUser(profileId: string) {
  const { supabase } = await requireAdmin()
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', profileId)
    .single()

  // Activate the profile using service role (bypasses RLS restrictions on status/role)
  const adminClient = createAdminClient()
  const { error } = await adminClient
    .from('profiles')
    .update({ status: 'active', role: profile?.role === 'pending' ? 'undergrad' : profile?.role })
    .eq('id', profileId)

  if (error) throw new Error(error.message)
  revalidatePath('/admin/approvals')
}

export async function rejectUser(profileId: string) {
  await requireAdmin()
  const adminClient = createAdminClient()
  const { error } = await adminClient
    .from('profiles')
    .update({ status: 'suspended' })
    .eq('id', profileId)
  if (error) throw new Error(error.message)
  revalidatePath('/admin/approvals')
}

const companySchema = z.object({
  name: z.string().min(1, { error: 'Name is required.' }),
  slug: z.string().min(1, { error: 'Slug is required.' }),
  industryId: z.string().optional(),
  website: z.string().optional(),
})

export async function createCompany(formData: FormData): Promise<void> {
  await requireAdmin()
  const validated = companySchema.safeParse({
    name: formData.get('name'),
    slug: formData.get('slug'),
    industryId: formData.get('industryId') || undefined,
    website: formData.get('website') || undefined,
  })
  if (!validated.success) return
  const adminClient = createAdminClient()
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
  await requireAdmin()
  const name = (formData.get('name') as string)?.trim()
  if (!name) return
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
  const adminClient = createAdminClient()
  await adminClient.from('industries').insert({ name, slug })
  revalidatePath('/admin/industries')
}
