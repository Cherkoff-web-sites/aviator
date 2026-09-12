/** Санитизация и проверка ввода полей форм бронирования / сертификата. */

const NAME_INVALID = /[^A-Za-zА-Яа-яЁёІіЎўʼ'’\-\s]/
const EMAIL_INVALID = /[^A-Za-z0-9.@_+%-]/
const CERT_INVALID = /[^A-Za-zА-Яа-яЁё0-9№#\-]/

export function sanitizePersonNameInput(value: string): string {
  return value.replace(/[^A-Za-zА-Яа-яЁёІіЎўʼ'’\-\s]/g, '').replace(/\s{2,}/g, ' ').slice(0, 60)
}

export function sanitizePhoneInput(value: string): string {
  // Разрешаем +, цифры и обычные разделители; буквы и прочее отбрасываем.
  // Не навязываем код страны и жёсткую маску.
  let out = ''
  let plusUsed = false
  let digitCount = 0

  for (const ch of value) {
    if (ch === '+') {
      if (!plusUsed && out.length === 0) {
        out += '+'
        plusUsed = true
      }
      continue
    }
    if (/\d/.test(ch)) {
      if (digitCount >= 15) continue
      out += ch
      digitCount += 1
      continue
    }
    if (ch === ' ' || ch === '-' || ch === '(' || ch === ')') {
      if (out.length === 0 || out === '+') continue
      const last = out[out.length - 1]!
      if (last === ' ' || last === '-' || last === '(' || last === '+') continue
      if (ch === ')' && !out.includes('(')) continue
      out += ch
    }
  }

  return out.slice(0, 22)
}

export function sanitizeEmailInput(value: string): string {
  return value.replace(/\s/g, '').replace(/[^A-Za-z0-9.@_+%-]/g, '').slice(0, 120)
}

export function sanitizeCertificateNumberInput(value: string): string {
  return value.replace(/[^A-Za-zА-Яа-яЁё0-9№#\-]/g, '').replace(/\s+/g, '').slice(0, 32)
}

export function sanitizeNoteInput(value: string): string {
  return value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').slice(0, 500)
}

export function sanitizeOtpDigitInput(value: string): string {
  return value.replace(/\D/g, '').slice(-1)
}

/** Имя/фамилия: только буквы (и дефис/апостроф), минимум 2 буквы. */
export function isPersonNameInputValid(name: string): boolean {
  const t = name.trim()
  if (t.length < 2 || t.length > 60) return false
  if (NAME_INVALID.test(t)) return false
  const letters = t.replace(/[^A-Za-zА-Яа-яЁёІіЎў]/g, '')
  return letters.length >= 2
}

/** Телефон: 9–15 цифр, любой код страны. */
export function isPhoneInputValid(phone: string): boolean {
  const digits = phone.replace(/\D/g, '')
  return digits.length >= 9 && digits.length <= 15
}

export function isEmailInputValid(email: string): boolean {
  const t = email.trim()
  if (!t || t.length > 120) return false
  if (EMAIL_INVALID.test(t)) return false
  return /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(t)
}

export function isCertificateNumberInputValid(value: string): boolean {
  const t = value.trim()
  return t.length >= 4 && t.length <= 32 && !CERT_INVALID.test(t)
}

