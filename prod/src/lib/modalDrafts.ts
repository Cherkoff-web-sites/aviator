import type { BookingTimeSlot } from '../components/booking/bookingTimeSlots'
import type { GiftCertProductChoice } from '../components/booking/bookingPricing'
import type { FlightDurationMin } from './flight-durations'

const BOOKING_DRAFT_KEY = 'aviator.bookingModal.draft'
const GIFT_DRAFT_KEY = 'aviator.giftCertificateModal.draft'

export type BookingModalDraft = {
  aircraft: 'boeing-737' | 'mi-2' | 'combo'
  durationMin: FlightDurationMin
  /** Номер сертификата помним, но переключатель при открытии не включаем */
  giftCertNumber: string
  /** Дата ДР помним, но переключатель при открытии не включаем */
  birthdayDate: string
  selectedDate: string | null
  selectedTime: BookingTimeSlot | null
  name: string
  phone: string
  email: string
  note: string
  payment: 'now' | 'visit'
  consent: boolean
}

export type GiftCertificateModalDraft = {
  product: GiftCertProductChoice
  durationMin: FlightDurationMin
  firstName: string
  lastName: string
  phone: string
  email: string
  note: string
  consent: boolean
}

function readJson<T>(key: string): T | null {
  try {
    const raw = sessionStorage.getItem(key)
    if (!raw) return null
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

function writeJson(key: string, value: unknown) {
  try {
    sessionStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* ignore quota / private mode */
  }
}

export function loadBookingDraft(): BookingModalDraft | null {
  return readJson<BookingModalDraft>(BOOKING_DRAFT_KEY)
}

export function saveBookingDraft(draft: BookingModalDraft) {
  writeJson(BOOKING_DRAFT_KEY, draft)
}

export function clearBookingDraft() {
  try {
    sessionStorage.removeItem(BOOKING_DRAFT_KEY)
  } catch {
    /* ignore */
  }
}

export function loadGiftDraft(): GiftCertificateModalDraft | null {
  return readJson<GiftCertificateModalDraft>(GIFT_DRAFT_KEY)
}

export function saveGiftDraft(draft: GiftCertificateModalDraft) {
  writeJson(GIFT_DRAFT_KEY, draft)
}

export function clearGiftDraft() {
  try {
    sessionStorage.removeItem(GIFT_DRAFT_KEY)
  } catch {
    /* ignore */
  }
}

const BOOKING_OTP_KEY = 'aviator.bookingModal.otpPending'

/** Незавершённое подтверждение email — живёт и при закрытом окне. */
export type BookingOtpPending = {
  bookingId: string
  holdExpiresAt: string
  email: string
  otpResendUsed: boolean
}

export function loadBookingOtpPending(): BookingOtpPending | null {
  return readJson<BookingOtpPending>(BOOKING_OTP_KEY)
}

export function saveBookingOtpPending(pending: BookingOtpPending) {
  writeJson(BOOKING_OTP_KEY, pending)
}

export function clearBookingOtpPending() {
  try {
    sessionStorage.removeItem(BOOKING_OTP_KEY)
  } catch {
    /* ignore */
  }
}
