import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'
import { isBackendHealthy } from '@/lib/api/health'

const JWT_SECRET = process.env['JWT_SECRET']
const AUTH_ROUTES = ['/auth/login', '/auth/register']

function isAuthRoute(pathname: string): boolean {
  return AUTH_ROUTES.some((route) => pathname.startsWith(route))
}

function isProtectedRoute(pathname: string): boolean {
  return pathname === '/' || pathname.startsWith('/dashboard')
}

async function hasValidAuthToken(request: NextRequest): Promise<boolean> {
  const token = request.cookies.get('auth_token')?.value
  if (!token || !JWT_SECRET) {
    return false
  }

  try {
    await jwtVerify(token, new TextEncoder().encode(JWT_SECRET))
    return true
  } catch {
    return false
  }
}

function redirect(request: NextRequest, pathname: string): NextResponse {
  return NextResponse.redirect(new URL(pathname, request.url))
}

export async function proxy(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl
  const isDevelopment = process.env['NODE_ENV'] === 'development'
  const backendHealthy = await isBackendHealthy()

  if (!backendHealthy) {
    if (!isDevelopment) {
      if (pathname === '/offline') {
        return NextResponse.next()
      }
      return redirect(request, '/offline')
    }

    if (pathname.startsWith('/auth/login') || pathname.startsWith('/auth/register')) {
      return redirect(request, '/dashboard')
    }

    return NextResponse.next()
  }

  if (pathname === '/offline') {
    return redirect(request, isDevelopment ? '/dashboard' : '/auth/login')
  }

  const isAuthenticated = await hasValidAuthToken(request)

  if (isAuthRoute(pathname) && isAuthenticated) {
    return redirect(request, '/dashboard')
  }

  if (isProtectedRoute(pathname) && !isAuthenticated) {
    return redirect(request, '/auth/login')
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/', '/dashboard/:path*', '/auth/:path*', '/offline'],
}
