'use server'

import { redirect } from 'next/navigation'
import * as z from 'zod'
import { createClient } from '@/lib/supabase/server'

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

function getSiteOrigin(): string {
  return process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
}

export type AuthState = {
  errors?: Record<string, string[]>
  message?: string
} | undefined

export async function login(prevState: AuthState, formData: FormData): Promise<AuthState> {
  const validated = loginSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  })

  if (!validated.success) {
    return { errors: validated.error.flatten().fieldErrors as Record<string, string[]> }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword(validated.data)

  if (error) {
    return { message: formatAuthErrorMessage(error.message) }
  }

  redirect('/search')
}

export async function register(prevState: AuthState, formData: FormData): Promise<AuthState> {
  const validated = registerSchema.safeParse({
    firstName: formData.get('firstName'),
    lastName: formData.get('lastName'),
    email: formData.get('email'),
    password: formData.get('password'),
    role: formData.get('role'),
  })

  if (!validated.success) {
    return { errors: validated.error.flatten().fieldErrors as Record<string, string[]> }
  }

  const { firstName, lastName, email, password, role } = validated.data

  const supabase = await createClient()
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { first_name: firstName, last_name: lastName, role },
    },
  })

  if (error) {
    return { message: formatAuthErrorMessage(error.message) }
  }

  redirect('/auth/pending')
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

  redirect('/search')
}

export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/auth/login')
}
