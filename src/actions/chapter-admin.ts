'use server'

import { revalidatePath } from 'next/cache'
import * as z from 'zod'
import { requireChapterAdmin } from '@/lib/auth'
import { requireAuth } from '@/lib/auth'
import { DEFAULT_PRIVACY_SETTINGS, ROLES } from '@/lib/constants'

const brandingSchema = z.object({
  displayTitle: z.string().min(1),
  tagline: z.string().optional(),
  schoolName: z.string().optional(),
  primaryColor: z.string().optional(),
  accentColor: z.string().optional(),
})

export async function updateChapterBranding(formData: FormData) {
  const { profile, adminClient } = await requireChapterAdmin()

  const chapterId =
    profile.role === ROLES.FOUNDER
      ? (formData.get('chapterId') as string) || profile.chapter_id
      : profile.chapter_id

  if (!chapterId) throw new Error('Chapter ID required.')

  const validated = brandingSchema.safeParse({
    displayTitle: formData.get('displayTitle'),
    tagline: formData.get('tagline') || undefined,
    schoolName: formData.get('schoolName') || undefined,
    primaryColor: formData.get('primaryColor') || undefined,
    accentColor: formData.get('accentColor') || undefined,
  })

  if (!validated.success) throw new Error('Invalid branding data.')

  const { error } = await adminClient
    .from('chapters')
    .update({
      display_title: validated.data.displayTitle,
      tagline: validated.data.tagline ?? null,
      school_name: validated.data.schoolName ?? null,
      primary_color: validated.data.primaryColor ?? null,
      accent_color: validated.data.accentColor ?? null,
    })
    .eq('id', chapterId)

  if (error) throw new Error(error.message)

  revalidatePath('/admin/customize')
  revalidatePath('/')
  revalidatePath('/members')
}

export async function setSearchScope(scope: 'fraternity' | 'chapter') {
  const { supabase, userId } = await requireAuth()

  const { error } = await supabase
    .from('profiles')
    .update({ search_scope: scope })
    .eq('id', userId)

  if (error) throw new Error(error.message)
  revalidatePath('/members')
  revalidatePath('/settings')
}

const privacySchema = z.object({
  visibilityScope: z.enum(['chapter', 'fraternity', 'hidden']),
  showContactTo: z.enum(['chapter', 'fraternity', 'hidden']),
  showBioTo: z.enum(['chapter', 'fraternity', 'hidden']),
})

export async function updatePrivacySettings(formData: FormData) {
  const { supabase, userId } = await requireAuth()

  const validated = privacySchema.safeParse({
    visibilityScope: formData.get('visibilityScope'),
    showContactTo: formData.get('showContactTo'),
    showBioTo: formData.get('showBioTo'),
  })

  if (!validated.success) throw new Error('Invalid privacy settings.')

  const updates = {
    visibility_scope: validated.data.visibilityScope,
    privacy_settings: {
      show_contact_to: validated.data.showContactTo,
      show_positions_to: DEFAULT_PRIVACY_SETTINGS.show_positions_to,
      show_bio_to: validated.data.showBioTo,
    },
  }

  let { error } = await supabase.from('profiles').update(updates).eq('id', userId)
  if (error) {
    const { createAdminClient } = await import('@/lib/supabase/server')
    ;({ error } = await createAdminClient().from('profiles').update(updates).eq('id', userId))
  }

  if (error) throw new Error(error.message)
  revalidatePath('/settings')
  revalidatePath('/profile/edit')
}
