import { addMonths, getDay, isWeekend, startOfDay } from 'date-fns'
import type { ApiPriceRow } from '@/lib/api'

export type CalendarStatus = 'OPEN' | 'BLOCKED' | 'HOLIDAY'

export type GiftCertProductChoice = 'boeing-737' | 'mi-2' | 'both'

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
  return new Date(year, month, day)
}

export function isInBirthdayWindow(date: Date, birthdayDdMm: string): boolean {
  const b = parseBirthdayDdMm(birthdayDdMm, date.getFullYear())
  if (!b) return false
  const diffDays = Math.abs(
    Math.floor((startOfDay(date).getTime() - startOfDay(b).getTime()) / 86_400_000),
  )
  return diffDays <= 3
}

export function isHappyHourSlot(time: string, date: Date): boolean {
  const weekday = getDay(date)
  if (weekday === 0 || weekday === 6) return false
  const [h, m] = time.split(':').map(Number)
  const mins = h * 60 + (m ?? 0)
  return mins >= 12 * 60 && mins < 15 * 60
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

export function isBookingDateDisabled(
  date: Date,
  calendar: Record<string, CalendarStatus>,
  opts: {
    birthdayDiscount: boolean
    birthdayDate: string
    bookingWindowMonths: number
  },
): boolean {
  const today = startOfDay(new Date())
  if (date < today) return true
  const max = addMonths(today, opts.bookingWindowMonths)
  if (date > max) return true

  const key = formatDateKey(date)
  const status = calendar[key] ?? (isWeekend(date) ? 'HOLIDAY' : 'OPEN')
  if (status === 'BLOCKED' || status === 'HOLIDAY') return true

  if (opts.birthdayDiscount) {
    if (!opts.birthdayDate.trim()) return true
    return !isInBirthdayWindow(date, opts.birthdayDate)
  }

  return false
}

function formatDateKey(d: Date) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}
