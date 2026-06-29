import * as React from 'react'
import { apiFetch, type AdminUser } from '@/lib/api'
import { getDeviceFingerprint } from '@/lib/deviceFingerprint'

const TOKEN_KEY = 'aviator_admin_token'

type AuthState = {
  token: string | null
  user: AdminUser | null
  loading: boolean
  pendingUserId: string | null
  login: (login: string, password: string) => Promise<'OK' | 'CODE_REQUIRED'>
  verifyCode: (code: string) => Promise<void>
  logout: () => void
}

const AdminAuthContext = React.createContext<AuthState | null>(null)

export function AdminAuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = React.useState<string | null>(() => localStorage.getItem(TOKEN_KEY))
  const [user, setUser] = React.useState<AdminUser | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [pendingUserId, setPendingUserId] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (!token) {
      setLoading(false)
      return
    }
    apiFetch<AdminUser>('/api/auth/me', { token })
      .then(setUser)
      .catch(() => {
        localStorage.removeItem(TOKEN_KEY)
        setToken(null)
      })
      .finally(() => setLoading(false))
  }, [token])

  const saveSession = (nextToken: string, nextUser: AdminUser) => {
    localStorage.setItem(TOKEN_KEY, nextToken)
    setToken(nextToken)
    setUser(nextUser)
    setPendingUserId(null)
  }

  const login = React.useCallback(async (loginName: string, password: string) => {
    const fingerprint = getDeviceFingerprint()
    const result = await apiFetch<
      | { status: 'OK'; token: string; user: AdminUser }
      | { status: 'DEVICE_CHANGE'; userId: string }
    >('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ login: loginName, password, fingerprint }),
    })

    if (result.status === 'OK') {
      saveSession(result.token, result.user)
      return 'OK' as const
    }

    setPendingUserId(result.userId)
    return 'CODE_REQUIRED' as const
  }, [])

  const verifyCode = React.useCallback(
    async (code: string) => {
      if (!pendingUserId) throw new Error('No pending login')
      const fingerprint = getDeviceFingerprint()
      const result = await apiFetch<{ token: string; user: AdminUser }>('/api/auth/verify-code', {
        method: 'POST',
        body: JSON.stringify({ userId: pendingUserId, code, fingerprint }),
      })
      saveSession(result.token, result.user)
    },
    [pendingUserId],
  )

  const logout = React.useCallback(() => {
    localStorage.removeItem(TOKEN_KEY)
    setToken(null)
    setUser(null)
    setPendingUserId(null)
  }, [])

  return (
    <AdminAuthContext.Provider
      value={{ token, user, loading, pendingUserId, login, verifyCode, logout }}
    >
      {children}
    </AdminAuthContext.Provider>
  )
}

export function useAdminAuth() {
  const ctx = React.useContext(AdminAuthContext)
  if (!ctx) throw new Error('useAdminAuth must be used within AdminAuthProvider')
  return ctx
}
