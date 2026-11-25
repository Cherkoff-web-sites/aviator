import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

import { apiFetch } from '@/lib/api'
import { useStoreSocket } from '@/hooks/useLiveData'

export type ServerClockPayload = {
  realNowIso: string
  demoNowIso: string | null
  demoNowSetAtIso?: string | null
  effectiveNowIso: string
  active: boolean
}

type ServerClockContextValue = {
  /** Текущее эффективное «сейчас» (тикает каждую секунду). */
  now: Date
  active: boolean
  realNowIso: string | null
  reload: () => void
}

const ServerClockContext = createContext<ServerClockContextValue | null>(null)

function computeEffective(payload: ServerClockPayload | null, wallMs: number): Date {
  if (!payload) return new Date(wallMs)
  if (!payload.active || !payload.demoNowIso) return new Date(wallMs)
  const base = new Date(payload.demoNowIso).getTime()
  if (Number.isNaN(base)) return new Date(wallMs)
  const setAtRaw = payload.demoNowSetAtIso
  if (setAtRaw) {
    const setAt = new Date(setAtRaw).getTime()
    if (!Number.isNaN(setAt)) return new Date(base + (wallMs - setAt))
  }
  // legacy freeze
  return new Date(base)
}

export function ServerClockProvider({ children }: { children: ReactNode }) {
  const [payload, setPayload] = useState<ServerClockPayload | null>(null)
  const [wallMs, setWallMs] = useState(() => Date.now())

  const reload = useCallback(() => {
    void apiFetch<ServerClockPayload>('/api/public/clock')
      .then(setPayload)
      .catch(() => {
        /* offline — остаёмся на локальных часах */
      })
  }, [])

  useStoreSocket(reload)

  useEffect(() => {
    reload()
  }, [reload])

  useEffect(() => {
    const id = window.setInterval(() => setWallMs(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [])

  const now = useMemo(() => computeEffective(payload, wallMs), [payload, wallMs])

  const value = useMemo(
    () => ({
      now,
      active: Boolean(payload?.active),
      realNowIso: payload?.realNowIso ?? null,
      reload,
    }),
    [now, payload?.active, payload?.realNowIso, reload],
  )

  return <ServerClockContext.Provider value={value}>{children}</ServerClockContext.Provider>
}

export function useServerClock() {
  const ctx = useContext(ServerClockContext)
  if (!ctx) {
    throw new Error('useServerClock должен вызываться внутри ServerClockProvider')
  }
  return ctx
}

/** Безопасный доступ: вне провайдера — обычные Date. */
export function useServerNow(): Date {
  const ctx = useContext(ServerClockContext)
  const [fallback, setFallback] = useState(() => new Date())
  useEffect(() => {
    if (ctx) return
    const id = window.setInterval(() => setFallback(new Date()), 1000)
    return () => window.clearInterval(id)
  }, [ctx])
  return ctx?.now ?? fallback
}
