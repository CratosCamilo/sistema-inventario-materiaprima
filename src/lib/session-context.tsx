'use client'
import React, { createContext, useContext } from 'react'
import type { SessionPayload } from '@/lib/auth/session'

const SessionContext = createContext<SessionPayload | null>(null)

export function SessionProvider({ children, session }: { children: React.ReactNode; session: SessionPayload }) {
  return <SessionContext.Provider value={session}>{children}</SessionContext.Provider>
}

export function useSession(): SessionPayload {
  const ctx = useContext(SessionContext)
  if (!ctx) throw new Error('useSession must be used inside SessionProvider')
  return ctx
}
