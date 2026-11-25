import { addMonths, format, getDay, parseISO, startOfDay, subMonths } from 'date-fns'
import { getStoreNow } from './clock.js'
import type { CalendarDayStatus, DataStore, UserRole } from '../types.js'

export function toDateKey(d: Date | string) {
  const date = typeof d === 'string' ? parseISO(d) : d
  return format(startOfDay(date), 'yyyy-MM-dd')
}

export function isWeekend(d: Date) {
  const day = getDay(d)
  return day === 0 || day === 6
}

export function calendarRangeForRole(role: UserRole, anchor = new Date()) {
  const today = startOfDay(anchor)
  if (role === 'PILOT') return { from: today, to: addMonths(today, 2) }
  return { from: subMonths(today, 4), to: addMonths(today, 12) }
}

export function getDayStatus(store: DataStore, dateKey: string): CalendarDayStatus {
  const override = store.calendar[dateKey]
  const d = parseISO(dateKey)
  // Сб/Вс всегда выходные: OPEN-override на выходных игнорируем (баг «7 ноября раб. день»).
  // BLOCKED (ТО) на выходных сохраняем.
  if (isWeekend(d)) {
    if (override === 'BLOCKED') return 'BLOCKED'
    return 'HOLIDAY'
  }
  return override ?? 'OPEN'
}

export function buildCalendarDays(store: DataStore, from: Date, to: Date) {
  const days: { date: string; status: CalendarDayStatus }[] = []
  let cursor = startOfDay(from)
  const end = startOfDay(to)
  while (cursor <= end) {
    const key = toDateKey(cursor)
    days.push({ date: key, status: getDayStatus(store, key) })
    cursor = new Date(cursor.getTime() + 86400000)
  }
  return days
}

export function addMinutesToTime(time: string, minutes: number) {
  const [h, m] = time.split(':').map(Number)
  const total = h * 60 + m + minutes
  const nh = Math.floor(total / 60) % 24
  const nm = total % 60
  return `${String(nh).padStart(2, '0')}:${String(nm).padStart(2, '0')}`
}

/** Пока SMTP нет — всегда один и тот же код для прохождения OTP. */
export function generateCode(_len = 6) {
  return '123456'
}

export function timeToMinsLocal(t: string): number {
  const [h, m] = t.split(':').map(Number)
  return (h ?? 0) * 60 + (m ?? 0)
}

/** Создать смену в графике, если её ещё нет (синхронизация с назначением пилота на полёт). */
export function ensureStaffShift(
  store: DataStore,
  opts: { date: string; userId: string; simulatorSlug: string },
): boolean {
  const sim = opts.simulatorSlug === 'mi-2' ? 'mi-2' : 'boeing-737'
  if (!Array.isArray(store.staffShifts)) store.staffShifts = []
  const exists = store.staffShifts.some(
    (s) =>
      s.date === opts.date &&
      s.userId === opts.userId &&
      (s.simulatorSlug === 'mi-2' ? 'mi-2' : 'boeing-737') === sim,
  )
  if (exists) return false
  store.staffShifts.push({
    id: `shift-${opts.userId}-${opts.date}-${sim}`,
    date: opts.date,
    userId: opts.userId,
    simulatorSlug: sim,
    createdAt: new Date().toISOString(),
  })
  return true
}

/** Локальный yyyy-MM-dd без parseISO (чтобы не сдвигать сутки из‑за UTC). */
export function localDateKey(d: Date) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function bookingEndMins(b: { startTime: string; endTime?: string; durationMin?: number }) {
  if (b.endTime && /^\d{1,2}:\d{2}$/.test(b.endTime)) {
    const mins = timeToMinsLocal(b.endTime)
    if (Number.isFinite(mins)) return mins
  }
  return timeToMinsLocal(b.startTime) + (Number(b.durationMin) || 0)
}

/**
 * Автоматика таймлайна (WAITING без менеджера не трогаем):
 * CONFIRMED → IN_PROGRESS после старта; IN_PROGRESS → DONE после окончания.
 */
export function autoCompletePastBookings(store: DataStore) {
  const now = getStoreNow(store)
  const today = localDateKey(now)
  const nowMins = now.getHours() * 60 + now.getMinutes()
  const nowIso = now.toISOString()
  for (const b of store.bookings) {
    const startMins = timeToMinsLocal(b.startTime)
    const endMins = bookingEndMins(b)
    const startPassed = b.date < today || (b.date === today && startMins <= nowMins)
    const endPassed = b.date < today || (b.date === today && endMins <= nowMins)

    if (b.status === 'CONFIRMED' && startPassed) {
      b.status = 'IN_PROGRESS'
      b.updatedAt = nowIso
    }
    if (b.status === 'IN_PROGRESS' && endPassed) {
      b.status = 'DONE'
      b.updatedAt = nowIso
    }
  }
}

export function filterBookingsForRole(
  store: DataStore,
  role: UserRole,
  userId: string | undefined,
  date?: string,
) {
  let rows = store.bookings
  if (date) rows = rows.filter((b) => b.date === date)
  if (role === 'PILOT') {
    const user = store.users.find((u) => u.id === userId)
    const sims = user?.pilotSimulators ?? []
    rows = rows.filter((b) => sims.includes(b.simulatorSlug))
  }
  return rows.sort((a, b) => a.startTime.localeCompare(b.startTime))
}
