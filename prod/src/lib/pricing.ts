import { addDays, addMonths, differenceInCalendarDays, isSameDay, isWeekend, startOfDay } from 'date-fns'
import type { ApiPriceRow } from '@/lib/api'

export type CalendarStatus = 'OPEN' | 'BLOCKED' | 'HOLIDAY'

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

export function isHappyHourSlot(time: string, date: Date): boolean {
  const weekday = date.getDay()
  if (weekday === 0 || weekday === 6) return false
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

export function computeBookingPriceByn(opts: {
  base: number
  birthdayDiscount: boolean
  birthdayDate: string
  selectedDate: Date
  selectedTime: string
  dayStatus?: CalendarStatus
}): number {
  let price = opts.base
  const holiday = opts.dayStatus === 'HOLIDAY' || isWeekend(opts.selectedDate)
  const blocked = opts.dayStatus === 'BLOCKED'

  if (blocked || price <= 0) return price

  if (
    opts.birthdayDiscount &&
    opts.birthdayDate.trim() &&
    isInBirthdayWindow(opts.selectedDate, opts.birthdayDate)
  ) {
    price *= 0.85
  } else if (!holiday && isHappyHourSlot(opts.selectedTime, opts.selectedDate)) {
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
  const status = calendar[key] ?? (isWeekend(date) ? 'HOLIDAY' : 'OPEN')
  if (status === 'BLOCKED' || status === 'HOLIDAY') return true

  if (opts.happyHoursOnly && isWeekend(date)) return true

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
    const allPast =
      slotsForDay.length === 0 || slotsForDay.every((t) => isTimeSlotPast(date, t))
    if (allPast) return true
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
