'use server'

import { redirect } from 'next/navigation'
import * as z from 'zod'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { getSiteOrigin } from '@/lib/site'

function formatAuthErrorMessage(message: string): string {
  const normalized = message.toLowerCase()

  if (
    normalized.includes('password') &&
    normalized.includes('uppercase') &&
    normalized.includes('lowercase') &&
    normalized.includes('number')
  ) {
    return 'Your password must include an uppercase character, a lowercase character, and a number.'
  }

  return message
}

const loginSchema = z.object({
  email: z.email({ error: 'Please enter a valid email.' }),
  password: z.string().min(6, { error: 'Password must be at least 6 characters.' }),
})

const registerSchema = z.object({
  firstName: z.string().min(2, { error: 'First name must be at least 2 characters.' }),
  lastName: z.string().min(2, { error: 'Last name must be at least 2 characters.' }),
  email: z.email({ error: 'Please enter a valid email.' }),
  password: z.string().min(8, { error: 'Password must be at least 8 characters.' }),
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

async function resolveChapterId(inviteToken?: string, chapterId?: string): Promise<string | null> {
  const adminClient = createAdminClient()

  if (inviteToken) {
    const { data: chapter } = await adminClient
      .from('chapters')
      .select('id')
      .eq('invite_token', inviteToken)
      .eq('status', 'active')
      .single()
    return chapter?.id ?? null
  }

  if (chapterId) {
    const { data: chapter } = await adminClient
      .from('chapters')
      .select('id')
      .eq('id', chapterId)
      .eq('status', 'active')
      .single()
    return chapter?.id ?? null
  }

  // Default to CMU PA PHI for backwards compatibility
  const { data: defaultChapter } = await adminClient
    .from('chapters')
    .select('id')
    .eq('slug', 'cmu-paphi')
    .single()
  return defaultChapter?.id ?? null
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
    password: formData.get('password'),
    role: formData.get('role'),
    inviteToken: (formData.get('inviteToken') as string) || undefined,
    chapterId: (formData.get('chapterId') as string) || undefined,
  })

  if (!validated.success) {
    return { errors: validated.error.flatten().fieldErrors as Record<string, string[]> }
  }

  const { firstName, lastName, email, password, role, inviteToken, chapterId } = validated.data

  const resolvedChapterId = await resolveChapterId(inviteToken, chapterId)
  if (!resolvedChapterId) {
    return { message: 'Invalid invite link or chapter. Please contact your chapter admin.' }
  }

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
    const adminClient = createAdminClient()
    const { error: profileError } = await adminClient.from('profiles').upsert(
      {
        id: signUpData.user.id,
        first_name: firstName,
        last_name: lastName,
        role,
        status: 'pending_approval',
        chapter_id: resolvedChapterId,
      },
      { onConflict: 'id' }
    )

    if (profileError) {
      return { message: 'Account created but profile setup failed. Please contact support.' }
    }
  }

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
