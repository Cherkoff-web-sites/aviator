import { addDays, addMonths, differenceInCalendarDays, isSameDay, isWeekend, startOfDay } from 'date-fns'
import type { ApiPriceRow } from '@/lib/api'

export type CalendarStatus = 'OPEN' | 'BLOCKED' | 'HOLIDAY'

/** Закрытие ТО с публичного календаря */
export type PublicMaintenance = {
  id: string
  date: string
  simulatorSlug?: string | null
  startTime?: string | null
  endTime?: string | null
  notes?: string
}

export type GiftCertProductChoice = 'boeing-737' | 'mi-2' | 'both'

export type CertValidity = {
  validFrom: string
  validTo: string
  simulatorSlug?: string
  durationMin?: number
  number?: string
}

export function getBaseFlightPrice(
  rows: ApiPriceRow[],
  aircraft: 'boeing-737' | 'mi-2',
  durationMin: number,
): number {
  return rows.find((r) => r.simulatorSlug === aircraft && r.durationMin === durationMin)?.priceByn ?? 0
}

export function getCertPriceByn(
  rows: ApiPriceRow[],
  product: 'boeing-737' | 'mi-2' | 'both',
  durationMin: number,
): number {
  const slug = product === 'both' ? 'combo' : product
  return rows.find((r) => r.simulatorSlug === slug && r.durationMin === durationMin)?.priceByn ?? 0
}

export function parseBirthdayDdMm(value: string, year: number): Date | null {
  const m = value.trim().match(/^(\d{1,2})\.(\d{1,2})$/)
  if (!m) return null
  const day = Number(m[1])
  const month = Number(m[2]) - 1
  if (month < 0 || month > 11 || day < 1 || day > 31) return null
  const d = new Date(year, month, day)
  if (d.getMonth() !== month || d.getDate() !== day) return null
  return d
}

export function isBirthdayInputValid(value: string): boolean {
  return parseBirthdayDdMm(value, new Date().getFullYear()) !== null
}

/** ±3 дня от ДР с учётом перехода года */
export function isInBirthdayWindow(date: Date, birthdayDdMm: string): boolean {
  const y = date.getFullYear()
  for (const year of [y - 1, y, y + 1]) {
    const b = parseBirthdayDdMm(birthdayDdMm, year)
    if (!b) continue
    const diffDays = Math.abs(differenceInCalendarDays(startOfDay(date), startOfDay(b)))
    if (diffDays <= 3) return true
  }
  return false
}

export function isHappyHourTime(time: string): boolean {
  const [h, m] = time.split(':').map(Number)
  const mins = h * 60 + (m ?? 0)
  return mins >= 12 * 60 && mins < 15 * 60
}

/**
 * Эффективный статус дня: явный из календаря или Сб/Вс → HOLIDAY (красный день).
 */
export function effectiveDayStatus(
  date: Date,
  dayStatus?: CalendarStatus,
): CalendarStatus {
  if (dayStatus) return dayStatus
  return isWeekend(date) ? 'HOLIDAY' : 'OPEN'
}

/**
 * Красный / выходной / праздничный день (HOLIDAY).
 * В такие дни «Счастливые часы» не работают.
 */
export function isRedDay(date: Date, dayStatus?: CalendarStatus): boolean {
  return effectiveDayStatus(date, dayStatus) === 'HOLIDAY'
}

/** @deprecated используйте isRedDay — раньше называлось «скидочный день» */
export function isDiscountDay(date: Date, dayStatus?: CalendarStatus): boolean {
  return isRedDay(date, dayStatus)
}

/** Слот «Счастливых часов»: будний OPEN-день, 12:00–15:00. Не в красные дни. */
export function isHappyHourSlot(
  time: string,
  date: Date,
  dayStatus?: CalendarStatus,
): boolean {
  if (isRedDay(date, dayStatus)) return false
  if (effectiveDayStatus(date, dayStatus) !== 'OPEN') return false
  return isHappyHourTime(time)
}

export function isPhoneValid(phone: string): boolean {
  const digits = phone.replace(/\D/g, '')
  return digits.length >= 9 && digits.length <= 15
}

export function isEmailValid(email: string): boolean {
  const t = email.trim()
  if (!t || t.length > 120) return false
  return /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(t)
}

export function isPersonNameValid(name: string): boolean {
  const t = name.trim()
  if (t.length < 2 || t.length > 60) return false
  if (/[^A-Za-zА-Яа-яЁёІіЎўʼ'’\-\s]/.test(t)) return false
  const letters = t.replace(/[^A-Za-zА-Яа-яЁёІіЎў]/g, '')
  return letters.length >= 2
}

/** Слот уже прошёл (для сегодняшнего дня). */
export function isTimeSlotPast(date: Date, time: string, now = new Date()): boolean {
  if (!isSameDay(date, now)) return false
  const [h, m] = time.split(':').map(Number)
  const slot = new Date(now)
  slot.setHours(h, m ?? 0, 0, 0)
  return slot.getTime() <= now.getTime()
}

function timeToMins(t: string): number {
  const [h, m] = t.split(':').map(Number)
  return (h ?? 0) * 60 + (m ?? 0)
}

function isFullDayMaintenance(m: PublicMaintenance): boolean {
  return !m.startTime || !m.endTime
}

/** Дата полностью закрыта ТО (для календаря записи). */
export function isDateClosedByMaintenance(
  dateKey: string,
  maintenance: PublicMaintenance[] | undefined,
  simulatorSlug?: string | null,
): boolean {
  if (!maintenance?.length) return false
  return maintenance.some((m) => {
    if (m.date !== dateKey) return false
    if (!isFullDayMaintenance(m)) return false
    if (!m.simulatorSlug) return true
    return Boolean(simulatorSlug) && m.simulatorSlug === simulatorSlug
  })
}

/** Слот пересекается с окном ТО. */
export function isSlotClosedByMaintenance(
  dateKey: string,
  startTime: string,
  durationMin: number,
  simulatorSlug: string,
  maintenance: PublicMaintenance[] | undefined,
): boolean {
  if (!maintenance?.length) return false
  const slotStart = timeToMins(startTime)
  const slotEnd = slotStart + durationMin
  return maintenance.some((m) => {
    if (m.date !== dateKey) return false
    if (m.simulatorSlug && m.simulatorSlug !== simulatorSlug) return false
    if (isFullDayMaintenance(m)) return true
    const mStart = timeToMins(String(m.startTime))
    const mEnd = timeToMins(String(m.endTime))
    return slotStart < mEnd && slotEnd > mStart
  })
}

export function computeBookingPriceByn(opts: {
  base: number
  birthdayDiscount: boolean
  birthdayDate: string
  selectedDate: Date
  selectedTime: string
  dayStatus?: CalendarStatus
}): number {
  let price = opts.base
  const status = effectiveDayStatus(opts.selectedDate, opts.dayStatus)
  const blocked = status === 'BLOCKED'

  if (blocked || price <= 0) return price

  if (
    opts.birthdayDiscount &&
    opts.birthdayDate.trim() &&
    isInBirthdayWindow(opts.selectedDate, opts.birthdayDate)
  ) {
    price *= 0.85
  } else if (isHappyHourSlot(opts.selectedTime, opts.selectedDate, opts.dayStatus)) {
    // «Счастливые часы» только в обычные рабочие дни; в красные (выходные) — нет
    price *= 0.9
  }

  return Math.round(price)
}

export type BookingDateDisableOpts = {
  birthdayDiscount: boolean
  birthdayDate: string
  bookingWindowMonths: number
  /** При валидном сертификате — только даты его действия */
  certificate?: CertValidity | null
  /** Сертификат включён, но ещё не подтверждён — даты недоступны */
  requireValidCertificate?: boolean
  /** Все слоты дня (чтобы отключить «сегодня», если всё уже прошло) */
  timeSlots?: readonly string[]
  /** Акция «Счастливые часы»: только будни и слоты 12:00–15:00 */
  happyHoursOnly?: boolean
  /** Закрытия ТО */
  maintenance?: PublicMaintenance[]
  /** Выбранный тренажёр — учитываем ТО только на него */
  simulatorSlug?: string | null
  durationMin?: number
}

export function isBookingDateDisabled(
  date: Date,
  calendar: Record<string, CalendarStatus>,
  opts: BookingDateDisableOpts,
): boolean {
  const today = startOfDay(new Date())
  if (date < today) return true
  const max = addMonths(today, opts.bookingWindowMonths)
  if (date > max) return true

  if (opts.requireValidCertificate) return true

  const key = formatDateKey(date)
  const status = effectiveDayStatus(date, calendar[key])
  // HOLIDAY (красный) — запись доступна, но без «Счастливых часов»; BLOCKED / ТО — закрыто
  if (status === 'BLOCKED') return true
  if (isDateClosedByMaintenance(key, opts.maintenance, opts.simulatorSlug)) return true

  if (opts.happyHoursOnly && isRedDay(date, status)) return true

  if (opts.certificate) {
    const from = startOfDay(parseIsoDate(opts.certificate.validFrom) ?? today)
    const to = startOfDay(parseIsoDate(opts.certificate.validTo) ?? today)
    if (date < from || date > to) return true
  } else if (opts.birthdayDiscount) {
    if (!isBirthdayInputValid(opts.birthdayDate)) return true
    if (!isInBirthdayWindow(date, opts.birthdayDate)) return true
  }

  if (opts.timeSlots?.length && isSameDay(date, today)) {
    const slotsForDay = opts.happyHoursOnly
      ? opts.timeSlots.filter((t) => isHappyHourTime(t))
      : opts.timeSlots
    const duration = opts.durationMin ?? 30
    const usable = slotsForDay.filter((t) => {
      if (isTimeSlotPast(date, t)) return false
      if (
        opts.simulatorSlug &&
        isSlotClosedByMaintenance(key, t, duration, opts.simulatorSlug, opts.maintenance)
      ) {
        return false
      }
      return true
    })
    if (usable.length === 0) return true
  }

  // День с частичным ТО: если все слоты закрыты для выбранного тренажёра — дата недоступна
  if (opts.timeSlots?.length && opts.simulatorSlug && opts.maintenance?.length) {
    const duration = opts.durationMin ?? 30
    const slotsForDay = opts.happyHoursOnly
      ? opts.timeSlots.filter((t) => isHappyHourTime(t))
      : opts.timeSlots
    const anyOpen = slotsForDay.some(
      (t) =>
        !isTimeSlotPast(date, t) &&
        !isSlotClosedByMaintenance(key, t, duration, opts.simulatorSlug!, opts.maintenance),
    )
    if (!anyOpen) return true
  }

  return false
}

export function findFirstBookableDate(
  calendar: Record<string, CalendarStatus>,
  opts: BookingDateDisableOpts,
): Date | null {
  const today = startOfDay(new Date())
  const max = addMonths(today, opts.bookingWindowMonths)
  for (let d = today; d <= max; d = addDays(d, 1)) {
    if (!isBookingDateDisabled(d, calendar, opts)) return d
  }
  return null
}

function parseIsoDate(value: string): Date | null {
  const m = value.trim().match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (!m) return null
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
}

function formatDateKey(d: Date) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}
