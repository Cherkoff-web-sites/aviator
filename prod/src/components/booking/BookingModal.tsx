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
  computeBookingPriceByn,
  getBaseFlightPrice,
  isBookingDateDisabled,
  type CalendarStatus,
} from '../../lib/pricing'
import { BOOKING_TIME_SLOTS, type BookingTimeSlot } from './bookingTimeSlots'

const DURATIONS = [30, 60, 90, 120] as const

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

function inputClass() {
  return [
    'w-full rounded-lg border border-[#d1d5db] bg-[#f0f1f3] px-3 py-2.5 text-[14px] font-medium text-[#002D62]',
    'placeholder:text-[#8b95a8] outline-none focus:border-[#0075FF] focus:ring-1 focus:ring-[#0075FF]/30',
    'min-[990px]:px-4 min-[990px]:py-3 min-[990px]:text-[15px]',
  ].join(' ')
}

function labelClass() {
  return 'mb-1.5 block text-[13px] font-semibold text-[#002D62] min-[990px]:text-[14px]'
}

function applyOpenPayload(
  payload: BookingOpenPayload | null,
): {
  aircraft: 'boeing-737' | 'mi-2'
  durationMin: (typeof DURATIONS)[number]
  pageSlug: BookingSimulatorSlug | null
} {
  const pageSlug = payload?.simulatorSlug ?? null
  const durationRaw = payload?.durationMin
  const durationMin =
    durationRaw === 30 || durationRaw === 60 || durationRaw === 90 || durationRaw === 120 ? durationRaw : 30
  const aircraft = defaultAircraftFromSlug(pageSlug)
  return { aircraft, durationMin, pageSlug }
}

type WizardStep = 'form' | 'otp' | 'success'

const OTP_EMPTY = () => ['', '', '', '', '', '']

function BookingModal() {
  const { isOpen, closeBooking, payload } = useBookingModal()
  const [dateTimeOpen, setDateTimeOpen] = useState(false)
  const [wizardStep, setWizardStep] = useState<WizardStep>('form')
  const [otpDigits, setOtpDigits] = useState<string[]>(() => OTP_EMPTY())
  const [resendSec, setResendSec] = useState(60)
  const [bookingId, setBookingId] = useState<string | null>(null)
  const [phone, setPhone] = useState('+375 (12) 1234567')
  const [email, setEmail] = useState('')
  const [bookingError, setBookingError] = useState('')
  const otpRefs = useRef<(HTMLInputElement | null)[]>([])

  const [giftCertificateOrder, setGiftCertificateOrder] = useState(false)
  const [aircraft, setAircraft] = useState<'boeing-737' | 'mi-2'>('boeing-737')
  const [durationMin, setDurationMin] = useState<(typeof DURATIONS)[number]>(30)
  const [hasGiftCert, setHasGiftCert] = useState(true)
  const [giftCertNumber, setGiftCertNumber] = useState('')
  const [birthdayDiscount, setBirthdayDiscount] = useState(true)
  const [birthdayDate, setBirthdayDate] = useState('')
  const [selectedDate, setSelectedDate] = useState<Date>(() => startOfToday())
  const [selectedTime, setSelectedTime] = useState<BookingTimeSlot>('12:00')
  const [name, setName] = useState('Иван')
  const [confirmMethod, setConfirmMethod] = useState('')
  const [note, setNote] = useState('')
  const [payment, setPayment] = useState<'now' | 'visit'>('visit')
  const [consent, setConsent] = useState(false)
  const [flightPrices, setFlightPrices] = useState<ApiPriceRow[]>([])
  const [calendarMap, setCalendarMap] = useState<Record<string, CalendarStatus>>({})
  const [bookingWindowMonths, setBookingWindowMonths] = useState(3)
  const [certValid, setCertValid] = useState<boolean | null>(null)

  useEffect(() => {
    if (!isOpen) {
      setDateTimeOpen(false)
      setWizardStep('form')
      setOtpDigits(OTP_EMPTY())
      setResendSec(60)
      setBookingId(null)
      setBookingError('')
      return
    }
    const { aircraft: ac, durationMin: d } = applyOpenPayload(payload)
    setAircraft(ac)
    setDurationMin(d)
    setGiftCertificateOrder(false)
    setHasGiftCert(false)
    setGiftCertNumber('')
    setBirthdayDiscount(false)
    setBirthdayDate('')
    setCertValid(null)
    setSelectedDate(startOfToday())
    setSelectedTime('12:00')
    setName('Иван')
    setConfirmMethod('')
    setNote('')
    setPayment('visit')
    setConsent(false)
    setWizardStep('form')
    setDateTimeOpen(false)
    setOtpDigits(OTP_EMPTY())
    setResendSec(60)
  }, [isOpen, payload])

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
      return
    }
    const timer = window.setTimeout(() => {
      void apiFetch<{ valid: boolean }>(
        `/api/public/certificates/validate?number=${encodeURIComponent(giftCertNumber.trim())}`,
      )
        .then((r) => setCertValid(r.valid))
        .catch(() => setCertValid(false))
    }, 350)
    return () => window.clearTimeout(timer)
  }, [hasGiftCert, giftCertNumber])

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

  const dateTimeLabel = useMemo(
    () => formatSlotDisplay(selectedDate, selectedTime),
    [selectedDate, selectedTime],
  )

  const onDialogOpenChange = useCallback(
    (open: boolean) => {
      if (!open) closeBooking()
    },
    [closeBooking],
  )

  const confirmDateTime = useCallback(() => {
    setDateTimeOpen(false)
  }, [])

  return (
    <Dialog.Root open={isOpen} onOpenChange={onDialogOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[100] bg-black/45" />
        <Dialog.Content
          className="fixed left-1/2 top-1/2 z-[101] flex max-h-[min(92dvh,900px)] w-[min(calc(100vw-20px),960px)] max-w-[960px] -translate-x-1/2 -translate-y-1/2 flex-col rounded-2xl bg-white p-4 shadow-[0_24px_80px_rgba(0,45,98,0.22)] focus:outline-none min-[480px]:p-5 min-[990px]:rounded-[24px] min-[990px]:p-8"
          onOpenAutoFocus={(e) => {
            if (wizardStep === 'form' && dateTimeOpen) e.preventDefault()
          }}
        >
          <div className="relative flex min-h-0 flex-1 flex-col">
            <div className="mb-4 flex shrink-0 items-start justify-between gap-3">
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
                        const v = e.target.value.replace(/\D/g, '').slice(-1)
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
            ) : !dateTimeOpen ? (
              <div className="min-h-0 flex-1 overflow-y-auto pr-1">
                <div className="flex flex-col gap-5 min-[990px]:gap-6">
                  <div className="grid grid-cols-1 gap-2 min-[520px]:grid-cols-3 min-[520px]:gap-3">
                    <Pill
                      selected={giftCertificateOrder}
                      className="w-full py-3"
                      onClick={() => setGiftCertificateOrder(true)}
                    >
                      Подарочный сертификат
                    </Pill>
                    <Pill
                      selected={!giftCertificateOrder && aircraft === 'boeing-737'}
                      className="w-full py-3"
                      onClick={() => {
                        setGiftCertificateOrder(false)
                        setAircraft('boeing-737')
                      }}
                    >
                      Boeing 737NG
                    </Pill>
                    <Pill
                      selected={!giftCertificateOrder && aircraft === 'mi-2'}
                      className="w-full py-3"
                      onClick={() => {
                        setGiftCertificateOrder(false)
                        setAircraft('mi-2')
                      }}
                    >
                      Ми-2
                    </Pill>
                  </div>

                  <div>
                    <p className="mb-2 text-center text-[14px] font-semibold text-[#002D62] min-[990px]:text-[15px]">
                      Выберите продолжительность полета
                    </p>
                    <div className="grid grid-cols-2 gap-2 min-[640px]:grid-cols-4 min-[640px]:gap-3">
                      {DURATIONS.map((d) => (
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

                  <div className="flex flex-col gap-4">
                    <div className="grid grid-cols-1 gap-4 min-[640px]:grid-cols-2 min-[640px]:gap-6 min-[640px]:items-start">
                      <div className="flex min-w-0 flex-col gap-2">
                        <SwitchRow
                          label="Есть подарочный сертификат"
                          checked={hasGiftCert}
                          onChange={setHasGiftCert}
                        />
                        {hasGiftCert ? (
                          <input
                            className={inputClass()}
                            placeholder="Введите номер вашего сертификата"
                            value={giftCertNumber}
                            onChange={(e) => setGiftCertNumber(e.target.value)}
                          />
                        ) : null}
                      </div>
                      <div className="flex min-w-0 flex-col gap-2">
                        <SwitchRow
                          label="Хочу скидку в день рождения"
                          checked={birthdayDiscount}
                          onChange={setBirthdayDiscount}
                        />
                        {birthdayDiscount ? (
                          <input
                            className={inputClass()}
                            placeholder="Введите дату вашего дня рождения 12.02"
                            value={birthdayDate}
                            onChange={(e) => setBirthdayDate(e.target.value)}
                          />
                        ) : null}
                      </div>
                    </div>
                    {hasGiftCert || birthdayDiscount ? (
                      <div className="rounded-lg bg-[#eceef2] px-3 py-2.5 text-[13px] font-medium leading-relaxed text-[#5a6578] min-[990px]:px-4 min-[990px]:py-3 min-[990px]:text-[14px]">
                        {birthdayDiscount ? (
                          <p className="mb-0">
                            Скидка в день рождения действует ±3 дня от даты; необходим документ.
                          </p>
                        ) : null}
                        {hasGiftCert ? (
                          <>
                            <p className={birthdayDiscount ? 'mb-0 mt-2' : 'mb-0'}>
                              Номер проверяется автоматически при оформлении.
                            </p>
                            {giftCertNumber.trim() ? (
                              <p
                                className={`mb-0 mt-2 text-sm font-medium ${
                                  certValid ? 'text-green-700' : certValid === false ? 'text-red-600' : 'text-[#5a6578]'
                                }`}
                              >
                                {certValid === null
                                  ? 'Проверяем сертификат…'
                                  : certValid
                                    ? 'Сертификат найден'
                                    : 'Сертификат не найден или недействителен'}
                              </p>
                            ) : null}
                          </>
                        ) : null}
                      </div>
                    ) : null}
                  </div>

                  <div>
                    <span className={labelClass()}>Дата и время бронирования</span>
                    <button
                      type="button"
                      onClick={() => setDateTimeOpen(true)}
                      className="flex w-full items-center justify-between gap-2 rounded-lg border border-[#d1d5db] bg-[#f0f1f3] px-3 py-2.5 text-left min-[990px]:px-4 min-[990px]:py-3"
                    >
                      <span className="text-[14px] font-medium text-[#002D62] min-[990px]:text-[15px]">
                        {dateTimeLabel}
                      </span>
                      <svg
                        className="h-5 w-5 shrink-0 text-[#002D62]"
                        viewBox="0 0 24 24"
                        fill="none"
                        aria-hidden
                      >
                        <rect x="3" y="5" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="1.75" />
                        <path d="M3 10h18M8 3v4M16 3v4" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
                      </svg>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 gap-4 min-[700px]:grid-cols-2 min-[700px]:gap-6">
                    <div className="min-w-0">
                      <label className={labelClass()} htmlFor="booking-name">
                        Имя
                      </label>
                      <input
                        id="booking-name"
                        className={inputClass()}
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                      />
                    </div>

                    <div className="min-w-0">
                      <label className={labelClass()} htmlFor="booking-phone">
                        Телефон
                      </label>
                      <input
                        id="booking-phone"
                        className={inputClass()}
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                      />
                    </div>

                    <div className="min-w-0">
                      <label className={labelClass()} htmlFor="booking-email">
                        Email
                      </label>
                      <input
                        id="booking-email"
                        type="email"
                        className={inputClass()}
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="для кода подтверждения"
                      />
                    </div>

                    <div className="min-w-0">
                      <label className={labelClass()} htmlFor="booking-confirm">
                        Способ подтверждения
                      </label>
                      <select
                        id="booking-confirm"
                        className={inputClass() + ' cursor-pointer appearance-none bg-[#f0f1f3]'}
                        value={confirmMethod}
                        onChange={(e) => setConfirmMethod(e.target.value)}
                      >
                        <option value="">Выберите способ подтверждения</option>
                        <option value="phone">Телефон</option>
                        <option value="whatsapp">WhatsApp</option>
                        <option value="telegram">Telegram</option>
                        <option value="email">Электронная почта</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className={labelClass()} htmlFor="booking-note">
                      Примечание
                    </label>
                    <textarea
                      id="booking-note"
                      rows={3}
                      className={inputClass() + ' resize-none'}
                      placeholder="Есть какая то просьба?"
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                    />
                  </div>

                  <div>
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

                  <p className="text-[16px] font-bold text-[#002D62] min-[990px]:text-[17px]">
                    Стоимость: {priceByn} BYN
                  </p>

                  <label className="flex cursor-pointer gap-3 text-left text-[13px] font-medium leading-snug text-[#5a6578] min-[990px]:text-[14px]">
                    <input
                      type="checkbox"
                      checked={consent}
                      onChange={(e) => setConsent(e.target.checked)}
                      className="mt-0.5 h-4 w-4 shrink-0 rounded border-[#002D62] text-[#0075FF] focus:ring-[#0075FF]"
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

                  {bookingError ? (
                    <p className="text-sm font-medium text-red-600">{bookingError}</p>
                  ) : null}

                  <button
                    type="button"
                    disabled={!consent || !email.trim() || (hasGiftCert && !!giftCertNumber.trim() && certValid === false) || (birthdayDiscount && !birthdayDate.trim())}
                    className="mt-1 w-full rounded-xl bg-[linear-gradient(180deg,#4da3ff_0%,#0075ff_48%,#0050b3_100%)] py-3.5 text-[16px] font-semibold text-white shadow-[0_8px_24px_rgba(0,117,255,0.35)] transition-opacity disabled:cursor-not-allowed disabled:opacity-40 min-[990px]:py-4 min-[990px]:text-[17px]"
                    onClick={() => {
                      setBookingError('')
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
                                comment: note,
                                isBirthdayPromo: birthdayDiscount,
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
                </div>
              </div>
            ) : (
              <div className="flex min-h-0 flex-1 flex-col">
                <button
                  type="button"
                  onClick={() => setDateTimeOpen(false)}
                  className="mb-3 self-start text-[14px] font-semibold text-[#0075FF] underline-offset-2 hover:underline min-[990px]:text-[15px]"
                >
                  ← Назад к форме
                </button>
                <div className="grid min-h-0 flex-1 grid-cols-1 gap-5 md:grid-cols-2 md:gap-6">
                  <div className="min-h-0 min-w-0 md:border-r md:border-[#e5e7eb] md:pr-6">
                    <DayPicker
                      mode="single"
                      required
                      selected={selectedDate}
                      onSelect={(d) => {
                        if (d) setSelectedDate(d)
                      }}
                      locale={ruRdp}
                      disabled={(date) =>
                        isBookingDateDisabled(date, calendarMap, {
                          birthdayDiscount,
                          birthdayDate,
                          bookingWindowMonths,
                        })
                      }
                      showOutsideDays={false}
                      className="booking-rdp w-full max-w-none [--rdp-accent-color:#0075FF] [--rdp-background-color:#fff]"
                      classNames={{
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
                      }}
                    />
                  </div>
                  <div className="min-h-0 min-w-0 md:pl-0">
                    <p className="mb-2 text-[13px] font-semibold text-[#002D62] md:sr-only">Время</p>
                    <div className="grid max-h-[min(40dvh,320px)] grid-cols-2 gap-2 overflow-y-auto overscroll-contain min-[400px]:grid-cols-3 sm:max-h-none sm:grid-cols-3 md:max-h-[min(52dvh,400px)] md:grid-cols-2 md:pl-2 lg:grid-cols-3">
                      {BOOKING_TIME_SLOTS.map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setSelectedTime(t)}
                          className={[
                            'min-w-0 rounded-full border px-2 py-2.5 text-center text-[13px] font-semibold transition-colors min-[400px]:px-3 min-[400px]:text-[14px] min-[990px]:py-2.5',
                            selectedTime === t
                              ? 'border-[#0075FF] bg-[#e8f2ff] text-[#0075FF]'
                              : 'border-[#d1d5db] bg-white text-[#002D62] hover:border-[#0075FF]/45',
                          ].join(' ')}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="mt-4 border-t border-dotted border-[#0075FF] pt-4 min-[990px]:mt-5 min-[990px]:pt-5">
                  <div className="flex flex-col gap-3 min-[990px]:flex-row min-[990px]:items-center min-[990px]:justify-between">
                    <p className="text-[14px] font-semibold text-[#002D62] min-[990px]:text-[15px]">
                      {formatFooterSummary(selectedDate, selectedTime)}
                    </p>
                    <button
                      type="button"
                      onClick={confirmDateTime}
                      className="w-full rounded-xl bg-[linear-gradient(180deg,#4da3ff_0%,#0075ff_48%,#0050b3_100%)] px-8 py-2.5 text-[15px] font-semibold text-white shadow-[0_6px_20px_rgba(0,117,255,0.35)] min-[990px]:w-auto min-[990px]:py-3"
                    >
                      Продолжить
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

export default BookingModal
