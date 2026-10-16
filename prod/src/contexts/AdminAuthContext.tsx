import * as React from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ApiError,
  apiFetch,
  clearSession,
  getSession,
  setSession,
  type AdminUser,
  type Session,
  type UserRole,
} from '@/lib/api'
import { useStoreSocket } from '@/hooks/useLiveData'

type AuthState = {
  session: Session | null
  loading: boolean
  enterAs: (role: UserRole, pilotVariant?: 'boeing-737' | 'mi-2') => Promise<void>
  logout: () => void
  refreshSession: () => Promise<void>
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
  const [session, setSessionState] = React.useState<Session | null>(() => getSession())
  const loading = false
  const navigate = useNavigate()

  const logout = React.useCallback(() => {
    clearSession()
    setSessionState(null)
  }, [])

  const refreshSession = React.useCallback(async () => {
    const current = getSession()
    if (!current) return
    try {
      const user = await apiFetch<AdminUser>('/api/auth/me')
      if (!user.isActive) {
        logout()
        navigate('/admin/login', { replace: true })
        return
      }
      const next: Session = {
        role: user.role,
        userId: user.id,
        user,
      }
      setSession(next)
      setSessionState(next)
    } catch (err) {
      if (err instanceof ApiError && (err.status === 401 || err.message === 'ACCOUNT_INACTIVE')) {
        logout()
        navigate('/admin/login', { replace: true })
      }
    }
  }, [logout, navigate])

  useStoreSocket(() => {
    void refreshSession()
  })

  const enterAs = React.useCallback(async (role: UserRole, pilotVariant?: 'boeing-737' | 'mi-2') => {
    const userId =
      role === 'PILOT' && pilotVariant ? PILOT_VARIANT[pilotVariant] : ROLE_USERS[role]
    clearSession()
    const user = await apiFetch<AdminUser>('/api/auth/me', {
      headers: { 'X-Role': role, 'X-User-Id': userId },
    })
    if (!user.isActive) {
      throw new ApiError(401, 'ACCOUNT_INACTIVE')
    }
    const next: Session = { role, userId, user }
    setSession(next)
    setSessionState(next)
  }, [])

  return (
    <AdminAuthContext.Provider value={{ session, loading, enterAs, logout, refreshSession }}>
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
