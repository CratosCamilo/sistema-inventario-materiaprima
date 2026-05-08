import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { verifyToken } from '@/lib/auth/session'

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Rutas públicas
  if (
    pathname === '/login' ||
    pathname.startsWith('/api/auth/login') ||
    pathname === '/api/setup'
  ) {
    return NextResponse.next()
  }

  const token = req.cookies.get('session')?.value

  if (!token) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }
    return NextResponse.redirect(new URL('/login', req.url))
  }

  const session = await verifyToken(token)

  if (!session) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Sesión inválida' }, { status: 401 })
    }
    const res = NextResponse.redirect(new URL('/login', req.url))
    res.cookies.delete('session')
    return res
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
