import * as Dialog from '@radix-ui/react-dialog'
import { useCallback, useEffect, useMemo, useState } from 'react'

import { getCertPriceByn } from '../../lib/pricing'
import type { GiftCertProductChoice } from '../booking/bookingPricing'
import { apiFetch, type ApiPriceRow } from '../../lib/api'
import { useGiftCertificateModal } from '../../contexts/GiftCertificateModalContext'

const DURATIONS = [30, 60, 90, 120] as const

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

function fieldClass() {
  return [
    'w-full rounded-lg border border-[#d1d5db] bg-[#eef0f6] px-3 py-2.5 text-[14px] font-medium text-[#002D62]',
    'placeholder:text-[#8b95a8] outline-none focus:border-[#1D56BE] focus:ring-1 focus:ring-[#1D56BE]/25',
    'min-[990px]:px-4 min-[990px]:py-3 min-[990px]:text-[15px]',
  ].join(' ')
}

function labelClass() {
  return 'mb-1.5 block text-[13px] font-semibold text-[#002D62] min-[990px]:text-[14px]'
}

type Step = 'form' | 'success'

function GiftCertificateModal() {
  const { isOpen, closeGiftCertificate } = useGiftCertificateModal()
  const [step, setStep] = useState<Step>('form')
  const [product, setProduct] = useState<GiftCertProductChoice>('boeing-737')
  const [durationMin, setDurationMin] = useState<(typeof DURATIONS)[number]>(30)
  const [firstName, setFirstName] = useState('Иван')
  const [lastName, setLastName] = useState('Иванов')
  const [confirmMethod, setConfirmMethod] = useState('')
  const [phone, setPhone] = useState('')
  const [note, setNote] = useState('')
  const [consent, setConsent] = useState(false)
  const [certNumber, setCertNumber] = useState<string | null>(null)
  const [submitError, setSubmitError] = useState('')

  const [certPrices, setCertPrices] = useState<ApiPriceRow[]>([])

  useEffect(() => {
    if (!isOpen) return
    void apiFetch<ApiPriceRow[]>('/api/public/prices/certificates').then(setCertPrices)
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return
    setStep('form')
    setProduct('boeing-737')
    setDurationMin(30)
    setFirstName('Иван')
    setLastName('Иванов')
    setConfirmMethod('')
    setPhone('')
    setNote('')
    setConsent(false)
    setCertNumber(null)
    setSubmitError('')
  }, [isOpen])

  const priceByn = useMemo(
    () => getCertPriceByn(certPrices, product, durationMin),
    [certPrices, durationMin, product],
  )

  const durationOptions = product === 'both' ? ([60] as const) : DURATIONS

  useEffect(() => {
    if (product === 'both') setDurationMin(60)
  }, [product])

  const onOpenChange = useCallback(
    (open: boolean) => {
      if (!open) closeGiftCertificate()
    },
    [closeGiftCertificate],
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
                        className={fieldClass()}
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                      />
                    </div>

                    <div className="min-w-0">
                      <label className={labelClass()} htmlFor="gc-last">
                        Фамилия обладателя сертификата
                      </label>
                      <input
                        id="gc-last"
                        className={fieldClass()}
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                      />
                    </div>
                  </div>

                  <div>
                    <label className={labelClass()} htmlFor="gc-confirm">
                      Способ подтверждения
                    </label>
                    <select
                      id="gc-confirm"
                      className={fieldClass() + ' cursor-pointer appearance-none bg-[#eef0f6]'}
                      value={confirmMethod}
                      onChange={(e) => setConfirmMethod(e.target.value)}
                    >
                      <option value="">Выберите способ связи</option>
                      <option value="phone">Телефон</option>
                      <option value="whatsapp">WhatsApp</option>
                      <option value="telegram">Telegram</option>
                      <option value="email">Электронная почта</option>
                    </select>
                    <p className="mt-1.5 text-[12px] font-medium leading-snug text-[#6b7289] min-[990px]:text-[13px]">
                      На указанный способ связи будет отправлен сертификат
                    </p>
                  </div>

                  <div>
                    <label className={labelClass()} htmlFor="gc-phone">
                      Контактный номер телефона
                    </label>
                    <input
                      id="gc-phone"
                      type="tel"
                      className={fieldClass()}
                      placeholder="+7 800 800 80 80"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className={labelClass()} htmlFor="gc-note">
                      Примечания
                    </label>
                    <textarea
                      id="gc-note"
                      rows={3}
                      className={fieldClass() + ' resize-none'}
                      placeholder="Есть какая то просьба?"
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                    />
                  </div>

                  <p className="text-[16px] font-bold text-[#002D62] min-[990px]:text-[17px]">
                    Стоимость: {priceByn} BYN
                  </p>

                  <label className="flex cursor-pointer gap-3 text-left text-[13px] font-medium leading-snug text-[#5a6578] min-[990px]:text-[14px]">
                    <input
                      type="checkbox"
                      checked={consent}
                      onChange={(e) => setConsent(e.target.checked)}
                      className="mt-0.5 h-4 w-4 shrink-0 rounded border-[#002D62] text-[#1D56BE] focus:ring-[#1D56BE]"
                    />
                    <span>
                      Настоящим подтверждаю согласие с{' '}
                      <a href="#" className="text-[#1D56BE] underline" onClick={(e) => e.preventDefault()}>
                        Правилами по обработке персональных данных
                      </a>{' '}
                      и{' '}
                      <a href="#" className="text-[#1D56BE] underline" onClick={(e) => e.preventDefault()}>
                        Офертой
                      </a>
                      .
                    </span>
                  </label>

                  {submitError ? <p className="text-sm font-medium text-red-600">{submitError}</p> : null}

                  <button
                    type="button"
                    disabled={!consent || !phone.trim()}
                    className="mt-1 w-full rounded-xl py-3.5 text-[16px] font-semibold text-white shadow-[0_8px_24px_rgba(29,86,190,0.35)] transition-opacity disabled:cursor-not-allowed disabled:opacity-40 min-[990px]:py-4 min-[990px]:text-[17px]"
                    style={{
                      background: 'linear-gradient(90deg, #3d7ad8 0%, #1D56BE 50%, #153d8a 100%)',
                    }}
                    onClick={() => {
                      setSubmitError('')
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
