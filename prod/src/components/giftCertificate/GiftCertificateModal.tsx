import * as Dialog from '@radix-ui/react-dialog'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { getCertPriceByn, isEmailValid, isPersonNameValid, isPhoneValid } from '../../lib/pricing'
import type { GiftCertProductChoice } from '../booking/bookingPricing'
import { apiFetch, type ApiPriceRow } from '../../lib/api'
import { useBookingModal } from '../../contexts/BookingModalContext'
import { useGiftCertificateModal } from '../../contexts/GiftCertificateModalContext'
import {
  clearGiftDraft,
  loadGiftDraft,
  saveGiftDraft,
} from '../../lib/modalDrafts'
import {
  sanitizeEmailInput,
  sanitizeNoteInput,
  sanitizePersonNameInput,
  sanitizePhoneInput,
} from '../../lib/fieldInput'
import {
  clampDurationForSimulator,
  durationsForSimulator,
  type FlightDurationMin,
} from '../../lib/flight-durations'

/** Те же pill, что в BookingModal */
function Pill({
  selected,
  children,
  className = '',
  onClick,
}: {
  selected: boolean
  children: React.ReactNode
  className?: string
  onClick?: () => void
}) {
  return (
    <button
      type="button"
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

const PRIMARY_BTN =
  'w-full rounded-xl bg-[linear-gradient(180deg,#4da3ff_0%,#0075ff_48%,#0050b3_100%)] py-3.5 text-[16px] font-semibold text-white shadow-[0_8px_24px_rgba(0,117,255,0.35)] transition-opacity hover:opacity-95 min-[990px]:py-4 min-[990px]:text-[17px]'

type Step = 'form' | 'success'

function GiftCertificateModal() {
  const { isOpen, payload, closeGiftCertificate } = useGiftCertificateModal()
  const { openBooking } = useBookingModal()
  const draftRef = useRef(loadGiftDraft())
  const draft = draftRef.current
  const scrollRef = useRef<HTMLDivElement>(null)

  const [step, setStep] = useState<Step>('form')
  const [product, setProduct] = useState<GiftCertProductChoice>(
    () => draft?.product ?? 'boeing-737',
  )
  const [durationMin, setDurationMin] = useState<FlightDurationMin>(
    () => draft?.durationMin ?? 30,
  )
  const [firstName, setFirstName] = useState(() =>
    sanitizePersonNameInput(draft?.firstName ?? ''),
  )
  const [lastName, setLastName] = useState(() => sanitizePersonNameInput(draft?.lastName ?? ''))
  const [phone, setPhone] = useState(() => sanitizePhoneInput(draft?.phone ?? ''))
  const [email, setEmail] = useState(() => sanitizeEmailInput(draft?.email ?? ''))
  const [note, setNote] = useState(() => sanitizeNoteInput(draft?.note ?? ''))
  const [consent, setConsent] = useState(() => draft?.consent ?? false)
  const [submitted, setSubmitted] = useState(false)
  const [certNumber, setCertNumber] = useState<string | null>(null)
  const [submitError, setSubmitError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const [certPrices, setCertPrices] = useState<ApiPriceRow[]>([])

  const resetDraftFields = useCallback(() => {
    setStep('form')
    setProduct('boeing-737')
    setDurationMin(30)
    setFirstName('')
    setLastName('')
    setPhone('')
    setEmail('')
    setNote('')
    setConsent(false)
    setSubmitted(false)
    setCertNumber(null)
    setSubmitError('')
    setSubmitting(false)
    clearGiftDraft()
  }, [])

  useEffect(() => {
    if (!isOpen) return
    void apiFetch<ApiPriceRow[]>('/api/public/prices/certificates').then(setCertPrices)
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return
    if (payload?.product != null) {
      setProduct(payload.product)
    }
  }, [isOpen, payload])

  useEffect(() => {
    if (!isOpen) return
    scrollRef.current?.scrollTo({ top: 0 })
  }, [isOpen, step])

  useEffect(() => {
    saveGiftDraft({
      product,
      durationMin,
      firstName,
      lastName,
      phone,
      email,
      note,
      consent,
    })
  }, [product, durationMin, firstName, lastName, phone, email, note, consent])

  const priceByn = useMemo(
    () => getCertPriceByn(certPrices, product, durationMin),
    [certPrices, durationMin, product],
  )

  const fieldErrors = useMemo(
    () => ({
      firstName: !isPersonNameValid(firstName),
      lastName: !isPersonNameValid(lastName),
      phone: !isPhoneValid(phone),
      email: !isEmailValid(email),
      consent: !consent,
    }),
    [firstName, lastName, phone, email, consent],
  )

  const durationOptions =
    product === 'both'
      ? ([60] as const)
      : product === 'mi-2'
        ? durationsForSimulator('mi-2')
        : durationsForSimulator('boeing-737')

  useEffect(() => {
    if (product === 'both') {
      setDurationMin(60)
      return
    }
    setDurationMin((d) =>
      clampDurationForSimulator(product === 'mi-2' ? 'mi-2' : 'boeing-737', d),
    )
  }, [product])

  const onOpenChange = useCallback(
    (open: boolean) => {
      if (!open) {
        if (step === 'success') {
          resetDraftFields()
        }
        closeGiftCertificate()
      }
    },
    [closeGiftCertificate, resetDraftFields, step],
  )

  return (
    <Dialog.Root open={isOpen} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[100] bg-black/45" />
        {/*
          Та же схема скролла, что у BookingModal:
          Content на весь экран + центрированная белая карточка.
        */}
        <Dialog.Content
          ref={scrollRef}
          className="fixed inset-0 z-[101] overflow-y-auto overscroll-contain bg-transparent p-0 shadow-none outline-none focus:outline-none"
          onPointerDownOutside={(e) => e.preventDefault()}
          onInteractOutside={(e) => e.preventDefault()}
        >
          <div
            className="flex min-h-full justify-center px-[10px] py-6 min-[480px]:py-8 min-[990px]:py-10"
            onPointerDown={(e) => {
              if (e.target === e.currentTarget) onOpenChange(false)
            }}
          >
            <div
              className="relative my-auto w-[min(calc(100vw-20px),960px)] max-w-[960px] rounded-2xl bg-white p-4 shadow-[0_24px_80px_rgba(0,45,98,0.22)] min-[480px]:p-5 min-[990px]:rounded-[24px] min-[990px]:p-8"
              onPointerDown={(e) => e.stopPropagation()}
            >
              <div className="relative">
                <div className="mb-4 flex items-start justify-between gap-3">
                  {step === 'form' ? (
                    <div className="flex flex-1 flex-col items-center gap-1 pr-10">
                      <Dialog.Title className="text-center text-[20px] font-bold leading-tight text-[#002D62] min-[990px]:text-[22px]">
                        Покупка подарочного сертификата
                      </Dialog.Title>
                      <button
                        type="button"
                        className="text-[13px] font-semibold text-[#0075FF] underline-offset-2 hover:underline"
                        onClick={() => {
                          closeGiftCertificate()
                          openBooking({
                            simulatorSlug:
                              product === 'mi-2'
                                ? 'mi-2'
                                : product === 'both'
                                  ? undefined
                                  : 'boeing-737',
                          })
                        }}
                      >
                        Хочу забронировать полёт →
                      </button>
                    </div>
                  ) : (
                    <Dialog.Title className="sr-only">Сертификат оформлен</Dialog.Title>
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

                {step === 'success' ? (
                  <div className="flex flex-col items-center justify-center px-2 py-10 text-center min-[990px]:py-14">
                    <p className="text-[22px] font-bold leading-tight text-[#002D62] min-[990px]:text-[26px]">
                      Спасибо за покупку!
                    </p>
                    <p className="mt-3 max-w-[340px] text-[15px] font-medium leading-relaxed text-[#5a6578] min-[990px]:mt-4 min-[990px]:text-[16px]">
                      {certNumber
                        ? `Сертификат ${certNumber} оформлен. PDF отправим на ${email || 'указанный email'}.`
                        : 'Мы будем рады видеть вас!'}
                    </p>
                    <a
                      href="#"
                      className="mt-8 text-[15px] font-semibold text-[#0075FF] underline decoration-[#0075FF] underline-offset-2 min-[990px]:mt-10 min-[990px]:text-[16px]"
                      onClick={(e) => e.preventDefault()}
                    >
                      Скачать сертификат в PDF
                    </a>
                  </div>
                ) : (
                  <div className="flex flex-col gap-5 min-[990px]:gap-6">
                    <div className="grid grid-cols-1 gap-2 min-[520px]:grid-cols-3 min-[520px]:gap-3">
                      <Pill
                        selected={product === 'boeing-737'}
                        className="w-full"
                        onClick={() => setProduct('boeing-737')}
                      >
                        Boeing 737NG
                      </Pill>
                      <Pill
                        selected={product === 'mi-2'}
                        className="w-full"
                        onClick={() => setProduct('mi-2')}
                      >
                        Ми-2
                      </Pill>
                      <Pill
                        selected={product === 'both'}
                        className="w-full"
                        onClick={() => setProduct('both')}
                      >
                        Boeing 737NG + Ми-2
                      </Pill>
                    </div>

                    <div>
                      <p className="mb-2 text-center text-[14px] font-semibold text-[#002D62] min-[990px]:text-[15px]">
                        Выберите продолжительность полета
                      </p>
                      <div className="grid grid-cols-2 gap-2 min-[640px]:grid-cols-4 min-[640px]:gap-3">
                        {durationOptions.map((d) => (
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

                    <div className="grid grid-cols-1 gap-4 min-[700px]:grid-cols-2 min-[700px]:gap-6">
                      <div className="min-w-0">
                        <label className={labelClass()} htmlFor="gc-first">
                          Имя обладателя сертификата
                        </label>
                        <input
                          id="gc-first"
                          className={inputClass(submitted && fieldErrors.firstName)}
                          value={firstName}
                          onChange={(e) => setFirstName(sanitizePersonNameInput(e.target.value))}
                          autoComplete="given-name"
                        />
                      </div>

                      <div className="min-w-0">
                        <label className={labelClass()} htmlFor="gc-last">
                          Фамилия обладателя сертификата
                        </label>
                        <input
                          id="gc-last"
                          className={inputClass(submitted && fieldErrors.lastName)}
                          value={lastName}
                          onChange={(e) => setLastName(sanitizePersonNameInput(e.target.value))}
                          autoComplete="family-name"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4 min-[700px]:grid-cols-2 min-[700px]:gap-6">
                      <div className="min-w-0">
                        <label className={labelClass()} htmlFor="gc-phone">
                          Контактный номер телефона
                        </label>
                        <input
                          id="gc-phone"
                          type="tel"
                          className={inputClass(submitted && fieldErrors.phone)}
                          placeholder="+375 29 123-45-67"
                          value={phone}
                          onChange={(e) => setPhone(sanitizePhoneInput(e.target.value))}
                          autoComplete="tel"
                          inputMode="tel"
                        />
                      </div>

                      <div className="min-w-0">
                        <label className={labelClass()} htmlFor="gc-email">
                          Email для получения сертификата
                        </label>
                        <input
                          id="gc-email"
                          type="email"
                          className={inputClass(submitted && fieldErrors.email)}
                          placeholder="name@example.com"
                          value={email}
                          onChange={(e) => setEmail(sanitizeEmailInput(e.target.value))}
                          autoComplete="email"
                          inputMode="email"
                          spellCheck={false}
                        />
                      </div>
                    </div>

                    <div>
                      <label className={labelClass()} htmlFor="gc-note">
                        Примечания
                      </label>
                      <input
                        id="gc-note"
                        className={inputClass()}
                        placeholder="Есть какая то просьба?"
                        value={note}
                        onChange={(e) => setNote(sanitizeNoteInput(e.target.value))}
                        maxLength={500}
                      />
                    </div>

                    <p className="text-[16px] font-bold text-[#002D62] min-[990px]:text-[17px]">
                      Стоимость: {priceByn} BYN
                    </p>

                    {submitError ? (
                      <p className="text-sm font-medium text-red-600">{submitError}</p>
                    ) : null}

                    <div className="flex flex-col gap-[10px]">
                      <button
                        type="button"
                        className={PRIMARY_BTN}
                        disabled={submitting}
                        onClick={() => {
                          setSubmitted(true)
                          setSubmitError('')
                          if (
                            fieldErrors.firstName ||
                            fieldErrors.lastName ||
                            fieldErrors.phone ||
                            fieldErrors.email ||
                            fieldErrors.consent
                          ) {
                            setSubmitError('Заполните все обязательные поля корректно')
                            return
                          }
                          void (async () => {
                            setSubmitting(true)
                            try {
                              const slug =
                                product === 'both'
                                  ? 'combo'
                                  : product === 'mi-2'
                                    ? 'mi-2'
                                    : 'boeing-737'
                              const cert = await apiFetch<{ number: string }>(
                                '/api/public/certificates',
                                {
                                  method: 'POST',
                                  body: JSON.stringify({
                                    firstName,
                                    lastName,
                                    phone,
                                    email,
                                    durationMin,
                                    simulatorSlug: slug,
                                    comment: note,
                                  }),
                                },
                              )
                              setCertNumber(cert.number)
                              setStep('success')
                            } catch (err) {
                              const msg =
                                err instanceof Error && err.message.trim()
                                  ? err.message
                                  : 'Не удалось оформить сертификат. Проверьте поля формы и попробуйте снова.'
                              setSubmitError(msg)
                            } finally {
                              setSubmitting(false)
                            }
                          })()
                        }}
                      >
                        {submitting ? 'Оформление…' : 'Оплатить сертификат'}
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
                          <a
                            href="/documents/privacy"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[#0075FF] underline"
                          >
                            Правилами по обработке персональных данных
                          </a>{' '}
                          и{' '}
                          <a
                            href="/documents/agreement"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[#0075FF] underline"
                          >
                            Офертой
                          </a>
                          .
                        </span>
                      </label>
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

export default GiftCertificateModal
