import type { DataStore, MaintenanceEntry } from '../types.js'

function timeToMins(t: string): number {
  const [h, m] = t.split(':').map(Number)
  return (h ?? 0) * 60 + (m ?? 0)
}

/** Нормализация старых записей (plannedAt → date). */
export function normalizeMaintenance(m: MaintenanceEntry): MaintenanceEntry {
  const date = m.date || (m.plannedAt ? m.plannedAt.slice(0, 10) : '')
  return { ...m, date }
}

export function listMaintenance(store: DataStore): MaintenanceEntry[] {
  return (store.maintenance ?? []).map(normalizeMaintenance).filter((m) => Boolean(m.date))
}

export function isFullDayMaintenance(m: MaintenanceEntry): boolean {
  return !m.startTime || !m.endTime
}

export function appliesToSimulator(m: MaintenanceEntry, simulatorSlug?: string | null): boolean {
  if (!m.simulatorSlug) return true
  if (!simulatorSlug) return true
  return m.simulatorSlug === simulatorSlug
}

/** День полностью закрыт для бронирования (дата недоступна в календаре). */
export function isDateFullyClosed(
  store: DataStore,
  dateKey: string,
  simulatorSlug?: string | null,
): boolean {
  if (store.calendar[dateKey] === 'BLOCKED') return true
  return listMaintenance(store).some((m) => {
    if (m.date !== dateKey) return false
    if (!isFullDayMaintenance(m)) return false
    if (!m.simulatorSlug) return true
    return Boolean(simulatorSlug) && m.simulatorSlug === simulatorSlug
  })
}

/** Слот пересекается с ТО (для выбранного тренажёра). */
export function isSlotBlockedByMaintenance(
  store: DataStore,
  dateKey: string,
  startTime: string,
  durationMin: number,
  simulatorSlug: string,
): boolean {
  if (store.calendar[dateKey] === 'BLOCKED') return true
  const slotStart = timeToMins(startTime)
  const slotEnd = slotStart + durationMin
  return listMaintenance(store).some((m) => {
    if (m.date !== dateKey) return false
    if (!appliesToSimulator(m, simulatorSlug)) return false
    if (isFullDayMaintenance(m)) return true
    const mStart = timeToMins(String(m.startTime))
    const mEnd = timeToMins(String(m.endTime))
    return slotStart < mEnd && slotEnd > mStart
  })
}

export function formatMaintenanceLabel(m: MaintenanceEntry): string {
  const sim =
    m.simulatorSlug === 'mi-2' ? 'Ми-2' : m.simulatorSlug === 'boeing-737' ? 'Boeing 737' : 'все тренажёры'
  const when = isFullDayMaintenance(m) ? 'весь день' : `${m.startTime}–${m.endTime}`
  return `${m.date} · ${sim} · ${when}`
}
