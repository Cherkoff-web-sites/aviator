const API_BASE = import.meta.env.VITE_API_URL ?? ''

export type UserRole = 'ADMIN' | 'MANAGER' | 'PILOT'

export type AdminUser = {
  id: string
  login: string
  fullName: string
  phone: string
  role: UserRole
  isActive: boolean
  color: string
  pilotSimulators: string[]
}

export type Session = {
  role: UserRole
  userId: string
  user: AdminUser
}

const SESSION_KEY = 'aviator_session'

export function getApiBase() {
  return API_BASE
}

export function getSession(): Session | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    return raw ? (JSON.parse(raw) as Session) : null
  } catch {
    return null
  }
}

export function setSession(session: Session) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session))
}

export function clearSession() {
  localStorage.removeItem(SESSION_KEY)
}

export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const session = getSession()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  }
  if (session && (path.includes('/admin') || path.includes('/auth/me'))) {
    headers['X-Role'] = session.role
    headers['X-User-Id'] = session.userId
  }

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new ApiError(res.status, body.error ?? res.statusText)
  }
  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}

export type ApiBooking = {
  id: string
  date: string
  startTime: string
  endTime: string
  durationMin: number
  simulatorSlug: string
  name: string
  phone: string
  email: string
  status: string
  paid: boolean
  paymentMethod: 'OFFLINE' | 'ONLINE'
  comment: string
  isBirthdayPromo: boolean
  promoNote?: string | null
}

export type ApiCertificate = {
  id: string
  number: string
  phone: string
  fullName: string
  durationMin: number
  paymentStatus: 'PAID' | 'UNPAID'
  validFrom: string
  validTo: string
  simulatorSlug: string
  status: string
  comment: string
}

export type ApiWaiting = { id: string; date: string; line: string }
export type ApiPriceRow = { id: string; durationMin: number; simulatorSlug: string; priceByn: number }
export type ApiPromo = {
  id: string
  name: string
  discountPercent: number
  startDate: string
  endDate: string
  productType: string
  promoType: string
  active: boolean
}

export type ApiStaffShift = {
  id: string
  date: string
  userId: string
  simulatorSlug: string
  user?: AdminUser
}
