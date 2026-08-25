'use server'

import { redirect } from 'next/navigation'
import * as z from 'zod'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { DEFAULT_PRIVACY_SETTINGS, ROLES, STATUS, isMembershipIncomplete } from '@/lib/constants'
import { formatAuthErrorMessage } from '@/lib/auth-errors'
import { getSiteOrigin } from '@/lib/site'

const loginSchema = z.object({
  email: z.email({ error: 'Please enter a valid email.' }),
  password: z.string().min(6, { error: 'Password must be at least 6 characters.' }),
})

const phoneSchema = z
  .string()
  .trim()
  .min(1, { error: 'Phone number is required.' })
  .refine((value) => value.replace(/\D/g, '').length >= 10, {
    error: 'Enter a valid phone number with at least 10 digits.',
  })

const graduationYearSchema = z.coerce
  .number({ error: 'Graduation year is required.' })
  .int({ error: 'Enter a valid graduation year.' })
  .min(1950, { error: 'Enter a valid graduation year.' })
  .max(2100, { error: 'Enter a valid graduation year.' })

const registerSchema = z.object({
  firstName: z.string().min(2, { error: 'First name must be at least 2 characters.' }),
  lastName: z.string().min(2, { error: 'Last name must be at least 2 characters.' }),
  email: z.email({ error: 'Please enter a valid email.' }),
  phone: phoneSchema,
  graduationYear: graduationYearSchema,
  password: z.string().min(8, { error: 'Password must be at least 8 characters.' }),
  role: z.enum(['undergrad', 'alumni'], { error: 'Please select a role.' }),
  inviteToken: z.string().optional(),
  chapterId: z.string().optional(),
})

const completeGoogleSignupSchema = z.object({
  firstName: z.string().min(2, { error: 'First name must be at least 2 characters.' }),
  lastName: z.string().min(2, { error: 'Last name must be at least 2 characters.' }),
  phone: phoneSchema,
  graduationYear: graduationYearSchema,
  role: z.enum(['undergrad', 'alumni'], { error: 'Please select a role.' }),
  inviteToken: z.string().optional(),
  chapterId: z.string().optional(),
})

const forgotPasswordSchema = z.object({
  email: z.email({ error: 'Please enter a valid email.' }),
})

const resetPasswordSchema = z
  .object({
    password: z.string().min(8, { error: 'Password must be at least 8 characters.' }),
    confirmPassword: z.string().min(8, { error: 'Please confirm your password.' }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match.',
    path: ['confirmPassword'],
  })

export type AuthState = {
  errors?: Record<string, string[]>
  message?: string
} | undefined

type ResolvedChapter = { id: string; contactEmail: string | null }

async function resolveChapter(inviteToken?: string, chapterId?: string): Promise<ResolvedChapter | null> {
  const adminClient = createAdminClient()

  if (inviteToken) {
    const { data: chapter } = await adminClient
      .from('chapters')
      .select('id, contact_email')
      .eq('invite_token', inviteToken)
      .eq('status', 'active')
      .single()
    return chapter ? { id: chapter.id, contactEmail: chapter.contact_email } : null
  }

  if (chapterId) {
    const { data: chapter } = await adminClient
      .from('chapters')
      .select('id, contact_email')
      .eq('id', chapterId)
      .eq('status', 'active')
      .single()
    return chapter ? { id: chapter.id, contactEmail: chapter.contact_email } : null
  }

  // No implicit default — callers must provide either an invite token or chapter id.
  return null
}

async function createMemberProfile(params: {
  userId: string
  firstName: string
  lastName: string
  email: string
  phone: string
  graduationYear: number
  role: 'undergrad' | 'alumni'
  inviteToken?: string
  chapterId?: string
}): Promise<AuthState> {
  const {
    userId,
    firstName,
    lastName,
    email,
    phone,
    graduationYear,
    role,
    inviteToken,
    chapterId,
  } = params

  if (!inviteToken && !chapterId) {
    return {
      message: 'Please select your chapter or use an invite link from your chapter admin.',
    }
  }

  const resolvedChapter = await resolveChapter(inviteToken, chapterId)
  if (!resolvedChapter) {
    if (inviteToken) {
      return {
        message:
          'This invite link is invalid or the chapter is not active. Ask your chapter admin for a current invite link.',
      }
    }
    return {
      message: 'Selected chapter is unavailable. Choose another chapter or request your chapter first.',
    }
  }

  const isChapterContact =
    !!resolvedChapter.contactEmail &&
    resolvedChapter.contactEmail.toLowerCase() === email.toLowerCase()

  const adminClient = createAdminClient()
  const { error: profileError } = await adminClient.from('profiles').upsert(
    {
      id: userId,
      first_name: firstName,
      last_name: lastName,
      role: isChapterContact ? ROLES.CHAPTER_ADMIN : role,
      status: isChapterContact ? STATUS.ACTIVE : STATUS.PENDING_APPROVAL,
      chapter_id: resolvedChapter.id,
      graduation_year: graduationYear,
      privacy_settings: DEFAULT_PRIVACY_SETTINGS,
    },
    { onConflict: 'id' }
  )

  if (profileError) {
    return {
      message:
        'Your account was created, but profile setup did not finish. Try signing in again, and contact support if this keeps happening.',
    }
  }

  const { error: contactError } = await adminClient.from('alumni_contact').upsert(
    {
      profile_id: userId,
      email,
      phone,
      // Phone is collected for admin verification and starts visible so the
      // member already meets the “at least one displayed contact” rule.
      show_phone: true,
      show_email: false,
      show_linkedin: false,
    },
    { onConflict: 'profile_id' }
  )

  if (contactError) {
    // Keep membership incomplete so proxy sends them back through complete-signup /
    // profile edit instead of letting admins approve a contact-less stub.
    await adminClient
      .from('profiles')
      .update({
        role: ROLES.PENDING,
        status: STATUS.PENDING_APPROVAL,
        chapter_id: null,
        graduation_year: null,
      })
      .eq('id', userId)

    return {
      message:
        'We could not save your phone number. Try again, or sign in and finish signup with a valid phone number.',
    }
  }

  return undefined
}

export async function login(prevState: AuthState, formData: FormData): Promise<AuthState> {
  const validated = loginSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  })

  if (!validated.success) {
    return { errors: validated.error.flatten().fieldErrors as Record<string, string[]> }
  }

  const supabase = await createClient()
  const { data: authData, error } = await supabase.auth.signInWithPassword(validated.data)

  if (error) {
    return { message: formatAuthErrorMessage(error.message) }
  }

  if (authData.user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('status')
      .eq('id', authData.user.id)
      .single()

    if (profile?.status === 'pending_approval') {
      redirect('/profile/edit')
    }
  }

  redirect('/members')
}

export async function register(prevState: AuthState, formData: FormData): Promise<AuthState> {
  const validated = registerSchema.safeParse({
    firstName: formData.get('firstName'),
    lastName: formData.get('lastName'),
    email: formData.get('email'),
    phone: formData.get('phone'),
    graduationYear: formData.get('graduationYear'),
    password: formData.get('password'),
    role: formData.get('role'),
    inviteToken: (formData.get('inviteToken') as string) || undefined,
    chapterId: (formData.get('chapterId') as string) || undefined,
  })

  if (!validated.success) {
    return { errors: validated.error.flatten().fieldErrors as Record<string, string[]> }
  }

  const {
    firstName,
    lastName,
    email,
    phone,
    graduationYear,
    password,
    role,
    inviteToken,
    chapterId,
  } = validated.data

  const supabase = await createClient()
  const { data: signUpData, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { first_name: firstName, last_name: lastName, role },
    },
  })

  if (error) {
    return { message: formatAuthErrorMessage(error.message) }
  }

  if (!signUpData.session) {
    return {
      message:
        'Check your email to confirm your account, then sign in to complete your profile.',
    }
  }

  if (signUpData.user) {
    const profileResult = await createMemberProfile({
      userId: signUpData.user.id,
      firstName,
      lastName,
      email,
      phone,
      graduationYear,
      role,
      inviteToken,
      chapterId,
    })
    if (profileResult) return profileResult
  }

  redirect('/profile/edit')
}

export async function completeGoogleSignup(
  prevState: AuthState,
  formData: FormData
): Promise<AuthState> {
  const validated = completeGoogleSignupSchema.safeParse({
    firstName: formData.get('firstName'),
    lastName: formData.get('lastName'),
    phone: formData.get('phone'),
    graduationYear: formData.get('graduationYear'),
    role: formData.get('role'),
    inviteToken: (formData.get('inviteToken') as string) || undefined,
    chapterId: (formData.get('chapterId') as string) || undefined,
  })

  if (!validated.success) {
    return { errors: validated.error.flatten().fieldErrors as Record<string, string[]> }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user?.email) {
    return { message: 'Your Google session expired. Please sign in again.' }
  }

  const { data: existingProfile } = await supabase
    .from('profiles')
    .select('status, role, chapter_id')
    .eq('id', user.id)
    .maybeSingle()

  if (existingProfile && !isMembershipIncomplete(existingProfile)) {
    if (existingProfile.status === STATUS.PENDING_APPROVAL) {
      redirect('/profile/edit')
    }
    redirect('/members')
  }

  const { firstName, lastName, phone, graduationYear, role, inviteToken, chapterId } =
    validated.data
  const profileResult = await createMemberProfile({
    userId: user.id,
    firstName,
    lastName,
    email: user.email,
    phone,
    graduationYear,
    role,
    inviteToken,
    chapterId,
  })
  if (profileResult) return profileResult

  redirect('/profile/edit')
}

export async function requestPasswordReset(
  prevState: AuthState,
  formData: FormData
): Promise<AuthState> {
  const validated = forgotPasswordSchema.safeParse({
    email: formData.get('email'),
  })

  if (!validated.success) {
    return { errors: validated.error.flatten().fieldErrors as Record<string, string[]> }
  }

  const supabase = await createClient()
  const origin = getSiteOrigin()
  await supabase.auth.resetPasswordForEmail(validated.data.email, {
    redirectTo: `${origin}/api/auth/callback?next=/auth/reset-password`,
  })

  return {
    message:
      'If an account exists for that email, you will receive a password reset link shortly.',
  }
}

export async function resetPassword(prevState: AuthState, formData: FormData): Promise<AuthState> {
  const validated = resetPasswordSchema.safeParse({
    password: formData.get('password'),
    confirmPassword: formData.get('confirmPassword'),
  })

  if (!validated.success) {
    return { errors: validated.error.flatten().fieldErrors as Record<string, string[]> }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.updateUser({ password: validated.data.password })

  if (error) {
    return { message: formatAuthErrorMessage(error.message) }
  }

  redirect('/members')
}

export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/auth/login')
}
