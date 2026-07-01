import * as React from 'react'
import { apiFetch, clearSession, setSession, type AdminUser, type Session, type UserRole } from '@/lib/api'

type AuthState = {
  session: Session | null
  loading: boolean
  enterAs: (role: UserRole, pilotVariant?: 'boeing-737' | 'mi-2') => Promise<void>
  logout: () => void
}

const ROLE_USERS: Record<UserRole, string> = {
  ADMIN: 'u-admin',
  MANAGER: 'u-manager',
  PILOT: 'u-pilot-b737',
}

const PILOT_VARIANT: Record<'boeing-737' | 'mi-2', string> = {
  'boeing-737': 'u-pilot-b737',
  'mi-2': 'u-pilot-mi2',
}

const AdminAuthContext = React.createContext<AuthState | null>(null)

export function AdminAuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSessionState] = React.useState<Session | null>(null)
  const loading = false

  React.useEffect(() => {
    clearSession()
  }, [])

  const enterAs = React.useCallback(async (role: UserRole, pilotVariant?: 'boeing-737' | 'mi-2') => {
    const userId =
      role === 'PILOT' && pilotVariant ? PILOT_VARIANT[pilotVariant] : ROLE_USERS[role]
    clearSession()
    const user = await apiFetch<AdminUser>('/api/auth/me', {
      headers: { 'X-Role': role, 'X-User-Id': userId },
    })
    const next: Session = { role, userId, user }
    setSession(next)
    setSessionState(next)
  }, [])

  const logout = React.useCallback(() => {
    clearSession()
    setSessionState(null)
  }, [])

  return (
    <AdminAuthContext.Provider value={{ session, loading, enterAs, logout }}>
      {children}
    </AdminAuthContext.Provider>
  )
}

export function useAdminAuth() {
  const ctx = React.useContext(AdminAuthContext)
  if (!ctx) throw new Error('useAdminAuth required')
  return {
    ...ctx,
    user: ctx.session?.user ?? null,
    role: ctx.session?.role ?? null,
    token: ctx.session ? 'ok' : null,
  }
}
