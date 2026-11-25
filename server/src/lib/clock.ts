import type { DataStore } from '../types.js'

/**
 * «Сейчас» для админки и сайта: реальное время или демо-override.
 * Если задан demoNowIso + demoNowSetAtIso — время идёт от этой точки в реальном темпе.
 */
export function getStoreNow(store: DataStore): Date {
  const raw = store.settings?.demoNowIso
  if (!raw) return new Date()
  const base = new Date(raw)
  if (Number.isNaN(base.getTime())) return new Date()

  const setAtRaw = store.settings?.demoNowSetAtIso
  if (setAtRaw) {
    const setAt = new Date(setAtRaw)
    if (!Number.isNaN(setAt.getTime())) {
      return new Date(base.getTime() + (Date.now() - setAt.getTime()))
    }
  }
  // Старый freeze без setAt — показываем зафиксированное значение
  return base
}

export function getStoreNowIso(store: DataStore): string {
  return getStoreNow(store).toISOString()
}

export function clockPayload(store: DataStore) {
  const realNowIso = new Date().toISOString()
  const demoNowIso = store.settings.demoNowIso ?? null
  const demoNowSetAtIso = store.settings.demoNowSetAtIso ?? null
  const effectiveNowIso = getStoreNowIso(store)
  return {
    realNowIso,
    demoNowIso,
    demoNowSetAtIso,
    effectiveNowIso,
    active: Boolean(demoNowIso),
  }
}
