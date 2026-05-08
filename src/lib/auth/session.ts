import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'

const KEY = new TextEncoder().encode(
  process.env.JWT_SECRET ?? 'dev-secret-change-in-production'
)
const COOKIE = 'session'
const MAX_AGE = 60 * 60 * 24 * 7 // 7 días

export interface SessionPayload {
  userId: number
  username: string
  fullName: string
  role: 'admin' | 'operador' | 'salidas' | 'entradas'
}

export async function signToken(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload } as Record<string, unknown>)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(KEY)
}

export async function verifyToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, KEY)
    return payload as unknown as SessionPayload
  } catch {
    return null
  }
}

// Para Server Components y API Routes (lee la cookie del request actual)
export async function getSession(): Promise<SessionPayload | null> {
  const store = cookies()
  const token = store.get(COOKIE)?.value
  if (!token) return null
  return verifyToken(token)
}

export function buildSessionCookie(token: string): string {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : ''
  return `${COOKIE}=${token}; HttpOnly; Path=/; Max-Age=${MAX_AGE}; SameSite=Lax${secure}`
}

export function buildClearCookie(): string {
  return `${COOKIE}=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax`
}
