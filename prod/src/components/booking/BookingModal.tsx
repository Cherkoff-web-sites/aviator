import * as Dialog from '@radix-ui/react-dialog'
import { format, startOfToday } from 'date-fns'
import { ru } from 'date-fns/locale'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { DayPicker, UI } from 'react-day-picker'
import { ru as ruRdp } from 'react-day-picker/locale'
import 'react-day-picker/style.css'

import type { BookingOpenPayload, BookingSimulatorSlug } from '../../contexts/BookingModalContext'
import { useBookingModal } from '../../contexts/BookingModalContext'
import { apiFetch, type ApiPriceRow } from '../../lib/api'
import {
  clearBookingDraft,
  loadBookingDraft,
  saveBookingDraft,
} from '../../lib/modalDrafts'
import {
  sanitizeCertificateNumberInput,
  sanitizeEmailInput,
  sanitizeNoteInput,
  sanitizeOtpDigitInput,
  sanitizePersonNameInput,
  sanitizePhoneInput,
  isCertificateNumberInputValid,
} from '../../lib/fieldInput'
import {
  computeBookingPriceByn,
  findFirstBookableDate,
  getBaseFlightPrice,
  isBookingDateDisabled,
  isBirthdayInputValid,
  isEmailValid,
  isHappyHourTime,
  isPersonNameValid,
  isPhoneValid,
  isTimeSlotPast,
  parseBirthdayDdMm,
  type CalendarStatus,
  type CertValidity,
} from '../../lib/pricing'
import { BOOKING_TIME_SLOTS, type BookingTimeSlot } from './bookingTimeSlots'
import {
  clampDurationForSimulator,
  durationsForSimulator,
  type FlightDurationMin,
} from '../../lib/flight-durations'

function capitalizeRu(s: string) {
  if (!s) return s
  return s.charAt(0).toLocaleUpperCase('ru-RU') + s.slice(1)
}

function defaultAircraftFromSlug(slug: BookingSimulatorSlug | null | undefined): 'boeing-737' | 'mi-2' {
  if (slug === 'mi-2') return 'mi-2'
  return 'boeing-737'
}

function formatSlotDisplay(date: Date, time: BookingTimeSlot) {
  const datePart = format(date, 'dd.MM.yyyy', { locale: ru })
  return `${datePart}. ${time} Мск`
}

function formatFooterSummary(date: Date, time: BookingTimeSlot) {
  const w = format(date, 'EEEE, d MMMM', { locale: ru })
  return `${capitalizeRu(w)}. ${time}`
}

function Pill({
  selected,
  children,
  className = '',
  onClick,
  type = 'button',
}: {
  selected: boolean
  children: React.ReactNode
  className?: string
  onClick?: () => void
  type?: 'button' | 'submit'
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      className={[
        'rounded-full border px-4 py-2.5 text-center text-[13px] font-semibold uppercase tracking-wide transition-colors min-[990px]:px-5 min-[990px]:py-3 min-[990px]:text-[14px]',
        selected
          ? 'border-[#0075FF] bg-white text-[#0075FF]'
          : 'border-[#d1d5db] bg-[#f0f1f3] text-[#002D62] hover:border-[#0075FF]/40',
        className,
      ].join(' ')}
    >
      {children}
    </button>
  )
}

function SwitchRow({
  label,
  checked,
  onChange,
}: {
  label: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-[14px] font-semibold leading-snug text-[#002D62] min-[990px]:text-[15px]">
        {label}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={[
          'relative h-7 w-12 shrink-0 rounded-full transition-colors',
          checked ? 'bg-[#0075FF]' : 'bg-[#c5cad1]',
        ].join(' ')}
      >
        <span
          className={[
            'absolute left-0.5 top-0.5 h-6 w-6 rounded-full bg-white shadow-sm transition-transform',
            checked ? 'translate-x-[22px]' : 'translate-x-0',
          ].join(' ')}
        />
      </button>
    </div>
  )
}

function inputClass(invalid = false) {
  return [
    'w-full rounded-lg border bg-[#f0f1f3] px-3 py-2.5 text-[14px] font-medium text-[#002D62]',
    'placeholder:text-[#8b95a8] outline-none focus:ring-1',
    'min-[990px]:px-4 min-[990px]:py-3 min-[990px]:text-[15px]',
    invalid
      ? 'border-red-500 focus:border-red-500 focus:ring-red-500/30'
      : 'border-[#d1d5db] focus:border-[#0075FF] focus:ring-[#0075FF]/30',
  ].join(' ')
}

function labelClass() {
  return 'mb-1.5 block text-[13px] font-semibold text-[#002D62] min-[990px]:text-[14px]'
}

function CalendarFieldIcon() {
  return (
    <svg
      className="h-5 w-5 shrink-0 text-[#002D62]"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
    >
      <rect x="3" y="5" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="1.75" />
      <path
        d="M3 10h18M8 3v4M16 3v4"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  )
}

function calendarFieldShellClass(invalid = false) {
  return [
    'flex w-full items-center justify-between gap-2 rounded-lg border bg-[#f0f1f3] px-3 py-2.5 text-left min-[990px]:px-4 min-[990px]:py-3',
    invalid ? 'border-red-500' : 'border-[#d1d5db]',
  ].join(' ')
}

function SwitchReveal({ open, children }: { open: boolean; children: React.ReactNode }) {
  return (
    <div
      className={[
        'grid transition-[grid-template-rows,opacity] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]',
        open ? 'grid-rows-[1fr] opacity-100' : 'pointer-events-none grid-rows-[0fr] opacity-0',
      ].join(' ')}
      aria-hidden={!open}
    >
      <div className="min-h-0 overflow-hidden">
        <div
          className={[
            'flex flex-col gap-2 transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]',
            open ? 'translate-y-0' : '-translate-y-1',
          ].join(' ')}
        >
          {children}
        </div>
      </div>
    </div>
  )
}

function PromoTip({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-lg bg-[#eceef2] px-3 py-2.5 text-[13px] font-medium leading-relaxed text-[#5a6578] min-[990px]:px-4 min-[990px]:py-3 min-[990px]:text-[14px]">
      {children}
    </div>
  )
}

function applyOpenPayload(
  payload: BookingOpenPayload | null,
): {
  aircraft: 'boeing-737' | 'mi-2'
  durationMin: FlightDurationMin
  pageSlug: BookingSimulatorSlug | null
} {
  const pageSlug = payload?.simulatorSlug ?? null
  const aircraft = defaultAircraftFromSlug(pageSlug)
  const durationRaw = payload?.durationMin
  const durationMin = clampDurationForSimulator(
    aircraft,
    durationRaw === 30 || durationRaw === 60 || durationRaw === 90 || durationRaw === 120
      ? durationRaw
      : 30,
  )
  return { aircraft, durationMin, pageSlug }
}

type WizardStep = 'form' | 'otp' | 'success'

const OTP_EMPTY = () => ['', '', '', '', '', '']

/** Нестираемая метка акции для менеджеров в примечании. */
const HAPPY_HOURS_NOTE_TAG = '«Счастливые часы»'

function composeBookingComment(userNote: string, happyHoursOnly: boolean) {
  const user = userNote.trim()
  if (!happyHoursOnly) return user
  return user ? `${HAPPY_HOURS_NOTE_TAG}. ${user}` : HAPPY_HOURS_NOTE_TAG
}

function parseDraftDate(value: string | null | undefined): Date | null {
  if (!value) return null
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? null : d
}

function BookingModal() {
  const { isOpen, closeBooking, payload } = useBookingModal()
  const draftRef = useRef(loadBookingDraft())
  const draft = draftRef.current

  const [dateTimeOpen, setDateTimeOpen] = useState(false)
  const [birthdayPickerOpen, setBirthdayPickerOpen] = useState(false)
  const [birthdayPickerDate, setBirthdayPickerDate] = useState<Date>(() => startOfToday())
  const [wizardStep, setWizardStep] = useState<WizardStep>('form')
  const [otpDigits, setOtpDigits] = useState<string[]>(() => OTP_EMPTY())
  const [resendSec, setResendSec] = useState(60)
  const [bookingId, setBookingId] = useState<string | null>(null)
  const [phone, setPhone] = useState(() => sanitizePhoneInput(draft?.phone ?? ''))
  const [email, setEmail] = useState(() => sanitizeEmailInput(draft?.email ?? ''))
  const [bookingError, setBookingError] = useState('')
  const otpRefs = useRef<(HTMLInputElement | null)[]>([])

  const [aircraft, setAircraft] = useState<'boeing-737' | 'mi-2'>(
    () => draft?.aircraft ?? 'boeing-737',
  )
  const [durationMin, setDurationMin] = useState<FlightDurationMin>(
    () => draft?.durationMin ?? 30,
  )
  const [hasGiftCert, setHasGiftCert] = useState(false)
  const [giftCertNumber, setGiftCertNumber] = useState(() =>
    sanitizeCertificateNumberInput(draft?.giftCertNumber ?? ''),
  )
  const [birthdayDiscount, setBirthdayDiscount] = useState(false)
  const [birthdayDate, setBirthdayDate] = useState(() => draft?.birthdayDate ?? '')
  const [happyHoursOnly, setHappyHoursOnly] = useState(false)
  const [selectedDate, setSelectedDate] = useState<Date | null>(() =>
    parseDraftDate(draft?.selectedDate),
  )
  const [selectedTime, setSelectedTime] = useState<BookingTimeSlot | null>(() => {
    const t = draft?.selectedTime
    return t && (BOOKING_TIME_SLOTS as readonly string[]).includes(t) ? t : null
  })
  const [name, setName] = useState(() => sanitizePersonNameInput(draft?.name ?? ''))
  const [note, setNote] = useState(() => sanitizeNoteInput(draft?.note ?? ''))
  const [payment, setPayment] = useState<'now' | 'visit'>(() => draft?.payment ?? 'visit')
  const [consent, setConsent] = useState(() => draft?.consent ?? false)
  const [submitted, setSubmitted] = useState(false)
  const [flightPrices, setFlightPrices] = useState<ApiPriceRow[]>([])
  const [calendarMap, setCalendarMap] = useState<Record<string, CalendarStatus>>({})
  const [bookingWindowMonths, setBookingWindowMonths] = useState(3)
  const [certValid, setCertValid] = useState<boolean | null>(null)
  const [certInfo, setCertInfo] = useState<CertValidity | null>(null)

  const resetDraftFields = useCallback(() => {
    setAircraft('boeing-737')
    setDurationMin(30)
    setHasGiftCert(false)
    setGiftCertNumber('')
    setBirthdayDiscount(false)
    setBirthdayDate('')
    setHappyHoursOnly(false)
    setCertValid(null)
    setCertInfo(null)
    setSelectedDate(null)
    setSelectedTime(null)
    setName('')
    setPhone('')
    setEmail('')
    setNote('')
    setPayment('visit')
    setConsent(false)
    setSubmitted(false)
    setWizardStep('form')
    setDateTimeOpen(false)
    setBirthdayPickerOpen(false)
    setOtpDigits(OTP_EMPTY())
    setResendSec(60)
    setBookingId(null)
    setBookingError('')
    clearBookingDraft()
  }, [])

  useEffect(() => {
    if (!isOpen) {
      setDateTimeOpen(false)
      setBirthdayPickerOpen(false)
      // Лояльности не тащим между открытиями — только явно из promo-контекста
      setHasGiftCert(false)
      setBirthdayDiscount(false)
      setHappyHoursOnly(false)
      setCertValid(null)
      setCertInfo(null)
      return
    }

    if (payload?.simulatorSlug != null || payload?.durationMin != null) {
      const { aircraft: ac, durationMin: d } = applyOpenPayload(payload)
      if (payload.simulatorSlug != null) setAircraft(ac)
      if (payload.durationMin != null) {
        setDurationMin(d)
      } else if (payload.simulatorSlug != null) {
        setDurationMin((prev) => clampDurationForSimulator(ac, prev))
      }
    }

    // Сбрасываем переключатели, затем включаем только если открыли из промо-карточки
    setHasGiftCert(false)
    setBirthdayDiscount(false)
    setHappyHoursOnly(false)
    setCertValid(null)
    setCertInfo(null)

    if (payload?.promo === 'birthday') {
      setBirthdayDiscount(true)
    } else if (payload?.promo === 'happy-hours') {
      setHappyHoursOnly(true)
      setSelectedTime((t) => (t && isHappyHourTime(t) ? t : null))
    }
  }, [isOpen, payload])

  useEffect(() => {
    saveBookingDraft({
      aircraft,
      durationMin,
      giftCertNumber,
      birthdayDate,
      selectedDate: selectedDate ? selectedDate.toISOString() : null,
      selectedTime,
      name,
      phone,
      email,
      note,
      payment,
      consent,
    })
  }, [
    aircraft,
    durationMin,
    giftCertNumber,
    birthdayDate,
    selectedDate,
    selectedTime,
    name,
    phone,
    email,
    note,
    payment,
    consent,
  ])

  useEffect(() => {
    if (!isOpen) return
    void Promise.all([
      apiFetch<{ days: { date: string; status: CalendarStatus }[] }>('/api/public/calendar'),
      apiFetch<ApiPriceRow[]>('/api/public/prices/flights'),
      apiFetch<{ bookingWindowMonths: number }>('/api/public/settings'),
    ]).then(([cal, prices, settings]) => {
      const map: Record<string, CalendarStatus> = {}
      for (const d of cal.days) map[d.date] = d.status
      setCalendarMap(map)
      setFlightPrices(prices)
      setBookingWindowMonths(settings.bookingWindowMonths)
    })
  }, [isOpen])

  useEffect(() => {
    if (!hasGiftCert || !giftCertNumber.trim()) {
      setCertValid(null)
      setCertInfo(null)
      return
    }
    const timer = window.setTimeout(() => {
      void apiFetch<{
        valid: boolean
        simulatorSlug?: string
        durationMin?: number
        number?: string
        validFrom?: string
        validTo?: string
      }>(`/api/public/certificates/validate?number=${encodeURIComponent(giftCertNumber.trim())}`)
        .then((r) => {
          setCertValid(r.valid)
          if (r.valid && r.validFrom && r.validTo) {
            setCertInfo({
              validFrom: r.validFrom,
              validTo: r.validTo,
              simulatorSlug: r.simulatorSlug,
              durationMin: r.durationMin,
              number: r.number,
            })
            if (r.simulatorSlug === 'mi-2' || r.simulatorSlug === 'boeing-737') {
              setAircraft(r.simulatorSlug)
            }
            if (
              r.durationMin === 30 ||
              r.durationMin === 60 ||
              r.durationMin === 90 ||
              r.durationMin === 120
            ) {
              const slug =
                r.simulatorSlug === 'mi-2' || r.simulatorSlug === 'boeing-737'
                  ? r.simulatorSlug
                  : 'boeing-737'
              setDurationMin(clampDurationForSimulator(slug, r.durationMin))
            }
          } else {
            setCertInfo(null)
          }
        })
        .catch(() => {
          setCertValid(false)
          setCertInfo(null)
        })
    }, 350)
    return () => window.clearTimeout(timer)
  }, [hasGiftCert, giftCertNumber])

  const dateDisableOpts = useMemo(
    () => ({
      birthdayDiscount,
      birthdayDate,
      bookingWindowMonths,
      certificate: hasGiftCert && certValid && certInfo ? certInfo : null,
      requireValidCertificate: hasGiftCert && !(certValid === true && certInfo),
      timeSlots: BOOKING_TIME_SLOTS,
      happyHoursOnly,
    }),
    [
      birthdayDiscount,
      birthdayDate,
      bookingWindowMonths,
      hasGiftCert,
      certValid,
      certInfo,
      happyHoursOnly,
    ],
  )

  useEffect(() => {
    if (!selectedDate) return
    if (!isBookingDateDisabled(selectedDate, calendarMap, dateDisableOpts)) {
      return
    }
    const next = findFirstBookableDate(calendarMap, dateDisableOpts)
    setSelectedDate(next)
    if (!next) setSelectedTime(null)
  }, [calendarMap, dateDisableOpts, selectedDate])

  const availableTimeSlots = useMemo(() => {
    let slots: BookingTimeSlot[] = [...BOOKING_TIME_SLOTS]
    if (happyHoursOnly) {
      slots = slots.filter((t) => isHappyHourTime(t))
    }
    if (selectedDate) {
      slots = slots.filter((t) => !isTimeSlotPast(selectedDate, t))
    }
    return slots
  }, [selectedDate, happyHoursOnly])

  useEffect(() => {
    if (selectedTime === null) return
    if (availableTimeSlots.length === 0) {
      setSelectedTime(null)
      return
    }
    if (!availableTimeSlots.includes(selectedTime)) {
      setSelectedTime(null)
    }
  }, [availableTimeSlots, selectedTime])

  useEffect(() => {
    if (wizardStep !== 'otp') return
    setResendSec(60)
    const id = window.setInterval(() => {
      setResendSec((s) => (s <= 0 ? 0 : s - 1))
    }, 1000)
    return () => window.clearInterval(id)
  }, [wizardStep])

  useEffect(() => {
    if (wizardStep !== 'otp') return
    if (!otpDigits.every((d) => d.length === 1)) return
    if (!bookingId) return
    const code = otpDigits.join('')
    void apiFetch(`/api/public/bookings/${bookingId}/confirm`, {
      method: 'POST',
      body: JSON.stringify({ code }),
    })
      .then(() => setWizardStep('success'))
      .catch(() => setBookingError('Неверный или просроченный код'))
  }, [otpDigits, wizardStep, bookingId])

  useEffect(() => {
    if (wizardStep !== 'otp') return
    const id = window.requestAnimationFrame(() => otpRefs.current[0]?.focus())
    return () => window.cancelAnimationFrame(id)
  }, [wizardStep])

  const priceByn = useMemo(() => {
    const base = getBaseFlightPrice(flightPrices, aircraft, durationMin)
    if (!selectedDate || !selectedTime) return base
    const dateKey = format(selectedDate, 'yyyy-MM-dd')
    return computeBookingPriceByn({
      base,
      birthdayDiscount,
      birthdayDate,
      selectedDate,
      selectedTime,
      dayStatus: calendarMap[dateKey],
    })
  }, [
    aircraft,
    durationMin,
    flightPrices,
    birthdayDiscount,
    birthdayDate,
    selectedDate,
    selectedTime,
    calendarMap,
  ])

  const dateTimeLabel = useMemo(() => {
    if (!selectedDate || !selectedTime) return ''
    return formatSlotDisplay(selectedDate, selectedTime)
  }, [selectedDate, selectedTime])

  const fieldErrors = useMemo(() => {
    const dateTimeInvalid =
      !selectedDate ||
      !selectedTime ||
      isBookingDateDisabled(selectedDate, calendarMap, dateDisableOpts) ||
      isTimeSlotPast(selectedDate, selectedTime) ||
      (happyHoursOnly && !isHappyHourTime(selectedTime))
    return {
      name: !isPersonNameValid(name),
      phone: !isPhoneValid(phone),
      email: !isEmailValid(email),
      giftCert:
        hasGiftCert &&
        (!giftCertNumber.trim() ||
          !isCertificateNumberInputValid(giftCertNumber) ||
          certValid !== true),
      birthday: birthdayDiscount && !isBirthdayInputValid(birthdayDate),
      consent: !consent,
      dateTime: dateTimeInvalid,
    }
  }, [
    name,
    phone,
    email,
    hasGiftCert,
    giftCertNumber,
    certValid,
    birthdayDiscount,
    birthdayDate,
    consent,
    selectedDate,
    selectedTime,
    calendarMap,
    dateDisableOpts,
    happyHoursOnly,
  ])

  const onDialogOpenChange = useCallback(
    (open: boolean) => {
      if (!open) {
        setDateTimeOpen(false)
        setBirthdayPickerOpen(false)
        if (wizardStep === 'success') {
          resetDraftFields()
        } else if (wizardStep === 'otp') {
          setWizardStep('form')
          setOtpDigits(OTP_EMPTY())
          setBookingId(null)
          setBookingError('')
          setResendSec(60)
        }
        closeBooking()
      }
    },
    [closeBooking, resetDraftFields, wizardStep],
  )

  const confirmDateTime = useCallback(() => {
    setDateTimeOpen(false)
  }, [])

  const openBirthdayPicker = useCallback(() => {
    const parsed = parseBirthdayDdMm(birthdayDate, new Date().getFullYear())
    setBirthdayPickerDate(parsed ?? startOfToday())
    setDateTimeOpen(false)
    setBirthdayPickerOpen(true)
  }, [birthdayDate])

  const confirmBirthdayDate = useCallback(() => {
    setBirthdayDate(format(birthdayPickerDate, 'dd.MM'))
    setBirthdayPickerOpen(false)
  }, [birthdayPickerDate])

  const dayPickerClassNames = {
    [UI.Root]: 'w-full',
    [UI.Months]: 'flex w-full flex-col gap-2',
    [UI.Month]: 'w-full',
    [UI.MonthGrid]: 'w-full table-fixed border-separate border-spacing-1',
    [UI.MonthCaption]: 'flex items-center justify-between px-1 py-2',
    [UI.CaptionLabel]: 'text-[15px] font-bold capitalize text-[#002D62] min-[990px]:text-[16px]',
    [UI.Nav]: 'flex items-center gap-1',
    [UI.PreviousMonthButton]:
      'inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#d1d5db] text-[#002D62] hover:bg-[#f0f1f3]',
    [UI.NextMonthButton]:
      'inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#d1d5db] text-[#002D62] hover:bg-[#f0f1f3]',
    [UI.Weekdays]: 'w-full',
    [UI.Weekday]:
      'px-0 py-1.5 text-center text-[10px] font-semibold uppercase leading-tight text-[#002D62] min-[400px]:py-2 min-[400px]:text-[11px]',
    [UI.Week]: '',
    [UI.Day]: 'p-0.5 text-center align-middle',
    [UI.DayButton]:
      'mx-auto flex h-10 w-10 items-center justify-center rounded-lg text-[13px] font-medium text-[#002D62] hover:bg-[#e8f2ff] data-[selected-single=true]:rounded-lg data-[selected-single=true]:bg-[#0075FF] data-[selected-single=true]:text-white min-[400px]:h-11 min-[400px]:w-11 min-[400px]:text-[14px] disabled:text-[#9ca3af] disabled:opacity-60',
  } as const

  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isOpen) return
    scrollRef.current?.scrollTo({ top: 0 })
  }, [isOpen, dateTimeOpen, birthdayPickerOpen, wizardStep])

  return (
    <Dialog.Root open={isOpen} onOpenChange={onDialogOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[100] bg-black/45" />
        {/*
          Скролл именно на Dialog.Content: иначе react-remove-scroll (Radix)
          блокирует wheel/touch на внешнем wrapper — скролл «то работает, то нет».
          my-auto центрирует короткую карточку и не обрезает верх у высокой.
        */}
        <Dialog.Content
          ref={scrollRef}
          className="fixed inset-0 z-[101] overflow-y-auto overscroll-contain bg-transparent p-0 shadow-none outline-none focus:outline-none"
          onOpenAutoFocus={(e) => {
            if (wizardStep === 'form' && (dateTimeOpen || birthdayPickerOpen)) e.preventDefault()
          }}
          onPointerDownOutside={(e) => {
            // Content на весь экран — «снаружи» почти нет; закрытие через backdrop ниже
            e.preventDefault()
          }}
          onInteractOutside={(e) => {
            e.preventDefault()
          }}
        >
          <div
            className="flex min-h-full justify-center px-[10px] py-6 min-[480px]:py-8 min-[990px]:py-10"
            onPointerDown={(e) => {
              if (e.target === e.currentTarget) onDialogOpenChange(false)
            }}
          >
            <div
              className="relative my-auto w-[min(calc(100vw-20px),960px)] max-w-[960px] rounded-2xl bg-white p-4 shadow-[0_24px_80px_rgba(0,45,98,0.22)] min-[480px]:p-5 min-[990px]:rounded-[24px] min-[990px]:p-8"
              onPointerDown={(e) => e.stopPropagation()}
            >
          <div className="relative">
            <div className="mb-4 flex items-start justify-between gap-3">
              {wizardStep === 'form' ? (
                <Dialog.Title className="flex-1 pr-10 text-center text-[20px] font-bold leading-tight text-[#002D62] min-[990px]:text-[22px]">
                  Бронирование полета
                </Dialog.Title>
              ) : wizardStep === 'otp' ? (
                <Dialog.Title className="sr-only">Ввод кода из письма</Dialog.Title>
              ) : (
                <Dialog.Title className="sr-only">Бронирование оформлено</Dialog.Title>
              )}
              <Dialog.Close
                type="button"
                className="absolute right-0 top-0 inline-flex h-9 w-9 items-center justify-center rounded-full text-[#002D62] hover:bg-[#f0f1f3]"
                aria-label="Закрыть"
              >
                <span className="text-2xl leading-none" aria-hidden>
                  ×
                </span>
              </Dialog.Close>
            </div>

            {wizardStep === 'success' ? (
              <div className="flex flex-col items-center justify-center px-2 py-10 text-center min-[990px]:py-14">
                <p className="text-[22px] font-bold leading-tight text-[#002D62] min-[990px]:text-[26px]">
                  Спасибо за бронирование!
                </p>
                <p className="mt-3 max-w-[340px] text-[15px] font-medium leading-relaxed text-[#5a6578] min-[990px]:mt-4 min-[990px]:text-[16px]">
                  Мы будем рады видеть вас!
                </p>
              </div>
            ) : wizardStep === 'otp' ? (
              <div className="flex flex-col px-1 pt-1 min-[990px]:px-2">
                <h2 className="text-center text-[18px] font-bold leading-snug text-[#1a1f2e] min-[990px]:text-[20px]">
                  Подтвердите бронирование по
                </h2>
                <p className="mt-4 text-center text-[13px] font-medium leading-relaxed text-[#6b7289] min-[990px]:mt-5 min-[990px]:text-[14px]">
                  Введите код из письма, отправленного на {email || 'указанный email'}
                </p>
                <div className="mt-8 flex justify-center gap-2 min-[990px]:mt-10 min-[990px]:gap-2.5">
                  {otpDigits.map((digit, i) => (
                    <input
                      key={i}
                      ref={(el) => {
                        otpRefs.current[i] = el
                      }}
                      type="text"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => {
                        const v = sanitizeOtpDigitInput(e.target.value)
                        setOtpDigits((prev) => {
                          const next = [...prev]
                          next[i] = v
                          return next
                        })
                        if (v) otpRefs.current[i + 1]?.focus()
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Backspace' && i > 0 && e.currentTarget.value === '') {
                          otpRefs.current[i - 1]?.focus()
                        }
                      }}
                      onPaste={(e) => {
                        if (i !== 0) return
                        e.preventDefault()
                        const raw = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
                        const chars = raw.split('')
                        setOtpDigits(() => {
                          const next = ['', '', '', '', '', '']
                          for (let j = 0; j < chars.length; j++) next[j] = chars[j] ?? ''
                          return next
                        })
                        window.requestAnimationFrame(() => {
                          otpRefs.current[Math.min(chars.length, 5)]?.focus()
                        })
                      }}
                      className="h-12 w-10 rounded-lg border-2 border-[#d1d5db] bg-white text-center text-[18px] font-semibold text-[#002D62] outline-none transition-colors focus:border-[#002D62] min-[990px]:h-14 min-[990px]:w-11 min-[990px]:text-[20px]"
                    />
                  ))}
                </div>
                <p className="mt-8 text-center text-[13px] font-medium text-[#5a6578] min-[990px]:mt-10 min-[990px]:text-[14px]">
                  Запросить новый код можно через{' '}
                  {resendSec > 0 ? (
                    <span className="font-semibold text-[#0075FF]">{resendSec} сек</span>
                  ) : (
                    <button
                      type="button"
                      className="font-semibold text-[#0075FF] underline-offset-2 hover:underline"
                      onClick={() => {
                        if (!bookingId) return
                        void apiFetch(`/api/public/bookings/${bookingId}/resend-code`, {
                          method: 'POST',
                        })
                          .then(() => setResendSec(60))
                          .catch(() => setBookingError('Повторная отправка пока недоступна'))
                      }}
                    >
                      отправить снова
                    </button>
                  )}
                </p>
              </div>
            ) : birthdayPickerOpen ? (
              <div className="flex flex-col">
                <button
                  type="button"
                  onClick={() => setBirthdayPickerOpen(false)}
                  className="mb-3 self-start text-[14px] font-semibold text-[#0075FF] underline-offset-2 hover:underline min-[990px]:text-[15px]"
                >
                  ← Назад к форме
                </button>
                <div className="min-w-0">
                  <p className="mb-2 text-[14px] font-semibold text-[#002D62] min-[990px]:text-[15px]">
                    Дата дня рождения
                  </p>
                  <DayPicker
                    mode="single"
                    required
                    selected={birthdayPickerDate}
                    onSelect={(d) => {
                      if (d) setBirthdayPickerDate(d)
                    }}
                    locale={ruRdp}
                    showOutsideDays={false}
                    className="booking-rdp w-full max-w-none [--rdp-accent-color:#0075FF] [--rdp-background-color:#fff]"
                    classNames={dayPickerClassNames}
                  />
                </div>

                <div className="mt-4 border-t border-dotted border-[#0075FF] pt-4 min-[990px]:mt-5 min-[990px]:pt-5">
                  <div className="flex flex-col gap-3 min-[990px]:flex-row min-[990px]:items-center min-[990px]:justify-between">
                    <p className="text-[14px] font-semibold text-[#002D62] min-[990px]:text-[15px]">
                      {capitalizeRu(format(birthdayPickerDate, 'd MMMM', { locale: ru }))}
                    </p>
                    <button
                      type="button"
                      onClick={confirmBirthdayDate}
                      className="w-full rounded-xl bg-[linear-gradient(180deg,#4da3ff_0%,#0075ff_48%,#0050b3_100%)] px-8 py-2.5 text-[15px] font-semibold text-white shadow-[0_6px_20px_rgba(0,117,255,0.35)] min-[990px]:w-auto min-[990px]:py-3"
                    >
                      Продолжить
                    </button>
                  </div>
                </div>
              </div>
            ) : !dateTimeOpen ? (
              <div>
                <div className="flex flex-col gap-5 min-[990px]:gap-6">
                  <div className="grid grid-cols-1 gap-2 min-[520px]:grid-cols-2 min-[520px]:gap-3">
                    <Pill
                      selected={aircraft === 'boeing-737'}
                      className="w-full py-3"
                      onClick={() => {
                        setAircraft('boeing-737')
                      }}
                    >
                      Boeing 737NG
                    </Pill>
                    <Pill
                      selected={aircraft === 'mi-2'}
                      className="w-full py-3"
                      onClick={() => {
                        setAircraft('mi-2')
                        setDurationMin((d) => clampDurationForSimulator('mi-2', d))
                      }}
                    >
                      Ми-2
                    </Pill>
                  </div>

                  <div>
                    <p className="mb-2 text-center text-[14px] font-semibold text-[#002D62] min-[990px]:text-[15px]">
                      Выберите продолжительность полета
                    </p>
                    <div
                      className={[
                        'grid gap-2 min-[640px]:gap-3',
                        durationsForSimulator(aircraft).length <= 2
                          ? 'grid-cols-2'
                          : 'grid-cols-2 min-[640px]:grid-cols-4',
                      ].join(' ')}
                    >
                      {durationsForSimulator(aircraft).map((d) => (
                        <Pill
                          key={d}
                          selected={durationMin === d}
                          onClick={() => setDurationMin(d)}
                          className="!normal-case !tracking-normal"
                        >
                          {d} минут
                        </Pill>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 min-[700px]:grid-cols-2 min-[700px]:items-start min-[700px]:gap-6">
                    <div className="flex min-w-0 flex-col gap-3">
                      <SwitchRow
                        label="Есть подарочный сертификат"
                        checked={hasGiftCert}
                        onChange={(v) => {
                          setHasGiftCert(v)
                          if (v) {
                            setBirthdayDiscount(false)
                            setHappyHoursOnly(false)
                            setDateTimeOpen(false)
                            setBirthdayPickerOpen(false)
                          } else {
                            setCertValid(null)
                            setCertInfo(null)
                          }
                        }}
                      />
                      <SwitchRow
                        label="Хочу скидку в день рождения"
                        checked={birthdayDiscount}
                        onChange={(v) => {
                          setBirthdayDiscount(v)
                          if (v) {
                            setHasGiftCert(false)
                            setCertValid(null)
                            setCertInfo(null)
                            setHappyHoursOnly(false)
                            setDateTimeOpen(false)
                          } else {
                            setBirthdayPickerOpen(false)
                          }
                        }}
                      />
                    </div>

                    <div className="flex min-w-0 flex-col">
                      <SwitchReveal open={!hasGiftCert && !birthdayDiscount}>
                        <span className={labelClass()}>Дата и время бронирования</span>
                        <button
                          type="button"
                          onClick={() => {
                            setBirthdayPickerOpen(false)
                            setDateTimeOpen(true)
                          }}
                          className={calendarFieldShellClass(submitted && fieldErrors.dateTime)}
                          tabIndex={!hasGiftCert && !birthdayDiscount ? undefined : -1}
                        >
                          <span
                            className={[
                              'text-[14px] font-medium min-[990px]:text-[15px]',
                              dateTimeLabel ? 'text-[#002D62]' : 'text-[#8b95a8]',
                            ].join(' ')}
                          >
                            {dateTimeLabel || 'Выберите дату и время'}
                          </span>
                          <CalendarFieldIcon />
                        </button>
                        <SwitchReveal open={happyHoursOnly}>
                          <PromoTip>
                            <p className="mb-0">
                              Счастливые часы: доступны только будни и слоты с 12:00 до 15:00 — другие
                              даты и время выбрать нельзя.
                            </p>
                          </PromoTip>
                        </SwitchReveal>
                      </SwitchReveal>

                      <SwitchReveal open={hasGiftCert}>
                        <span className={labelClass()}>Номер подарочного сертификата</span>
                        <input
                          className={inputClass(submitted && fieldErrors.giftCert)}
                          placeholder="Введите номер вашего сертификата"
                          value={giftCertNumber}
                          onChange={(e) =>
                            setGiftCertNumber(sanitizeCertificateNumberInput(e.target.value))
                          }
                          inputMode="text"
                          autoComplete="off"
                          spellCheck={false}
                          tabIndex={hasGiftCert ? undefined : -1}
                        />
                        <PromoTip>
                          <p className="mb-0">
                            Дата полёта выбирается только после проверки сертификата и только в
                            пределах срока его действия — свободный выбор даты недоступен.
                          </p>
                          {giftCertNumber.trim() ? (
                            <p
                              className={`mb-0 mt-2 text-sm font-medium ${
                                certValid
                                  ? 'text-green-700'
                                  : certValid === false
                                    ? 'text-red-600'
                                    : 'text-[#5a6578]'
                              }`}
                            >
                              {certValid === null
                                ? 'Проверяем сертификат…'
                                : certValid && certInfo
                                  ? `Сертификат найден · ${certInfo.validFrom} — ${certInfo.validTo}`
                                  : 'Сертификат не найден или недействителен'}
                            </p>
                          ) : null}
                        </PromoTip>
                        <SwitchReveal open={Boolean(certValid && certInfo)}>
                          <span className={labelClass()}>Дата и время бронирования</span>
                          <button
                            type="button"
                            onClick={() => {
                              setBirthdayPickerOpen(false)
                              setDateTimeOpen(true)
                            }}
                            className={calendarFieldShellClass(submitted && fieldErrors.dateTime)}
                            tabIndex={certValid && certInfo ? undefined : -1}
                          >
                            <span
                              className={[
                                'text-[14px] font-medium min-[990px]:text-[15px]',
                                dateTimeLabel ? 'text-[#002D62]' : 'text-[#8b95a8]',
                              ].join(' ')}
                            >
                              {dateTimeLabel || 'Выберите дату и время'}
                            </span>
                            <CalendarFieldIcon />
                          </button>
                        </SwitchReveal>
                      </SwitchReveal>

                      <SwitchReveal open={birthdayDiscount}>
                        <span className={labelClass()}>Дата дня рождения</span>
                        <button
                          type="button"
                          onClick={openBirthdayPicker}
                          className={calendarFieldShellClass(submitted && fieldErrors.birthday)}
                          tabIndex={birthdayDiscount ? undefined : -1}
                        >
                          <span
                            className={[
                              'text-[14px] font-medium min-[990px]:text-[15px]',
                              birthdayDate ? 'text-[#002D62]' : 'text-[#8b95a8]',
                            ].join(' ')}
                          >
                            {birthdayDate || 'Выберите дату дня рождения'}
                          </span>
                          <CalendarFieldIcon />
                        </button>
                        <PromoTip>
                          <p className="mb-0">
                            Сначала укажите день рождения. Дату полёта можно выбрать только в окне
                            ±3 дня от этой даты — поэтому обычный выбор даты скрыт. Нужен документ.
                          </p>
                        </PromoTip>
                        <SwitchReveal open={isBirthdayInputValid(birthdayDate)}>
                          <span className={labelClass()}>Дата и время бронирования</span>
                          <button
                            type="button"
                            onClick={() => {
                              setBirthdayPickerOpen(false)
                              setDateTimeOpen(true)
                            }}
                            className={calendarFieldShellClass(submitted && fieldErrors.dateTime)}
                            tabIndex={isBirthdayInputValid(birthdayDate) ? undefined : -1}
                          >
                            <span
                              className={[
                                'text-[14px] font-medium min-[990px]:text-[15px]',
                                dateTimeLabel ? 'text-[#002D62]' : 'text-[#8b95a8]',
                              ].join(' ')}
                            >
                              {dateTimeLabel || 'Выберите дату и время'}
                            </span>
                            <CalendarFieldIcon />
                          </button>
                        </SwitchReveal>
                      </SwitchReveal>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 min-[700px]:grid-cols-2 min-[700px]:gap-6">
                    <div className="min-w-0">
                      <label className={labelClass()} htmlFor="booking-name">
                        Имя
                      </label>
                      <input
                        id="booking-name"
                        className={inputClass(submitted && fieldErrors.name)}
                        value={name}
                        onChange={(e) => setName(sanitizePersonNameInput(e.target.value))}
                        placeholder="Иван"
                        autoComplete="given-name"
                        inputMode="text"
                      />
                    </div>

                    <div className="min-w-0">
                      <label className={labelClass()} htmlFor="booking-phone">
                        Телефон
                      </label>
                      <input
                        id="booking-phone"
                        type="tel"
                        className={inputClass(submitted && fieldErrors.phone)}
                        value={phone}
                        onChange={(e) => setPhone(sanitizePhoneInput(e.target.value))}
                        placeholder="+375 29 123-45-67"
                        autoComplete="tel"
                        inputMode="tel"
                      />
                    </div>
                  </div>

                  <div>
                    <label className={labelClass()} htmlFor="booking-note">
                      Примечание
                    </label>
                    {happyHoursOnly ? (
                      <div
                        className={[
                          'flex w-full flex-wrap items-center gap-2 rounded-lg border border-[#d1d5db] bg-[#f0f1f3] px-3 py-2.5',
                          'min-[990px]:px-4 min-[990px]:py-3',
                        ].join(' ')}
                      >
                        <span
                          className="inline-flex shrink-0 select-none items-center rounded-md bg-[#e8f2ff] px-2 py-1 text-[13px] font-semibold text-[#0075FF] min-[990px]:text-[14px]"
                          title="Метка акции — нельзя удалить"
                        >
                          {HAPPY_HOURS_NOTE_TAG}
                        </span>
                        <input
                          id="booking-note"
                          className="min-w-0 flex-1 border-0 bg-transparent p-0 text-[14px] font-medium text-[#002D62] outline-none placeholder:text-[#8b95a8] min-[990px]:text-[15px]"
                          placeholder="Есть какая то просьба?"
                          value={note}
                          onChange={(e) => setNote(sanitizeNoteInput(e.target.value))}
                          maxLength={500 - HAPPY_HOURS_NOTE_TAG.length - 2}
                        />
                      </div>
                    ) : (
                      <input
                        id="booking-note"
                        className={inputClass()}
                        placeholder="Есть какая то просьба?"
                        value={note}
                        onChange={(e) => setNote(sanitizeNoteInput(e.target.value))}
                        maxLength={500}
                      />
                    )}
                  </div>

                  <div className="grid grid-cols-1 gap-4 min-[700px]:grid-cols-2 min-[700px]:gap-6">
                    <div className="min-w-0">
                      <label className={labelClass()} htmlFor="booking-email">
                        Email для подтверждения
                      </label>
                      <input
                        id="booking-email"
                        type="email"
                        className={inputClass(submitted && fieldErrors.email)}
                        value={email}
                        onChange={(e) => setEmail(sanitizeEmailInput(e.target.value))}
                        placeholder="для кода подтверждения"
                        autoComplete="email"
                        inputMode="email"
                        spellCheck={false}
                      />
                    </div>

                    <div className="min-w-0">
                      <span className={labelClass()}>Оплата</span>
                      <select
                        className={inputClass() + ' cursor-pointer'}
                        value={payment}
                        onChange={(e) => setPayment(e.target.value as 'now' | 'visit')}
                      >
                        <option value="visit">При посещении</option>
                        <option value="now">Сейчас на сайте</option>
                      </select>
                    </div>
                  </div>

                  {/* Способ подтверждения — временно скрыт
                  <div className="min-w-0">
                    <label className={labelClass()} htmlFor="booking-confirm">
                      Способ подтверждения
                    </label>
                    <select ... />
                  </div>
                  */}

                  <p className="text-[16px] font-bold text-[#002D62] min-[990px]:text-[17px]">
                    Стоимость: {priceByn} BYN
                  </p>

                  {bookingError ? (
                    <p className="text-sm font-medium text-red-600">{bookingError}</p>
                  ) : null}

                  <div className="flex flex-col gap-[10px]">
                    <button
                      type="button"
                      className="w-full rounded-xl bg-[linear-gradient(180deg,#4da3ff_0%,#0075ff_48%,#0050b3_100%)] py-3.5 text-[16px] font-semibold text-white shadow-[0_8px_24px_rgba(0,117,255,0.35)] transition-opacity hover:opacity-95 min-[990px]:py-4 min-[990px]:text-[17px]"
                      onClick={() => {
                        setSubmitted(true)
                        setBookingError('')
                        if (
                          fieldErrors.name ||
                          fieldErrors.phone ||
                          fieldErrors.email ||
                          fieldErrors.giftCert ||
                          fieldErrors.birthday ||
                          fieldErrors.consent ||
                          fieldErrors.dateTime ||
                          !selectedDate ||
                          !selectedTime
                        ) {
                          setBookingError('Заполните все обязательные поля корректно')
                          return
                        }
                        void (async () => {
                          try {
                            const result = await apiFetch<{ bookingId: string }>(
                              '/api/public/bookings',
                              {
                                method: 'POST',
                                body: JSON.stringify({
                                  date: format(selectedDate, 'yyyy-MM-dd'),
                                  startTime: selectedTime,
                                  durationMin,
                                  simulatorSlug: aircraft,
                                  name,
                                  phone,
                                  email,
                                  paymentMethod: payment === 'now' ? 'ONLINE' : 'OFFLINE',
                                  comment: composeBookingComment(note, happyHoursOnly),
                                  isBirthdayPromo: birthdayDiscount,
                                  isHappyHoursPromo: happyHoursOnly,
                                  birthdayDate: birthdayDate || undefined,
                                  certificateNumber: hasGiftCert ? giftCertNumber : undefined,
                                }),
                              },
                            )
                            setBookingId(result.bookingId)
                            setOtpDigits(OTP_EMPTY())
                            setWizardStep('otp')
                            setResendSec(60)
                          } catch {
                            setBookingError('Не удалось создать бронь. Проверьте данные.')
                          }
                        })()
                      }}
                    >
                      {payment === 'now' ? 'Забронировать и оплатить' : 'Забронировать полет'}
                    </button>

                    <label
                      className={[
                        'flex cursor-pointer gap-3 text-left text-[13px] font-medium leading-snug min-[990px]:text-[14px]',
                        submitted && fieldErrors.consent ? 'text-red-600' : 'text-[#5a6578]',
                      ].join(' ')}
                    >
                      <input
                        type="checkbox"
                        checked={consent}
                        onChange={(e) => setConsent(e.target.checked)}
                        className={[
                          'mt-0.5 h-4 w-4 shrink-0 rounded text-[#0075FF] focus:ring-[#0075FF]',
                          submitted && fieldErrors.consent
                            ? 'border-red-500'
                            : 'border-[#002D62]',
                        ].join(' ')}
                      />
                      <span>
                        Настоящим подтверждаю согласие с{' '}
                        <a href="#" className="text-[#0075FF] underline">
                          Правилами по обработке персональных данных
                        </a>{' '}
                        и{' '}
                        <a href="#" className="text-[#0075FF] underline">
                          Офертой
                        </a>
                        .
                      </span>
                    </label>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col">
                <button
                  type="button"
                  onClick={() => setDateTimeOpen(false)}
                  className="mb-3 self-start text-[14px] font-semibold text-[#0075FF] underline-offset-2 hover:underline min-[990px]:text-[15px]"
                >
                  ← Назад к форме
                </button>
                <div className="grid grid-cols-1 gap-5 md:grid-cols-2 md:gap-6">
                  <div className="min-w-0 md:border-r md:border-[#e5e7eb] md:pr-6">
                    <DayPicker
                      mode="single"
                      selected={selectedDate ?? undefined}
                      defaultMonth={selectedDate ?? startOfToday()}
                      onSelect={(d) => {
                        setSelectedDate(d ?? null)
                        if (!d) setSelectedTime(null)
                      }}
                      locale={ruRdp}
                      disabled={(date) =>
                        isBookingDateDisabled(date, calendarMap, dateDisableOpts)
                      }
                      showOutsideDays={false}
                      className="booking-rdp w-full max-w-none [--rdp-accent-color:#0075FF] [--rdp-background-color:#fff]"
                      classNames={dayPickerClassNames}
                    />
                  </div>
                  <div className="min-w-0 md:pl-0">
                    <p className="mb-2 text-[13px] font-semibold text-[#002D62] md:sr-only">Время</p>
                    <div className="grid grid-cols-2 gap-2 min-[400px]:grid-cols-3 sm:grid-cols-3 md:grid-cols-2 md:pl-2 lg:grid-cols-3">
                      {(happyHoursOnly
                        ? BOOKING_TIME_SLOTS.filter((t) => isHappyHourTime(t))
                        : BOOKING_TIME_SLOTS
                      ).map((t) => {
                        const past = selectedDate ? isTimeSlotPast(selectedDate, t) : false
                        return (
                          <button
                            key={t}
                            type="button"
                            disabled={past || !selectedDate}
                            onClick={() => setSelectedTime(t)}
                            className={[
                              'min-w-0 rounded-full border px-2 py-2.5 text-center text-[13px] font-semibold transition-colors min-[400px]:px-3 min-[400px]:text-[14px] min-[990px]:py-2.5',
                              past || !selectedDate
                                ? 'cursor-not-allowed border-[#e5e7eb] bg-[#f3f4f6] text-[#9ca3af]'
                                : selectedTime === t
                                  ? 'border-[#0075FF] bg-[#e8f2ff] text-[#0075FF]'
                                  : 'border-[#d1d5db] bg-white text-[#002D62] hover:border-[#0075FF]/45',
                            ].join(' ')}
                          >
                            {t}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                </div>

                <div className="mt-4 border-t border-dotted border-[#0075FF] pt-4 min-[990px]:mt-5 min-[990px]:pt-5">
                  <div className="flex flex-col gap-3 min-[990px]:flex-row min-[990px]:items-center min-[990px]:justify-between">
                    <p
                      className={[
                        'text-[14px] font-semibold min-[990px]:text-[15px]',
                        selectedDate && selectedTime ? 'text-[#002D62]' : 'text-[#8b95a8]',
                      ].join(' ')}
                    >
                      {selectedDate && selectedTime
                        ? formatFooterSummary(selectedDate, selectedTime)
                        : 'Выберите дату и время'}
                    </p>
                    <button
                      type="button"
                      onClick={confirmDateTime}
                      disabled={!selectedDate || !selectedTime}
                      className="w-full rounded-xl bg-[linear-gradient(180deg,#4da3ff_0%,#0075ff_48%,#0050b3_100%)] px-8 py-2.5 text-[15px] font-semibold text-white shadow-[0_6px_20px_rgba(0,117,255,0.35)] disabled:cursor-not-allowed disabled:opacity-50 min-[990px]:w-auto min-[990px]:py-3"
                    >
                      Продолжить
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

export default BookingModal
