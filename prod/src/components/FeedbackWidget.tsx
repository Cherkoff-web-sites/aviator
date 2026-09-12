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
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M8.5 3.75h2.2c.6 0 1.1.4 1.25 1l.55 2.2a1.3 1.3 0 01-.35 1.2l-1.15 1.15a12.5 12.5 0 005.55 5.55l1.15-1.15a1.3 1.3 0 011.2-.35l2.2.55c.6.15 1 .65 1 1.25v2.2c0 .7-.55 1.3-1.25 1.3C10.9 20.7 3.3 13.1 3.45 4.99c0-.7.6-1.24 1.3-1.24z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
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
                    Оставьте отзыв или номер для перезвона
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
