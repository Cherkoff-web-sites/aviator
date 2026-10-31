import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'

import { apiFetch } from '../lib/api'
import {
  sanitizeNoteInput,
  sanitizePersonNameInput,
  sanitizePhoneInput,
} from '../lib/fieldInput'
import { isPersonNameValid, isPhoneValid } from '../lib/pricing'

function PhoneIcon({ className = 'h-7 w-7' }: { className?: string }) {
  return (
    <svg
      className={className}
      width="12"
      height="12"
      viewBox="0 0 12 12"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        d="M8.82757 11.9983C7.9621 11.9664 5.50936 11.6275 2.94062 9.05993C0.372475 6.49171 0.0341028 4.04007 0.00164798 3.17418C-0.0464333 1.85462 0.964476 0.572918 2.13225 0.072374C2.27287 0.0116639 2.42687 -0.0114502 2.57912 0.00529963C2.73138 0.0220495 2.87666 0.0780879 3.00072 0.167916C3.96234 0.868557 4.62586 1.92853 5.19563 2.76197C5.32099 2.94508 5.37459 3.1679 5.34622 3.38798C5.31784 3.60806 5.20948 3.81 5.04177 3.95534L3.86919 4.82604C3.81254 4.86694 3.77266 4.927 3.75696 4.99508C3.74127 5.06316 3.75082 5.13462 3.78384 5.19619C4.04949 5.6787 4.52189 6.39737 5.0628 6.93818C5.60372 7.47898 6.35679 7.98253 6.87306 8.27817C6.93779 8.3145 7.01399 8.32465 7.08598 8.30655C7.15797 8.28844 7.22028 8.24345 7.26012 8.18082L8.02341 7.0193C8.16374 6.83293 8.37075 6.70808 8.60109 6.67089C8.83143 6.6337 9.06723 6.68706 9.2591 6.8198C10.1047 7.40507 11.0916 8.05704 11.814 8.98181C11.9112 9.10674 11.9729 9.25546 11.9929 9.41244C12.0129 9.56941 11.9904 9.72886 11.9276 9.87414C11.4246 11.0477 10.1516 12.047 8.82757 11.9983Z"
        fillRule="evenodd"
        clipRule="evenodd"
        fill="#fff"
      />
    </svg>
  )
}

function fieldClass(invalid = false) {
  return [
    'w-full rounded-lg border bg-[#f0f1f3] px-3 py-2.5 text-[14px] font-medium text-[#002D62]',
    'placeholder:text-[#8b95a8] outline-none focus:ring-1',
    invalid
      ? 'border-red-500 focus:border-red-500 focus:ring-red-500/30'
      : 'border-[#d1d5db] focus:border-[#0075FF] focus:ring-[#0075FF]/30',
  ].join(' ')
}

/**
 * Фиксированная кнопка обратной связи справа внизу + форма заявки / перезвона.
 */
export default function FeedbackWidget() {
  const { pathname } = useLocation()
  const isAdmin = pathname.startsWith('/admin')
  const titleId = useId()
  const panelRef = useRef<HTMLDivElement>(null)

  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [message, setMessage] = useState('')
  const [consent, setConsent] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const nameInvalid = submitted && !isPersonNameValid(name)
  const phoneInvalid = submitted && !isPhoneValid(phone)
  const consentInvalid = submitted && !consent

  const resetForm = useCallback(() => {
    setName('')
    setPhone('')
    setMessage('')
    setConsent(false)
    setSubmitted(false)
    setError('')
    setSuccess(false)
    setSending(false)
  }, [])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  useEffect(() => {
    if (!open) return
    const onPointer = (e: MouseEvent | TouchEvent) => {
      const t = e.target as Node | null
      if (!t) return
      if (panelRef.current?.contains(t)) return
      const fab = document.getElementById('feedback-fab')
      if (fab?.contains(t)) return
      setOpen(false)
    }
    window.addEventListener('mousedown', onPointer)
    window.addEventListener('touchstart', onPointer)
    return () => {
      window.removeEventListener('mousedown', onPointer)
      window.removeEventListener('touchstart', onPointer)
    }
  }, [open])

  useEffect(() => {
    if (isAdmin) setOpen(false)
  }, [isAdmin])

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitted(true)
    setError('')
    if (!isPersonNameValid(name) || !isPhoneValid(phone) || !consent) return

    setSending(true)
    try {
      await apiFetch('/api/public/feedback', {
        method: 'POST',
        body: JSON.stringify({
          name: name.trim(),
          phone,
          message: message.trim(),
        }),
      })
      setSuccess(true)
      window.setTimeout(() => {
        setOpen(false)
        resetForm()
      }, 1800)
    } catch {
      setError('Не удалось отправить заявку. Попробуйте позже или позвоните нам.')
    } finally {
      setSending(false)
    }
  }

  if (isAdmin) return null

  return (
    <div className="pointer-events-none fixed bottom-5 right-5 z-[190] flex flex-col items-end gap-3 min-[480px]:bottom-6 min-[480px]:right-6">
      {open ? (
        <div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          className="pointer-events-auto w-[min(calc(100vw-2.5rem),340px)] origin-bottom-right rounded-2xl bg-white p-4 shadow-[0_20px_60px_rgba(0,45,98,0.28)] min-[480px]:p-5"
        >
          {success ? (
            <div className="py-6 text-center">
              <p className="text-[17px] font-bold text-[#002D62]">Заявка отправлена</p>
              <p className="mt-2 text-[14px] font-medium text-[#5a6578]">
                Мы свяжемся с вами в ближайшее время.
              </p>
            </div>
          ) : (
            <form onSubmit={(e) => void onSubmit(e)} className="flex flex-col gap-3.5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h2 id={titleId} className="text-[17px] font-bold leading-tight text-[#002D62]">
                    Обратная связь
                  </h2>
                  <p className="mt-1 text-[13px] font-medium leading-snug text-[#5a6578]">
                    Заполните форму и мы Вам перезвоним!
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[#002D62] hover:bg-[#f0f1f3]"
                  aria-label="Закрыть"
                >
                  <span className="text-xl leading-none" aria-hidden>
                    ×
                  </span>
                </button>
              </div>

              <div>
                <label className="mb-1 block text-[13px] font-semibold text-[#002D62]" htmlFor="fb-name">
                  Имя
                </label>
                <input
                  id="fb-name"
                  className={fieldClass(nameInvalid)}
                  value={name}
                  onChange={(e) => setName(sanitizePersonNameInput(e.target.value))}
                  placeholder="Иван"
                  autoComplete="given-name"
                />
              </div>

              <div>
                <label className="mb-1 block text-[13px] font-semibold text-[#002D62]" htmlFor="fb-phone">
                  Телефон
                </label>
                <input
                  id="fb-phone"
                  type="tel"
                  className={fieldClass(phoneInvalid)}
                  value={phone}
                  onChange={(e) => setPhone(sanitizePhoneInput(e.target.value))}
                  placeholder="+375 29 123-45-67"
                  autoComplete="tel"
                  inputMode="tel"
                />
              </div>

              <div>
                <label className="mb-1 block text-[13px] font-semibold text-[#002D62]" htmlFor="fb-msg">
                  Сообщение
                </label>
                <textarea
                  id="fb-msg"
                  className={`${fieldClass()} min-h-[88px] resize-y`}
                  value={message}
                  onChange={(e) => setMessage(sanitizeNoteInput(e.target.value))}
                  placeholder="Ваш вопрос или пожелание (необязательно)"
                  maxLength={500}
                />
              </div>

              {error ? <p className="text-sm font-medium text-red-600">{error}</p> : null}

              <button
                type="submit"
                disabled={sending}
                className="w-full rounded-xl bg-[linear-gradient(180deg,#4da3ff_0%,#0075ff_48%,#0050b3_100%)] py-3 text-[15px] font-semibold text-white shadow-[0_8px_20px_rgba(0,117,255,0.3)] disabled:opacity-60"
              >
                {sending ? 'Отправка…' : 'Отправить'}
              </button>

              <label
                className={[
                  'flex cursor-pointer gap-2.5 text-left text-[12px] font-medium leading-snug',
                  consentInvalid ? 'text-red-600' : 'text-[#5a6578]',
                ].join(' ')}
              >
                <input
                  type="checkbox"
                  checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
                  className={[
                    'mt-0.5 h-4 w-4 shrink-0 rounded text-[#0075FF] focus:ring-[#0075FF]',
                    consentInvalid ? 'border-red-500' : 'border-[#002D62]',
                  ].join(' ')}
                />
                <span>
                  Согласен с{' '}
                  <a href="/faq" className="text-[#0075FF] underline underline-offset-2">
                    обработкой персональных данных
                  </a>
                </span>
              </label>
            </form>
          )}
        </div>
      ) : null}

      <button
        id="feedback-fab"
        type="button"
        aria-expanded={open}
        aria-controls={open ? titleId : undefined}
        aria-label={open ? 'Закрыть обратную связь' : 'Открыть обратную связь'}
        onClick={() => {
          setOpen((v) => {
            if (v) return false
            setSuccess(false)
            setError('')
            setSubmitted(false)
            return true
          })
        }}
        className={[
          'pointer-events-auto inline-flex h-14 w-14 items-center justify-center rounded-full text-white',
          'bg-[linear-gradient(180deg,#4da3ff_0%,#0075ff_48%,#0050b3_100%)]',
          'shadow-[0_12px_32px_rgba(0,117,255,0.45)] transition-transform hover:scale-[1.04] active:scale-[0.98]',
          'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0075FF]',
        ].join(' ')}
      >
        <PhoneIcon />
      </button>
    </div>
  )
}
