import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

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
  const isApiRoute = pathname.startsWith('/api/')

  // Public routes — no auth needed
  const isPublicRoute =
    pathname === '/' ||
    pathname.startsWith('/auth/') ||
    pathname.startsWith('/api/auth/')

  // Redirect unauthenticated users trying to access protected routes
  if (!user && !isPublicRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/auth/login'
    return NextResponse.redirect(url)
  }

  if (user) {
    // Fetch profile to check status and role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, status')
      .eq('id', user.id)
      .single()

    // If profile hasn't been created yet, keep user on pending screen.
    if (!profile && !isPendingRoute && !isApiRoute) {
      const url = request.nextUrl.clone()
      url.pathname = '/auth/pending'
      return NextResponse.redirect(url)
    }

    if (profile) {
      // If pending approval, only allow the pending page
      if (profile.status === 'pending_approval' && !isPendingRoute && !isApiRoute) {
        const url = request.nextUrl.clone()
        url.pathname = '/auth/pending'
        return NextResponse.redirect(url)
      }

      // If active and on auth pages, redirect to search
      if (profile.status === 'active' && (isPendingRoute || isAuthRoute)) {
        const url = request.nextUrl.clone()
        url.pathname = '/search'
        return NextResponse.redirect(url)
      }

      // Admin-only routes
      if (
        pathname.startsWith('/admin') &&
        profile.role !== 'admin'
      ) {
        const url = request.nextUrl.clone()
        url.pathname = '/search'
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
