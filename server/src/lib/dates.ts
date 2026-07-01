import { addDays, addMinutes, format, getDay, parseISO, startOfDay } from 'date-fns'

export function toDateKey(d: Date | string) {
  const date = typeof d === 'string' ? parseISO(d) : d
  return format(startOfDay(date), 'yyyy-MM-dd')
}

export function isWeekend(d: Date) {
  const day = getDay(d)
  return day === 0 || day === 6
}

export function addMinutesToTime(time: string, minutes: number) {
  const [h, m] = time.split(':').map(Number)
  const total = h * 60 + m + minutes
  const nh = Math.floor(total / 60) % 24
  const nm = total % 60
  return `${String(nh).padStart(2, '0')}:${String(nm).padStart(2, '0')}`
}

export function bookingHoldExpiresAt() {
  return addMinutes(new Date(), 2)
}

export function bookingConfirmCodeExpiresAt() {
  return addMinutes(new Date(), 10)
}

export function authCodeExpiresAt(minutes = 10) {
  return addMinutes(new Date(), minutes)
}

export function defaultCertificateValidTo(from: Date) {
  return addDays(from, 90)
}
