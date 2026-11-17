import { format, isValid, parseISO } from 'date-fns'

/** Единый формат дат в админке: ДД.ММ.ГГГГ */
export function formatAdminDate(value: string | Date | null | undefined): string {
  if (value == null || value === '') return '—'
  if (value instanceof Date) {
    return isValid(value) ? format(value, 'dd.MM.yyyy') : '—'
  }
  const raw = String(value).trim()
  if (/^\d{2}\.\d{2}\.\d{4}/.test(raw)) return raw.slice(0, 10)
  const iso = raw.length >= 10 ? raw.slice(0, 10) : raw
  try {
    const d = parseISO(iso)
    return isValid(d) ? format(d, 'dd.MM.yyyy') : raw
  } catch {
    return raw
  }
}

export function formatAdminDateTime(value: string | Date | null | undefined): string {
  if (value == null || value === '') return '—'
  if (value instanceof Date) {
    return isValid(value) ? format(value, 'dd.MM.yyyy HH:mm') : '—'
  }
  try {
    const d = parseISO(String(value))
    return isValid(d) ? format(d, 'dd.MM.yyyy HH:mm') : String(value)
  } catch {
    return String(value)
  }
}
