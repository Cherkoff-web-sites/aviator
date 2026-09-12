import * as Dialog from '@radix-ui/react-dialog'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { getCertPriceByn, isPersonNameValid, isPhoneValid } from '../../lib/pricing'
import type { GiftCertProductChoice } from '../booking/bookingPricing'
import { apiFetch, type ApiPriceRow } from '../../lib/api'
import { useGiftCertificateModal } from '../../contexts/GiftCertificateModalContext'
import {
  clearGiftDraft,
  loadGiftDraft,
  saveGiftDraft,
} from '../../lib/modalDrafts'
import {
  sanitizeNoteInput,
  sanitizePersonNameInput,
  sanitizePhoneInput,
} from '../../lib/fieldInput'
import {
  clampDurationForSimulator,
  durationsForSimulator,
  type FlightDurationMin,
} from '../../lib/flight-durations'

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
        'rounded-full border-2 px-4 py-2.5 text-center text-[13px] font-semibold uppercase tracking-wide transition-colors min-[990px]:px-5 min-[990px]:py-3 min-[990px]:text-[14px]',
        selected
          ? 'border-[#1D56BE] bg-white text-[#1D56BE]'
          : 'border-[#d1d5db] bg-[#f3f4f8] text-[#002D62] hover:border-[#1D56BE]/35',
        className,
      ].join(' ')}
    >
      {children}
    </button>
  )
}

function fieldClass(invalid = false) {
  return [
    'w-full rounded-lg border bg-[#eef0f6] px-3 py-2.5 text-[14px] font-medium text-[#002D62]',
    'placeholder:text-[#8b95a8] outline-none focus:ring-1',
    'min-[990px]:px-4 min-[990px]:py-3 min-[990px]:text-[15px]',
    invalid
      ? 'border-red-500 focus:border-red-500 focus:ring-red-500/30'
      : 'border-[#d1d5db] focus:border-[#1D56BE] focus:ring-[#1D56BE]/25',
  ].join(' ')
}

function labelClass() {
  return 'mb-1.5 block text-[13px] font-semibold text-[#002D62] min-[990px]:text-[14px]'
}

type Step = 'form' | 'success'

function GiftCertificateModal() {
  const { isOpen, payload, closeGiftCertificate } = useGiftCertificateModal()
  const draftRef = useRef(loadGiftDraft())
  const draft = draftRef.current

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
  const [note, setNote] = useState(() => sanitizeNoteInput(draft?.note ?? ''))
  const [consent, setConsent] = useState(() => draft?.consent ?? false)
  const [submitted, setSubmitted] = useState(false)
  const [certNumber, setCertNumber] = useState<string | null>(null)
  const [submitError, setSubmitError] = useState('')

  const [certPrices, setCertPrices] = useState<ApiPriceRow[]>([])

  const resetDraftFields = useCallback(() => {
    setStep('form')
    setProduct('boeing-737')
    setDurationMin(30)
    setFirstName('')
    setLastName('')
    setPhone('')
    setNote('')
    setConsent(false)
    setSubmitted(false)
    setCertNumber(null)
    setSubmitError('')
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
    saveGiftDraft({
      product,
      durationMin,
      firstName,
      lastName,
      phone,
      note,
      consent,
    })
  }, [product, durationMin, firstName, lastName, phone, note, consent])

  const priceByn = useMemo(
    () => getCertPriceByn(certPrices, product, durationMin),
    [certPrices, durationMin, product],
  )

  const fieldErrors = useMemo(
    () => ({
      firstName: !isPersonNameValid(firstName),
      lastName: !isPersonNameValid(lastName),
      phone: !isPhoneValid(phone),
      consent: !consent,
    }),
    [firstName, lastName, phone, consent],
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
        <Dialog.Overlay className="fixed inset-0 z-[100] bg-black/45 backdrop-blur-[2px]" />
        <Dialog.Content
          className="fixed left-1/2 top-1/2 z-[101] flex max-h-[min(92dvh,900px)] w-[min(calc(100vw-32px),920px)] max-w-[920px] -translate-x-1/2 -translate-y-1/2 flex-col rounded-2xl bg-white p-5 shadow-[0_24px_80px_rgba(0,45,98,0.22)] focus:outline-none min-[990px]:rounded-[24px] min-[990px]:p-8"
        >
          <div className="relative flex min-h-0 flex-1 flex-col">
            <div className="mb-4 flex shrink-0 items-start justify-between gap-3">
              {step === 'form' ? (
                <Dialog.Title className="flex-1 pr-10 text-center text-[19px] font-bold leading-tight text-[#002D62] min-[990px]:text-[21px]">
                  Покупка подарочного сертификата
                </Dialog.Title>
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
              <div className="flex flex-col items-center justify-center px-2 py-8 text-center min-[990px]:py-12">
                <p className="text-[22px] font-bold leading-tight text-[#002D62] min-[990px]:text-[26px]">
                  Спасибо за покупку !
                </p>
                <p className="mt-3 max-w-[340px] text-[15px] font-medium leading-relaxed text-[#5a6578] min-[990px]:mt-4 min-[990px]:text-[16px]">
                  {certNumber
                    ? `Сертификат ${certNumber} оформлен. Данные отправлены на указанный контакт.`
                    : 'Мы будем рады видеть вас!'}
                </p>
                <a
                  href="#"
                  className="mt-8 text-[15px] font-semibold text-[#002D62] underline decoration-[#002D62] underline-offset-2 min-[990px]:mt-10 min-[990px]:text-[16px]"
                  onClick={(e) => e.preventDefault()}
                >
                  Скачать сертификат в PDF
                </a>
              </div>
            ) : (
              <div className="min-h-0 flex-1 overflow-y-auto pr-1">
                <div className="flex flex-col gap-5 min-[990px]:gap-6">
                  <div className="grid grid-cols-1 gap-2 min-[520px]:grid-cols-3 min-[520px]:gap-3">
                    <Pill
                      selected={product === 'boeing-737'}
                      className="w-full py-3"
                      onClick={() => setProduct('boeing-737')}
                    >
                      Boeing 737NG
                    </Pill>
                    <Pill
                      selected={product === 'mi-2'}
                      className="w-full py-3"
                      onClick={() => setProduct('mi-2')}
                    >
                      Ми-2
                    </Pill>
                    <Pill
                      selected={product === 'both'}
                      className="w-full py-3"
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
                        className={fieldClass(submitted && fieldErrors.firstName)}
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
                        className={fieldClass(submitted && fieldErrors.lastName)}
                        value={lastName}
                        onChange={(e) => setLastName(sanitizePersonNameInput(e.target.value))}
                        autoComplete="family-name"
                      />
                    </div>
                  </div>

                  {/* Способ подтверждения — временно скрыт
                  <div>
                    <label className={labelClass()} htmlFor="gc-confirm">
                      Способ подтверждения
                    </label>
                    <select ... />
                  </div>
                  */}

                  <div>
                    <label className={labelClass()} htmlFor="gc-phone">
                      Контактный номер телефона
                    </label>
                    <input
                      id="gc-phone"
                      type="tel"
                      className={fieldClass(submitted && fieldErrors.phone)}
                      placeholder="+375 29 123-45-67"
                      value={phone}
                      onChange={(e) => setPhone(sanitizePhoneInput(e.target.value))}
                      autoComplete="tel"
                      inputMode="tel"
                    />
                  </div>

                  <div>
                    <label className={labelClass()} htmlFor="gc-note">
                      Примечания
                    </label>
                    <input
                      id="gc-note"
                      className={fieldClass()}
                      placeholder="Есть какая то просьба?"
                      value={note}
                      onChange={(e) => setNote(sanitizeNoteInput(e.target.value))}
                      maxLength={500}
                    />
                  </div>

                  <p className="text-[16px] font-bold text-[#002D62] min-[990px]:text-[17px]">
                    Стоимость: {priceByn} BYN
                  </p>

                  {submitError ? <p className="text-sm font-medium text-red-600">{submitError}</p> : null}

                  <div className="flex flex-col gap-[10px]">
                    <button
                      type="button"
                      className="w-full rounded-xl py-3.5 text-[16px] font-semibold text-white shadow-[0_8px_24px_rgba(29,86,190,0.35)] transition-opacity hover:opacity-95 min-[990px]:py-4 min-[990px]:text-[17px]"
                      style={{
                        background: 'linear-gradient(90deg, #3d7ad8 0%, #1D56BE 50%, #153d8a 100%)',
                      }}
                      onClick={() => {
                        setSubmitted(true)
                        setSubmitError('')
                        if (
                          fieldErrors.firstName ||
                          fieldErrors.lastName ||
                          fieldErrors.phone ||
                          fieldErrors.consent
                        ) {
                          setSubmitError('Заполните все обязательные поля корректно')
                          return
                        }
                        void (async () => {
                          try {
                            const slug =
                              product === 'both' ? 'combo' : product === 'mi-2' ? 'mi-2' : 'boeing-737'
                            const cert = await apiFetch<{ number: string }>('/api/public/certificates', {
                              method: 'POST',
                              body: JSON.stringify({
                                firstName,
                                lastName,
                                phone,
                                durationMin,
                                simulatorSlug: slug,
                                comment: note,
                              }),
                            })
                            setCertNumber(cert.number)
                            setStep('success')
                          } catch {
                            setSubmitError('Не удалось оформить сертификат. Проверьте данные.')
                          }
                        })()
                      }}
                    >
                      Оплатить сертификат
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
                          'mt-0.5 h-4 w-4 shrink-0 rounded text-[#1D56BE] focus:ring-[#1D56BE]',
                          submitted && fieldErrors.consent
                            ? 'border-red-500'
                            : 'border-[#002D62]',
                        ].join(' ')}
                      />
                      <span>
                        Настоящим подтверждаю согласие с{' '}
                        <a
                          href="#"
                          className="text-[#1D56BE] underline"
                          onClick={(e) => e.preventDefault()}
                        >
                          Правилами по обработке персональных данных
                        </a>{' '}
                        и{' '}
                        <a
                          href="#"
                          className="text-[#1D56BE] underline"
                          onClick={(e) => e.preventDefault()}
                        >
                          Офертой
                        </a>
                        .
                      </span>
                    </label>
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

export default GiftCertificateModal
