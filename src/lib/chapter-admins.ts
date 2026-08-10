import { createAdminClient } from '@/lib/supabase/server'
import { ROLES } from '@/lib/constants'

export type ChapterAdminContact = {
  profileId: string
  firstName: string
  lastName: string
  /** Preferred outreach channel for pending members. */
  contactType: 'email' | 'phone' | 'linkedin' | null
  contactValue: string | null
}

export type ChapterAdminContactsResult = {
  admins: ChapterAdminContact[]
  /** Chapter-level fallback when no admin has a public contact. */
  chapterContactEmail: string | null
}

type AdminProfileRow = {
  id: string
  first_name: string | null
  last_name: string | null
}

type AdminContactRow = {
  profile_id: string
  email: string | null
  phone: string | null
  linkedin_url: string | null
  show_email: boolean | null
  show_phone: boolean | null
  show_linkedin: boolean | null
}

/**
 * Pending members cannot read other profiles' contact via RLS.
 * Fetch chapter admins with the service role, scoped to one chapter.
 */
export async function getChapterAdminContacts(
  chapterId: string | null | undefined
): Promise<ChapterAdminContactsResult> {
  if (!chapterId) {
    return { admins: [], chapterContactEmail: null }
  }

  const adminClient = createAdminClient()

  const [{ data: chapter }, { data: adminProfiles }] = await Promise.all([
    adminClient.from('chapters').select('contact_email').eq('id', chapterId).maybeSingle(),
    adminClient
      .from('profiles')
      .select('id, first_name, last_name')
      .eq('chapter_id', chapterId)
      .eq('status', 'active')
      .in('role', [ROLES.CHAPTER_ADMIN, ROLES.ADMIN, ROLES.FOUNDER])
      .order('first_name', { ascending: true }),
  ])

  const profiles = (adminProfiles ?? []) as AdminProfileRow[]
  if (profiles.length === 0) {
    return {
      admins: [],
      chapterContactEmail: (chapter as { contact_email: string | null } | null)?.contact_email ?? null,
    }
  }

  const ids = profiles.map((p) => p.id)
  const { data: contacts } = await adminClient
    .from('alumni_contact')
    .select('profile_id, email, phone, linkedin_url, show_email, show_phone, show_linkedin')
    .in('profile_id', ids)

  const contactById = new Map(
    ((contacts ?? []) as AdminContactRow[]).map((c) => [c.profile_id, c])
  )

  const admins: ChapterAdminContact[] = profiles.map((p) => {
    const c = contactById.get(p.id)
    let contactType: ChapterAdminContact['contactType'] = null
    let contactValue: string | null = null

    if (c?.show_email && c.email?.trim()) {
      contactType = 'email'
      contactValue = c.email.trim()
    } else if (c?.show_phone && c.phone?.trim()) {
      contactType = 'phone'
      contactValue = c.phone.trim()
    } else if (c?.show_linkedin && c.linkedin_url?.trim()) {
      contactType = 'linkedin'
      contactValue = c.linkedin_url.trim()
    }

    return {
      profileId: p.id,
      firstName: p.first_name ?? '',
      lastName: p.last_name ?? '',
      contactType,
      contactValue,
    }
  })

  return {
    admins,
    chapterContactEmail: (chapter as { contact_email: string | null } | null)?.contact_email ?? null,
  }
}
