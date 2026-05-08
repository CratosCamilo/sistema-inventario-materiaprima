import { NextRequest, NextResponse } from 'next/server'
import { verifyPassword } from '@/lib/services/userService'
import { signToken, buildSessionCookie } from '@/lib/auth/session'

export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json()
    if (!username || !password) {
      return NextResponse.json({ error: 'Credenciales requeridas' }, { status: 400 })
    }

    const user = await verifyPassword(username, password)
    if (!user) {
      return NextResponse.json({ error: 'Usuario o contraseña incorrectos' }, { status: 401 })
    }

    const token = await signToken({
      userId:   user.id,
      username: user.username,
      fullName: user.full_name,
      role:     user.role,
    })

    const res = NextResponse.json({ ok: true, user: { id: user.id, username: user.username, fullName: user.full_name, role: user.role } })
    res.headers.set('Set-Cookie', buildSessionCookie(token))
    return res
  } catch {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
