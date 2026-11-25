import { format, isValid, parseISO } from 'date-fns'

/** Единый вид дат в уведомлениях/логах: День.Месяц.Год */
const DISPLAY_DATE = 'dd.MM.yyyy'

export function formatDisplayDate(value: string | Date | null | undefined): string {
  if (value == null || value === '') return '—'
  if (value instanceof Date) {
    return isValid(value) ? format(value, DISPLAY_DATE) : '—'
  }
  const raw = String(value).trim()
  if (/^\d{2}\.\d{2}\.\d{4}$/.test(raw)) return raw
  // Старый вид с тире → точки
  if (/^\d{2}-\d{2}-\d{4}$/.test(raw)) {
    return raw.replace(/-/g, '.')
  }
  const iso = raw.length >= 10 ? raw.slice(0, 10) : raw
  try {
    const d = parseISO(iso)
    return isValid(d) ? format(d, DISPLAY_DATE) : raw
  } catch {
    return raw
  }
}

/** В тексте (body уведомлений и т.п.) заменить yyyy-MM-dd → dd.MM.yyyy. */
export function rewriteIsoDatesInText(text: string): string {
  return String(text ?? '').replace(
    /\b(\d{4})-(\d{2})-(\d{2})\b/g,
    (_m, y: string, m: string, d: string) => `${d}.${m}.${y}`,
  )
}
