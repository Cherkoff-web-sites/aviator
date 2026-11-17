/** Начало рабочего дня для сетки публичного бронирования. */
export const BOOKING_DAY_START = '12:00'

/** Последний допустимый старт полёта в обычный день (пустая сетка). */
export const BOOKING_DAY_LAST_START = '18:00'

export type BusyInterval = {
  startTime: string
  durationMin: number
  endTime?: string | null
}

export function timeHmToMins(t: string): number {
  const [h, m] = t.split(':').map(Number)
  return (h ?? 0) * 60 + (m ?? 0)
}

export function minsToTimeHm(total: number): string {
  const h = Math.floor(total / 60)
  const m = ((total % 60) + 60) % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

function busyEndMins(b: BusyInterval): number {
  if (b.endTime && /^\d{1,2}:\d{2}$/.test(b.endTime)) {
    return timeHmToMins(b.endTime)
  }
  return timeHmToMins(b.startTime) + Math.max(0, b.durationMin || 0)
}

/**
 * Слоты с 12:00, шаг = длительность + пауза (например 30+15 → 12:00, 12:45, 13:30…).
 * Если есть запись со сдвигом (15:35–16:05), следующие старты идут от end+gap
 * (16:20, затем снова +шаг), а не от старой фиксированной сетки (16:30).
 */
export function buildPackedStartSlots(opts: {
  durationMin: number
  gapMin: number
  busy?: BusyInterval[]
  dayStart?: string
  lastStart?: string
}): string[] {
  const durationMin = Math.max(1, Math.floor(opts.durationMin))
  const gapMin = Math.max(0, Math.floor(opts.gapMin))
  const step = durationMin + gapMin
  const dayStart = timeHmToMins(opts.dayStart ?? BOOKING_DAY_START)
  const lastStart = timeHmToMins(opts.lastStart ?? BOOKING_DAY_LAST_START)
  if (lastStart < dayStart) return []

  const busy = (opts.busy ?? [])
    .map((b) => ({
      start: timeHmToMins(b.startTime),
      end: busyEndMins(b),
    }))
    .filter((b) => b.end > b.start)
    .sort((a, b) => a.start - b.start)

  const overlaps = (start: number) => {
    const end = start + durationMin
    return busy.some((b) => start < b.end + gapMin && b.start < end + gapMin)
  }

  const slots: string[] = []
  let cursor = dayStart
  let guard = 0
  while (cursor <= lastStart && guard++ < 500) {
    if (!overlaps(cursor)) {
      slots.push(minsToTimeHm(cursor))
      cursor += step
      continue
    }
    const blockers = busy.filter(
      (b) => cursor < b.end + gapMin && b.start < cursor + durationMin + gapMin,
    )
    if (blockers.length === 0) {
      cursor += 1
      continue
    }
    cursor = Math.max(...blockers.map((b) => b.end + gapMin))
  }
  return slots
}

/** Базовая сетка 30 мин + пауза 15 (для админки и подсказок). */
export const BOOKING_TIME_SLOTS = buildPackedStartSlots({
  durationMin: 30,
  gapMin: 15,
  busy: [],
}) as readonly string[]

export type BookingTimeSlot = string
