import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { isAdminUser } from '@/lib/admin-auth'
import { isFingerprintBridgeApiPath, isValidFingerprintApiKey } from '@/lib/fingerprint-api-key'

// ── Rate limiting (in-memory token bucket) ─────────────────────────────────
// Note: in serverless (Vercel), memory is not shared across instances,
// so this provides best-effort protection rather than hard enforcement.
// For production, pair with Vercel WAF or Cloudflare.
interface RateLimitEntry {
  count: number
  resetAt: number
}

const RATE_LIMIT_WINDOW_MS = 60_000 // 1 minute
const RATE_LIMIT_MAX_GENERAL = 60    // 60 requests/min for general API
const RATE_LIMIT_MAX_STRICT = 10     // 10 requests/min for POST mutations
const rateLimitStore = new Map<string, RateLimitEntry>()

// Periodic cleanup of stale entries (every 5 minutes)
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now()
    for (const [key, entry] of rateLimitStore) {
      if (entry.resetAt < now) rateLimitStore.delete(key)
    }
  }, 300_000)
}

function isRateLimited(request: NextRequest): boolean {
  // Skip rate limiting in dev mode for easier debugging
  if (process.env.NODE_ENV === 'development') return false
  // Skip for static assets
  const pathname = request.nextUrl.pathname
  if (pathname.startsWith('/_next/')) return false

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')?.trim()
    || '127.0.0.1'
  const key = `${ip}:${pathname}`

  const isPostMutation = request.method === 'POST' || request.method === 'PUT' || request.method === 'DELETE'
  const maxRequests = isPostMutation ? RATE_LIMIT_MAX_STRICT : RATE_LIMIT_MAX_GENERAL

  const now = Date.now()
  const entry = rateLimitStore.get(key)

  if (!entry || entry.resetAt < now) {
    rateLimitStore.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS })
    return false
  }

  entry.count++
  if (entry.count > maxRequests) {
    return true
  }

  return false
}

export async function middleware(request: NextRequest) {
  // ── Rate limiting check ──
  if (isRateLimited(request)) {
    if (request.nextUrl.pathname.startsWith('/api')) {
      return new NextResponse(
        JSON.stringify({ success: false, error: 'Too many requests — please slow down' }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': '60',
          },
        }
      )
    }
    return new NextResponse('Too Many Requests', { status: 429 })
  }

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

    // Two-step auth verification for security:
    // 1. getSession() — quick local check from cookies (~1ms)
    // 2. If session exists, verify authenticity with getUser() — network round-trip
    //    This prevents using a forged JWT from the cookie storage.
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (session) {
      // Verify session authenticity with the Supabase Auth server.
      // If getUser() fails (network blip), fall back to session data rather
      // than blocking the user — security is still better than with just getSession().
      try {
        const {
          data: { user: verifiedUser },
        } = await supabase.auth.getUser()
        user = verifiedUser
      } catch {
        user = session.user
      }
    }
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
