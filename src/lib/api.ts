const API_BASE = import.meta.env.VITE_API_URL ?? ''

export function getApiBase() {
  return API_BASE
}

export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit & { token?: string | null } = {},
): Promise<T> {
  const { token, headers, ...rest } = options
  const res = await fetch(`${API_BASE}${path}`, {
    ...rest,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
  })

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new ApiError(res.status, body.error ?? res.statusText)
  }

  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}

export type AdminUser = {
  id: string
  login: string
  role: 'ADMIN' | 'MANAGER' | 'PILOT'
  fullName: string
  phone: string | null
  email: string | null
  isActive: boolean
  color: string | null
  pilotSimulators: string[]
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
  promoNote: string | null
}
