import { format, isValid, parse, parseISO } from 'date-fns'

/** Единый формат дат на всём сайте: День.Месяц.Год */
export const SITE_DATE = 'dd.MM.yyyy'
export const SITE_DATETIME = 'dd.MM.yyyy HH:mm'

/** @deprecated alias — тот же SITE_DATE */
const ADMIN_DATE = SITE_DATE
const ADMIN_DATETIME = SITE_DATETIME

export function formatAdminDate(value: string | Date | null | undefined): string {
  if (value == null || value === '') return '—'
  if (value instanceof Date) {
    return isValid(value) ? format(value, ADMIN_DATE) : '—'
  }
  const raw = String(value).trim()
  // Уже ДД.ММ.ГГГГ
  if (/^\d{2}\.\d{2}\.\d{4}$/.test(raw)) return raw
  // Короткий ДД.ММ.ГГ → нормализуем в полный год
  if (/^\d{2}\.\d{2}\.\d{2}$/.test(raw)) {
    const [dd, mm, yy] = raw.split('.')
    const yyyy = Number(yy) >= 70 ? `19${yy}` : `20${yy}`
    return `${dd}.${mm}.${yyyy}`
  }
  // ДД-ММ-ГГГГ / ДД-ММ-ГГ (старый вид) → точки
  if (/^\d{2}-\d{2}-\d{2,4}$/.test(raw)) {
    const [dd, mm, yPart] = raw.split('-')
    const yyyy =
      yPart.length === 4 ? yPart : Number(yPart) >= 70 ? `19${yPart}` : `20${yPart}`
    return `${dd}.${mm}.${yyyy}`
  }
  const iso = raw.length >= 10 ? raw.slice(0, 10) : raw
  try {
    const d = parseISO(iso)
    return isValid(d) ? format(d, ADMIN_DATE) : raw
  } catch {
    return raw
  }
}

export function formatAdminDateTime(value: string | Date | null | undefined): string {
  if (value == null || value === '') return '—'
  if (value instanceof Date) {
    return isValid(value) ? format(value, ADMIN_DATETIME) : '—'
  }
  try {
    const d = parseISO(String(value))
    return isValid(d) ? format(d, ADMIN_DATETIME) : String(value)
  } catch {
    return String(value)
  }
}

/**
 * ISO `yyyy-MM-dd` → отображение `дд.мм.гггг` для поля ввода.
 * Пустое → ''.
 */
export function isoToSiteDateDisplay(iso: string | null | undefined): string {
  if (!iso?.trim()) return ''
  const formatted = formatAdminDate(iso)
  return formatted === '—' ? '' : formatted
}

/**
 * Ввод пользователя (`дд.мм.гггг` / `дд-мм-гггг` / ISO) → `yyyy-MM-dd` или ''.
 */
export function parseSiteDateToIso(input: string): string {
  const raw = input.trim()
  if (!raw) return ''

  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    const d = parseISO(raw)
    return isValid(d) ? raw : ''
  }

  const dotted = raw.replace(/\//g, '.')
  if (/^\d{1,2}\.\d{1,2}\.\d{2,4}$/.test(dotted)) {
    const [dd, mm, yPart] = dotted.split('.')
    const yyyy =
      yPart.length === 4 ? yPart : Number(yPart) >= 70 ? `19${yPart}` : `20${yPart}`
    const d = parse(
      `${dd.padStart(2, '0')}.${mm.padStart(2, '0')}.${yyyy}`,
      SITE_DATE,
      new Date(),
    )
    return isValid(d) ? format(d, 'yyyy-MM-dd') : ''
  }

  const dashed = raw.replace(/\./g, '-')
  if (/^\d{1,2}-\d{1,2}-\d{2,4}$/.test(dashed)) {
    const [dd, mm, yPart] = dashed.split('-')
    const yyyy =
      yPart.length === 4 ? yPart : Number(yPart) >= 70 ? `19${yPart}` : `20${yPart}`
    const d = parse(
      `${dd.padStart(2, '0')}.${mm.padStart(2, '0')}.${yyyy}`,
      SITE_DATE,
      new Date(),
    )
    return isValid(d) ? format(d, 'yyyy-MM-dd') : ''
  }

  return ''
}

/** В произвольном тексте заменить yyyy-MM-dd → dd.MM.yyyy. */
export function rewriteIsoDatesInText(text: string): string {
  return String(text ?? '').replace(
    /\b(\d{4})-(\d{2})-(\d{2})\b/g,
    (_m, y: string, m: string, d: string) => `${d}.${m}.${y}`,
  )
}
