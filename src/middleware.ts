import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { isAdminUser } from '@/lib/admin-auth'
import { isFingerprintBridgeApiPath, isValidFingerprintApiKey } from '@/lib/fingerprint-api-key'


export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const pathname = request.nextUrl.pathname
  const isApiRoute = pathname.startsWith('/api')
  const isLoginPage = pathname === '/login'
  const isBridgeApi =
    isFingerprintBridgeApiPath(pathname) && isValidFingerprintApiKey(request)

  // Skip auth entirely for bridge API (authenticated via API key)
  if (isBridgeApi) {
    return applySecurityHeaders(supabaseResponse)
  }

  // Check if env vars are configured — if not, skip auth (dev mode fallback)
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !anonKey) {
    // No supabase configured — allow access without auth (local dev)
    return applySecurityHeaders(supabaseResponse)
  }

  let user: import('@supabase/supabase-js').User | null = null

  try {
    const supabase = createServerClient(
      supabaseUrl,
      anonKey,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
            supabaseResponse = NextResponse.next({
              request,
            })
            cookiesToSet.forEach(({ name, value, options }) =>
              supabaseResponse.cookies.set(name, value, options)
            )
          },
        },
      }
    )

    // Use getSession() instead of getUser() to avoid a network round-trip to Supabase
    // on every request. The JWT is decoded locally from the cookie (~1ms vs 1-1.5s).
    const {
      data: { session },
    } = await supabase.auth.getSession()
    user = session?.user ?? null
  } catch (error) {
    console.error('[Middleware] Auth check failed, allowing request:', error)
    // If auth fails (e.g., network error on first load), still redirect to login
    if (!isApiRoute && !isLoginPage) {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      return NextResponse.redirect(url)
    }
    return applySecurityHeaders(supabaseResponse)
  }

  if (!user && !isLoginPage) {
    if (isApiRoute) {
      return new NextResponse(JSON.stringify({ success: false, error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    }
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  if (user && !isAdminUser(user)) {
    if (isApiRoute) {
      return new NextResponse(JSON.stringify({ success: false, error: 'Forbidden: Admin access required' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('error', 'admin_required')
    return NextResponse.redirect(url)
  }

  if (user && isLoginPage && isAdminUser(user)) {
    const url = request.nextUrl.clone()
    url.pathname = '/'
    return NextResponse.redirect(url)
  }

  return applySecurityHeaders(supabaseResponse)
}

function applySecurityHeaders(response: NextResponse) {
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('Referrer-Policy', 'origin-when-cross-origin')
  response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
