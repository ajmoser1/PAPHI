import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isMembershipIncomplete, STATUS } from '@/lib/constants'

const ALLOWED_NEXT_PATHS = new Set(['/auth/reset-password'])

function safeNextPath(next: string | null): string | null {
  if (!next || !next.startsWith('/') || next.startsWith('//')) return null
  return ALLOWED_NEXT_PATHS.has(next) ? next : null
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const invite = searchParams.get('invite')
  const from = searchParams.get('from')
  const next = safeNextPath(searchParams.get('next'))

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      if (next) {
        return NextResponse.redirect(`${origin}${next}`)
      }

      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('status, role, chapter_id')
          .eq('id', user.id)
          .maybeSingle()

        if (!isMembershipIncomplete(profile)) {
          if (profile!.status === STATUS.PENDING_APPROVAL) {
            return NextResponse.redirect(`${origin}/profile/edit`)
          }
          return NextResponse.redirect(`${origin}/members`)
        }
      }

      const completeUrl = new URL('/auth/complete-signup', origin)
      if (invite) completeUrl.searchParams.set('invite', invite)
      if (from) completeUrl.searchParams.set('from', from)
      return NextResponse.redirect(completeUrl.toString())
    }
  }

  return NextResponse.redirect(`${origin}/auth/login?error=auth_callback_failed`)
}
