import type { DataStore } from '../types.js'

/**
 * «Сейчас» для админки: реальное время или демо-override из настроек.
 * Нужен, чтобы прогонять подтверждения / закрытие статусов полётов без ожидания часов.
 */
export function getStoreNow(store: DataStore): Date {
  const raw = store.settings?.demoNowIso
  if (raw) {
    const d = new Date(raw)
    if (!Number.isNaN(d.getTime())) return d
  }
  return new Date()
}

export function getStoreNowIso(store: DataStore): string {
  return getStoreNow(store).toISOString()
}
