'use server'

import { redirect } from 'next/navigation'
import * as z from 'zod'
import { createClient } from '@/lib/supabase/server'

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
    return { message: error.message }
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
    return { message: error.message }
  }

  redirect('/auth/pending')
}

export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/auth/login')
}
