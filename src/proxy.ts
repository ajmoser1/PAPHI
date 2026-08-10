import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { isAdminRole, isMembershipIncomplete, ROLES } from '@/lib/constants'
import { getChapterSlugFromHost } from '@/lib/tenant'
import { resolveUxPreviewMode } from '@/lib/ux-preview'

const CHAPTER_SLUG_COOKIE = 'chapter_slug'
const UX_PREVIEW_COOKIE = 'ux_preview'

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const hostSlug = getChapterSlugFromHost(request.headers.get('host') ?? '')
  if (hostSlug) {
    supabaseResponse.cookies.set(CHAPTER_SLUG_COOKIE, hostSlug, {
      path: '/',
      sameSite: 'lax',
    })
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const pathname = request.nextUrl.pathname
  const isAuthRoute = pathname.startsWith('/auth/')
  const isPendingRoute = pathname === '/auth/pending'
  const isCompleteSignupRoute = pathname === '/auth/complete-signup'
  const isPasswordRecoveryRoute =
    pathname === '/auth/forgot-password' || pathname === '/auth/reset-password'
  const isApiRoute = pathname.startsWith('/api/')
  const isFounderRoute = pathname.startsWith('/founder')
  const isMessagesRoute = pathname.startsWith('/messages')

  // Public routes — no auth needed
  const isPublicRoute =
    pathname === '/' ||
    pathname.startsWith('/auth/') ||
    pathname.startsWith('/api/auth/') ||
    pathname === '/start-chapter'

  // Redirect unauthenticated users trying to access protected routes
  if (!user && !isPublicRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/auth/login'
    return NextResponse.redirect(url)
  }

  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, status, chapter_id')
      .eq('id', user.id)
      .single()

    // Stub/missing profile (auth trigger or incomplete OAuth) — finish membership setup
    if (
      isMembershipIncomplete(profile) &&
      !isCompleteSignupRoute &&
      !isPendingRoute &&
      !isApiRoute &&
      !isPasswordRecoveryRoute
    ) {
      const url = request.nextUrl.clone()
      url.pathname = '/auth/complete-signup'
      return NextResponse.redirect(url)
    }

    if (profile && !isMembershipIncomplete(profile)) {
      const previewMode = resolveUxPreviewMode(
        profile.role,
        request.cookies.get(UX_PREVIEW_COOKIE)?.value
      )
      const effectiveStatus =
        previewMode === 'pending'
          ? 'pending_approval'
          : previewMode === 'post_approval'
            ? 'active'
            : profile.status

      if (profile.status === 'suspended' && !isPendingRoute && !isApiRoute) {
        const url = request.nextUrl.clone()
        url.pathname = '/auth/pending'
        return NextResponse.redirect(url)
      }

      // Ghost users (or founder pending preview): allow app routes but block messaging
      if (effectiveStatus === 'pending_approval' && isMessagesRoute) {
        const url = request.nextUrl.clone()
        url.pathname = '/members'
        return NextResponse.redirect(url)
      }

      // Active users on auth pages redirect to app (except password recovery)
      // Skip when founder is previewing pending (still active in DB).
      if (
        effectiveStatus === 'active' &&
        (isPendingRoute || (isAuthRoute && !isPasswordRecoveryRoute))
      ) {
        const url = request.nextUrl.clone()
        url.pathname = '/members'
        return NextResponse.redirect(url)
      }

      // Pending users on auth pages (except recovery / complete-signup) go to profile setup
      if (
        effectiveStatus === 'pending_approval' &&
        profile.role !== ROLES.FOUNDER &&
        isAuthRoute &&
        !isPasswordRecoveryRoute &&
        !isCompleteSignupRoute &&
        pathname !== '/auth/pending'
      ) {
        const url = request.nextUrl.clone()
        url.pathname = '/profile/edit'
        return NextResponse.redirect(url)
      }

      // Admin routes
      if (pathname.startsWith('/admin') && !isAdminRole(profile.role)) {
        const url = request.nextUrl.clone()
        url.pathname = '/members'
        return NextResponse.redirect(url)
      }

      // Founder routes
      if (isFounderRoute && profile.role !== 'founder') {
        const url = request.nextUrl.clone()
        url.pathname = '/members'
        return NextResponse.redirect(url)
      }
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
