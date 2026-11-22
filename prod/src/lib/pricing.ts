import {
  addDays,
  addMonths,
  differenceInCalendarDays,
  format,
  isSameDay,
  isWeekend,
  startOfDay,
} from 'date-fns'
import type { ApiPriceRow } from '@/lib/api'
import { formatAdminDate } from '@/lib/admin-date'

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
  // ДД-ММ или ДД.ММ (год не нужен для ДР)
  const m = value.trim().match(/^(\d{1,2})[-.](\d{1,2})$/)
  if (!m) return null
  const day = Number(m[1])
  const month = Number(m[2]) - 1
  if (month < 0 || month > 11 || day < 1 || day > 31) return null
  const d = new Date(year, month, day)
  if (d.getMonth() !== month || d.getDate() !== day) return null
  return d
}

/** Нормализация ДР к виду ДД-ММ. */
export function formatBirthdayDdMm(value: string): string {
  const d = parseBirthdayDdMm(value, new Date().getFullYear())
  if (!d) return value.trim()
  return format(d, 'dd-MM')
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
  if (isWeekend(date)) {
    if (dayStatus === 'BLOCKED') return 'BLOCKED'
    return 'HOLIDAY'
  }
  return dayStatus ?? 'OPEN'
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

/**
 * Коэффициент скидки: ДР −15%, счастливые часы −10%, иначе без скидки.
 * Для 2в1 применяется к каждой ноге 30 мин отдельно (не к «часовому» тарифу).
 */
export function bookingDiscountMultiplier(opts: {
  birthdayDiscount: boolean
  birthdayDate: string
  selectedDate: Date
  selectedTime: string
  dayStatus?: CalendarStatus
}): number {
  const status = effectiveDayStatus(opts.selectedDate, opts.dayStatus)
  if (status === 'BLOCKED') return 1

  if (
    opts.birthdayDiscount &&
    opts.birthdayDate.trim() &&
    isInBirthdayWindow(opts.selectedDate, opts.birthdayDate)
  ) {
    return 0.85
  }
  if (isHappyHourSlot(opts.selectedTime, opts.selectedDate, opts.dayStatus)) {
    return 0.9
  }
  return 1
}

/** Скидка без округления: 170×0.85 → 144.5 (не 145). Дроби складываются как есть. */
function applyDiscountToAmount(amount: number, multiplier: number): number {
  if (amount <= 0) return 0
  if (multiplier >= 1) return amount
  return amount * multiplier
}

export function computeBookingPriceByn(opts: {
  /** Одна программа (обычный полёт). */
  base?: number
  /**
   * 2в1: цены ног по 30 мин (Boeing + Ми-2).
   * Скидка 15%/10% начисляется на каждую ногу, затем суммы складываются:
   * (170−15%) + (170−15%), а не скидка от часового тарифа 300.
   */
  legs?: number[]
  birthdayDiscount: boolean
  birthdayDate: string
  selectedDate: Date
  selectedTime: string
  dayStatus?: CalendarStatus
}): number {
  const status = effectiveDayStatus(opts.selectedDate, opts.dayStatus)
  const mult = bookingDiscountMultiplier(opts)

  if (opts.legs && opts.legs.length > 0) {
    if (status === 'BLOCKED') {
      return opts.legs.reduce((s, n) => s + Math.max(0, n), 0)
    }
    return opts.legs.reduce((s, n) => s + applyDiscountToAmount(n, mult), 0)
  }

  const base = opts.base ?? 0
  if (status === 'BLOCKED' || base <= 0) return base <= 0 ? 0 : base
  return applyDiscountToAmount(base, mult)
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
  /**
   * Комбо 2в1: день закрыт, если ТО на весь день хотя бы на одном тренажёре
   * или нет общего свободного слота на оба.
   */
  comboMode?: boolean
  durationMin?: number
  /** Дни, которые API пометил fullyClosed (зал / BLOCKED), даже если status ещё OPEN */
  fullyClosedDates?: ReadonlySet<string> | Record<string, boolean>
}

function isFullyClosedFlag(
  key: string,
  fullyClosedDates: BookingDateDisableOpts['fullyClosedDates'],
): boolean {
  if (!fullyClosedDates) return false
  if (fullyClosedDates instanceof Set) return fullyClosedDates.has(key)
  return Boolean(fullyClosedDates[key])
}

/** День закрыт ТО для выбранного режима (один тренажёр или комбо). */
export function isDateClosedForBookingMode(
  dateKey: string,
  maintenance: PublicMaintenance[] | undefined,
  opts: Pick<BookingDateDisableOpts, 'simulatorSlug' | 'comboMode'>,
): boolean {
  if (opts.comboMode) {
    return (
      isDateClosedByMaintenance(dateKey, maintenance, null) ||
      isDateClosedByMaintenance(dateKey, maintenance, 'boeing-737') ||
      isDateClosedByMaintenance(dateKey, maintenance, 'mi-2')
    )
  }
  return isDateClosedByMaintenance(dateKey, maintenance, opts.simulatorSlug)
}

function hasAnyOpenSlotForSim(
  date: Date,
  key: string,
  slots: readonly string[],
  duration: number,
  simulatorSlug: string,
  maintenance: PublicMaintenance[] | undefined,
): boolean {
  return slots.some(
    (t) =>
      !isTimeSlotPast(date, t) &&
      !isSlotClosedByMaintenance(key, t, duration, simulatorSlug, maintenance),
  )
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
  if (isFullyClosedFlag(key, opts.fullyClosedDates)) return true
  if (isDateClosedForBookingMode(key, opts.maintenance, opts)) return true

  if (opts.happyHoursOnly && isRedDay(date, status)) return true

  if (opts.certificate) {
    const from = startOfDay(parseIsoDate(opts.certificate.validFrom) ?? today)
    const to = startOfDay(parseIsoDate(opts.certificate.validTo) ?? today)
    if (date < from || date > to) return true
  } else if (opts.birthdayDiscount) {
    if (!isBirthdayInputValid(opts.birthdayDate)) return true
    if (!isInBirthdayWindow(date, opts.birthdayDate)) return true
  }

  const duration = opts.durationMin ?? 30
  const slotsForDay = opts.timeSlots?.length
    ? opts.happyHoursOnly
      ? opts.timeSlots.filter((t) => isHappyHourTime(t))
      : opts.timeSlots
    : null

  const comboMaintOk = (t: string) => {
    const gap = 15
    const secondMins =
      Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5)) + 30 + gap
    const second = `${String(Math.floor(secondMins / 60)).padStart(2, '0')}:${String(secondMins % 60).padStart(2, '0')}`
    const boeingFirst =
      !isSlotClosedByMaintenance(key, t, 30, 'boeing-737', opts.maintenance) &&
      !isSlotClosedByMaintenance(key, second, 30, 'mi-2', opts.maintenance)
    const mi2First =
      !isSlotClosedByMaintenance(key, t, 30, 'mi-2', opts.maintenance) &&
      !isSlotClosedByMaintenance(key, second, 30, 'boeing-737', opts.maintenance)
    return boeingFirst || mi2First
  }

  if (slotsForDay?.length && isSameDay(date, today)) {
    if (opts.comboMode) {
      const usable = slotsForDay.filter((t) => !isTimeSlotPast(date, t) && comboMaintOk(t))
      if (usable.length === 0) return true
    } else {
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
  }

  // День с частичным ТО: если все слоты закрыты — дата недоступна (не кликабельна)
  if (slotsForDay?.length && opts.maintenance?.length) {
    if (opts.comboMode) {
      const anyOpen = slotsForDay.some((t) => !isTimeSlotPast(date, t) && comboMaintOk(t))
      if (!anyOpen) return true
    } else if (opts.simulatorSlug) {
      if (!hasAnyOpenSlotForSim(date, key, slotsForDay, duration, opts.simulatorSlug, opts.maintenance)) {
        return true
      }
    }
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

/** Понятная причина, почему дата/время нельзя выбрать (для формы брони). */
export function describeBookingDateTimeProblem(
  date: Date | null,
  time: string | null,
  calendar: Record<string, CalendarStatus>,
  opts: BookingDateDisableOpts,
): string | null {
  if (!date) return 'Выберите дату полёта в календаре.'
  if (!time) return 'Выберите время начала полёта.'

  const today = startOfDay(new Date())
  if (date < today) return 'Нельзя выбрать прошедшую дату. Выберите сегодня или позже.'

  const max = addMonths(today, opts.bookingWindowMonths)
  if (date > max) {
    return `Запись открыта только на ${opts.bookingWindowMonths} мес. вперёд. Выберите более раннюю дату.`
  }

  if (opts.requireValidCertificate) {
    return 'Сначала укажите действующий номер подарочного сертификата — без него дата недоступна.'
  }

  const key = formatDateKey(date)
  const status = effectiveDayStatus(date, calendar[key])

  if (status === 'BLOCKED' || isFullyClosedFlag(key, opts.fullyClosedDates)) {
    return 'Эта дата закрыта (блокировка или ТО на весь день). Выберите другой день.'
  }
  if (isDateClosedForBookingMode(key, opts.maintenance, opts)) {
    return opts.comboMode
      ? 'На эту дату комбо недоступно: один из тренажёров закрыт на ТО. Выберите другой день.'
      : 'На эту дату тренажёр закрыт на техобслуживание. Выберите другой день или тренажёр.'
  }

  if (opts.happyHoursOnly && isRedDay(date, status)) {
    return '«Счастливые часы» действуют только в будни. В выходные и праздники акция недоступна.'
  }

  if (opts.certificate) {
    const from = startOfDay(parseIsoDate(opts.certificate.validFrom) ?? today)
    const to = startOfDay(parseIsoDate(opts.certificate.validTo) ?? today)
    if (date < from || date > to) {
      return `Сертификат действует с ${formatAdminDate(opts.certificate.validFrom)} по ${formatAdminDate(opts.certificate.validTo)}. Выберите дату в этом периоде.`
    }
  } else if (opts.birthdayDiscount) {
    if (!isBirthdayInputValid(opts.birthdayDate)) {
      return 'Для скидки на день рождения укажите дату рождения в формате ДД.ММ.'
    }
    if (!isInBirthdayWindow(date, opts.birthdayDate)) {
      return 'Скидка на день рождения действует только в сам день и ±3 дня. Выберите дату в этом окне.'
    }
  }

  if (opts.happyHoursOnly && !isHappyHourTime(time)) {
    return 'Для «Счастливых часов» доступны слоты с 12:00 до 15:00 в будни. Выберите другое время.'
  }

  if (isTimeSlotPast(date, time)) {
    return 'Это время сегодня уже прошло. Выберите более поздний слот или другую дату.'
  }

  const duration = opts.durationMin ?? 30
  if (
    opts.simulatorSlug &&
    isSlotClosedByMaintenance(key, time, duration, opts.simulatorSlug, opts.maintenance)
  ) {
    return 'Выбранный слот пересекается с техобслуживанием. Выберите другое время.'
  }

  if (isBookingDateDisabled(date, calendar, opts)) {
    return 'На эту дату нет доступных слотов для выбранных условий. Выберите другой день.'
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
