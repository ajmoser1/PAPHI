'use server'

import { redirect } from 'next/navigation'
import * as z from 'zod'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import {
  DEFAULT_PRIVACY_SETTINGS,
  PASSWORD_REQUIREMENTS_HINT,
  PASSWORD_RULE,
  ROLES,
  STATUS,
  isMembershipIncomplete,
} from '@/lib/constants'
import { classifyAuthError, formatAuthErrorMessage, type AuthErrorCode } from '@/lib/auth-errors'
import { getSiteOrigin } from '@/lib/site'

const passwordSchema = z
  .string()
  .min(8, { error: 'Password must be at least 8 characters.' })
  .regex(PASSWORD_RULE, { error: PASSWORD_REQUIREMENTS_HINT })

const loginSchema = z.object({
  email: z.email({ error: 'Enter the email you registered with.' }),
  password: z.string().min(1, { error: 'Enter your password.' }),
})

const phoneSchema = z
  .string()
  .trim()
  .min(1, { error: 'Enter a phone number so your chapter admin can verify you.' })
  .refine((value) => value.replace(/\D/g, '').length >= 10, {
    error: 'Enter a phone number with at least 10 digits, like 412 555 0100.',
  })

const graduationYearSchema = z.coerce
  .number({ error: 'Enter your graduation year (or expected year).' })
  .int({ error: 'Enter a four-digit year.' })
  .min(1950, { error: 'Enter a year between 1950 and 2100.' })
  .max(2100, { error: 'Enter a year between 1950 and 2100.' })

const nameSchema = (label: string) =>
  z.string().trim().min(1, { error: `Enter your ${label}.` }).max(80, { error: `${label} is too long.` })

const roleSchema = z.enum(['undergrad', 'alumni'], {
  error: 'Choose whether you are a current undergrad or a graduate.',
})

const registerSchema = z.object({
  firstName: nameSchema('first name'),
  lastName: nameSchema('last name'),
  email: z.email({ error: 'Enter a valid email address.' }),
  phone: phoneSchema,
  graduationYear: graduationYearSchema,
  password: passwordSchema,
  role: roleSchema,
  inviteToken: z.string().optional(),
  chapterId: z.string().optional(),
})

const completeSignupSchema = z.object({
  firstName: nameSchema('first name'),
  lastName: nameSchema('last name'),
  phone: phoneSchema,
  graduationYear: graduationYearSchema,
  role: roleSchema,
  inviteToken: z.string().optional(),
  chapterId: z.string().optional(),
})

const forgotPasswordSchema = z.object({
  email: z.email({ error: 'Enter the email you registered with.' }),
})

const resetPasswordSchema = z
  .object({
    password: passwordSchema,
    confirmPassword: z.string().min(1, { error: 'Type your new password again.' }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'The two passwords do not match.',
    path: ['confirmPassword'],
  })

export type AuthState =
  | {
      errors?: Record<string, string[]>
      /** Form-level message, shown in the focused alert above the form. */
      message?: string
      /** True when `message` is a success / next-step notice rather than an error. */
      success?: boolean
      /** Lets the form offer a recovery action (resend confirmation, sign in, new link). */
      code?: AuthErrorCode
      /** Submitted values so the form can repopulate after React resets it. Never includes passwords. */
      values?: Record<string, string>
    }
  | undefined

function fieldErrors(error: z.ZodError): Record<string, string[]> {
  return z.flattenError(error).fieldErrors as Record<string, string[]>
}

function str(formData: FormData, key: string): string {
  const v = formData.get(key)
  return typeof v === 'string' ? v : ''
}

function pickValues(formData: FormData, keys: string[]): Record<string, string> {
  return Object.fromEntries(keys.map((k) => [k, str(formData, k)]))
}

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
  const { userId, firstName, lastName, email, phone, graduationYear, role, inviteToken, chapterId } = params

  if (!inviteToken && !chapterId) {
    return {
      errors: { chapterId: ['Choose your chapter, or open the invite link your chapter admin sent you.'] },
    }
  }

  const resolvedChapter = await resolveChapter(inviteToken, chapterId)
  if (!resolvedChapter) {
    if (inviteToken) {
      return {
        message:
          'That invite link has expired or is not valid any more. Ask your chapter admin for a current link, or pick your chapter from the list.',
      }
    }
    return {
      errors: { chapterId: ['That chapter is not available right now. Choose another, or request yours.'] },
    }
  }

  const isChapterContact =
    !!resolvedChapter.contactEmail && resolvedChapter.contactEmail.toLowerCase() === email.toLowerCase()

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
        'Your account was created, but we could not finish setting up your profile. Sign in and try again, and contact your chapter admin if it keeps happening.',
    }
  }

  const { error: contactError } = await adminClient.from('alumni_contact').upsert(
    {
      profile_id: userId,
      email,
      phone,
      // Phone is collected for admin verification and starts visible so the
      // member already meets the "at least one displayed contact" rule.
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
      errors: { phone: ['We could not save this phone number. Check it and try again.'] },
    }
  }

  return undefined
}

export async function login(prevState: AuthState, formData: FormData): Promise<AuthState> {
  const values = pickValues(formData, ['email'])
  const validated = loginSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  })

  if (!validated.success) {
    return { errors: fieldErrors(validated.error), values }
  }

  const supabase = await createClient()
  const { data: authData, error } = await supabase.auth.signInWithPassword(validated.data)

  if (error) {
    return { message: formatAuthErrorMessage(error.message), code: classifyAuthError(error.message), values }
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

const REGISTER_VALUE_KEYS = ['firstName', 'lastName', 'email', 'phone', 'graduationYear', 'role', 'chapterId']

export async function register(prevState: AuthState, formData: FormData): Promise<AuthState> {
  const values = pickValues(formData, REGISTER_VALUE_KEYS)
  const validated = registerSchema.safeParse({
    firstName: formData.get('firstName'),
    lastName: formData.get('lastName'),
    email: formData.get('email'),
    phone: formData.get('phone'),
    graduationYear: formData.get('graduationYear'),
    password: formData.get('password'),
    role: formData.get('role'),
    inviteToken: str(formData, 'inviteToken') || undefined,
    chapterId: str(formData, 'chapterId') || undefined,
  })

  if (!validated.success) {
    return { errors: fieldErrors(validated.error), values }
  }

  const { firstName, lastName, email, phone, graduationYear, password, role, inviteToken, chapterId } =
    validated.data

  if (!inviteToken && !chapterId) {
    return {
      errors: { chapterId: ['Choose your chapter, or open the invite link your chapter admin sent you.'] },
      values,
    }
  }

  // If email confirmation is on, the confirmation link lands on our callback.
  // Carrying the invite token keeps the chapter pre-selected on the way back.
  const callback = new URL('/api/auth/callback', getSiteOrigin())
  if (inviteToken) callback.searchParams.set('invite', inviteToken)

  const supabase = await createClient()
  const { data: signUpData, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: callback.toString(),
      data: {
        first_name: firstName,
        last_name: lastName,
        // Prefill-only hints for complete-signup after email confirmation.
        // Server actions re-validate every one of these; handle_new_user
        // ignores them by design (role/status are never taken from metadata).
        signup_phone: phone,
        signup_graduation_year: graduationYear,
        signup_role: role,
        signup_chapter_id: chapterId ?? null,
        signup_invite_token: inviteToken ?? null,
      },
    },
  })

  if (error) {
    return { message: formatAuthErrorMessage(error.message), code: classifyAuthError(error.message), values }
  }

  if (!signUpData.session) {
    return {
      success: true,
      message: `We sent a confirmation link to ${email}. Open it to finish creating your account. We saved what you entered, so you won't have to type it again.`,
      values,
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
    if (profileResult) return { ...profileResult, values }
  }

  redirect('/profile/edit')
}

const COMPLETE_VALUE_KEYS = ['firstName', 'lastName', 'phone', 'graduationYear', 'role', 'chapterId']

export async function completeSignup(prevState: AuthState, formData: FormData): Promise<AuthState> {
  const values = pickValues(formData, COMPLETE_VALUE_KEYS)
  const validated = completeSignupSchema.safeParse({
    firstName: formData.get('firstName'),
    lastName: formData.get('lastName'),
    phone: formData.get('phone'),
    graduationYear: formData.get('graduationYear'),
    role: formData.get('role'),
    inviteToken: str(formData, 'inviteToken') || undefined,
    chapterId: str(formData, 'chapterId') || undefined,
  })

  if (!validated.success) {
    return { errors: fieldErrors(validated.error), values }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user?.email) {
    return { message: 'Your session expired. Sign in again to continue.', code: 'link_expired', values }
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

  const { firstName, lastName, phone, graduationYear, role, inviteToken, chapterId } = validated.data
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
  if (profileResult) return { ...profileResult, values }

  redirect('/profile/edit')
}

export async function requestPasswordReset(prevState: AuthState, formData: FormData): Promise<AuthState> {
  const values = pickValues(formData, ['email'])
  const validated = forgotPasswordSchema.safeParse({
    email: formData.get('email'),
  })

  if (!validated.success) {
    return { errors: fieldErrors(validated.error), values }
  }

  const supabase = await createClient()
  const origin = getSiteOrigin()
  await supabase.auth.resetPasswordForEmail(validated.data.email, {
    redirectTo: `${origin}/api/auth/callback?next=/auth/reset-password`,
  })

  return {
    success: true,
    message: `If there is an account for ${validated.data.email}, a reset link is on its way. Check your spam folder if it does not arrive in a few minutes.`,
    values,
  }
}

export async function resetPassword(prevState: AuthState, formData: FormData): Promise<AuthState> {
  const validated = resetPasswordSchema.safeParse({
    password: formData.get('password'),
    confirmPassword: formData.get('confirmPassword'),
  })

  if (!validated.success) {
    return { errors: fieldErrors(validated.error) }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.updateUser({ password: validated.data.password })

  if (error) {
    return { message: formatAuthErrorMessage(error.message), code: classifyAuthError(error.message) }
  }

  redirect('/members')
}

/** Re-send the signup confirmation email. Response is the same whether or not the address exists. */
export async function resendConfirmation(prevState: AuthState, formData: FormData): Promise<AuthState> {
  const validated = forgotPasswordSchema.safeParse({ email: formData.get('email') })
  if (!validated.success) {
    return { errors: fieldErrors(validated.error) }
  }

  const supabase = await createClient()
  await supabase.auth.resend({
    type: 'signup',
    email: validated.data.email,
    options: { emailRedirectTo: `${getSiteOrigin()}/api/auth/callback` },
  })

  return {
    success: true,
    message: `Sent. Check ${validated.data.email} (and your spam folder) for a new confirmation link.`,
  }
}

export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/auth/login')
}
