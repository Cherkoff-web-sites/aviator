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

/** Базовая сетка 30 мин + пауза 15 (фоллбек, если настройки ещё не загрузились). */
export const BOOKING_TIME_SLOTS = buildPackedStartSlots({
  durationMin: 30,
  gapMin: 15,
  busy: [],
}) as readonly string[]

/** Сетка стартов для админки: шаг = длительность полёта + пауза из настроек. */
export function bookingTimeSlotsFor(gapMin: number, durationMin = 30): string[] {
  return buildPackedStartSlots({
    durationMin: Math.max(1, durationMin || 30),
    gapMin: Math.max(0, gapMin || 0),
    busy: [],
  })
}

export type BookingTimeSlot = string

export type ComboLeg = { simulatorSlug: 'boeing-737' | 'mi-2'; startTime: string; durationMin: number }

function intervalOverlapsBusy(
  startTime: string,
  durationMin: number,
  busy: BusyInterval[],
  gapMin: number,
): boolean {
  const a0 = timeHmToMins(startTime)
  const a1 = a0 + durationMin
  return busy.some((b) => {
    const b0 = timeHmToMins(b.startTime)
    const b1 = busyEndMins(b)
    return a0 < b1 + gapMin && b0 < a1 + gapMin
  })
}

/** Две ноги 2в1: сначала Boeing, потом Ми-2 — или наоборот. */
export function buildComboLegs(
  startTime: string,
  gapMin: number,
  order: 'boeing-first' | 'mi2-first',
): ComboLeg[] {
  const second = minsToTimeHm(timeHmToMins(startTime) + 30 + gapMin)
  if (order === 'mi2-first') {
    return [
      { simulatorSlug: 'mi-2', startTime, durationMin: 30 },
      { simulatorSlug: 'boeing-737', startTime: second, durationMin: 30 },
    ]
  }
  return [
    { simulatorSlug: 'boeing-737', startTime, durationMin: 30 },
    { simulatorSlug: 'mi-2', startTime: second, durationMin: 30 },
  ]
}

/**
 * Можно ли начать 2в1 в `startTime` (первая нога).
 * Пробуем Boeing→Ми-2, затем Ми-2→Boeing — возвращаем рабочий порядок или null.
 */
export function resolveComboOrder(opts: {
  startTime: string
  gapMin: number
  busyBoeing: BusyInterval[]
  busyMi2: BusyInterval[]
  /** true = слот закрыт ТО */
  isMaintClosed?: (simulatorSlug: 'boeing-737' | 'mi-2', startTime: string) => boolean
}): 'boeing-first' | 'mi2-first' | null {
  const orders: Array<'boeing-first' | 'mi2-first'> = ['boeing-first', 'mi2-first']
  for (const order of orders) {
    const legs = buildComboLegs(opts.startTime, opts.gapMin, order)
    const ok = legs.every((leg) => {
      if (opts.isMaintClosed?.(leg.simulatorSlug, leg.startTime)) return false
      const busy = leg.simulatorSlug === 'mi-2' ? opts.busyMi2 : opts.busyBoeing
      return !intervalOverlapsBusy(leg.startTime, leg.durationMin, busy, opts.gapMin)
    })
    if (ok) return order
  }
  return null
}

/** Кандидаты старта 2в1: шаг 15 мин 12:00–18:00 (не привязаны к сетке одного тренажёра). */
export function buildComboCandidateStarts(opts?: {
  dayStart?: string
  lastStart?: string
  stepMin?: number
}): string[] {
  const dayStart = timeHmToMins(opts?.dayStart ?? BOOKING_DAY_START)
  const lastStart = timeHmToMins(opts?.lastStart ?? BOOKING_DAY_LAST_START)
  const step = Math.max(5, opts?.stepMin ?? 15)
  const out: string[] = []
  for (let t = dayStart; t <= lastStart; t += step) {
    out.push(minsToTimeHm(t))
  }
  return out
}
