/** Цвет/вид бланка сертификата — ключ из настроек. */
export type CertificateDesignColor = string

/** Макс. букв+цифр в полном номере (тире/прочие разделители не считаются). */
export const CERTIFICATE_NUMBER_MAX_LEN = 13

/** Длина только из A–Z / 0–9 (тире не входят в лимит 13). */
export function certificateAlnumLength(value: string): number {
  return String(value ?? '').replace(/[^A-Za-z0-9]/g, '').length
}

/**
 * Обрезает серию так, чтобы букв+цифр было ≤ maxAlnum (тире сохраняются).
 * По умолчанию оставляем запас минимум на 1 цифру номера.
 */
export function clipCertificateSeriesCode(
  raw: string,
  maxAlnum = CERTIFICATE_NUMBER_MAX_LEN - 1,
): string {
  const upper = String(raw ?? '')
    .toUpperCase()
    .replace(/^№\s*/, '')
  let alnum = 0
  let out = ''
  for (const ch of upper) {
    if (/[A-Z0-9]/.test(ch)) {
      if (alnum >= maxAlnum) continue
      alnum += 1
    }
    out += ch
  }
  return out
}

export type CertificateDesignRow = {
  id: string
  key: string
  label: string
  /** Серия в номере (EB-B737NG- …) */
  code: string
  simulatorSlug: string
  durationMin: number
  swatch: string
  rowBg: string
  sortOrder: number
  active: boolean
}

/** Совместимость со старым API. */
export type CertificateDesignOption = {
  value: CertificateDesignColor
  label: string
  code: string
  swatch: string
  rowBg: string
  group: 'Boeing' | 'Ми-2' | 'Сдвоенный' | string
  simulatorSlug?: string
  durationMin?: number
}

function groupForSlug(slug: string): string {
  if (slug === 'mi-2') return 'Ми-2'
  if (slug === 'combo') return 'Сдвоенный'
  return 'Boeing'
}

export function rowToOption(row: CertificateDesignRow): CertificateDesignOption {
  return {
    value: row.key,
    label: row.code,
    code: row.code,
    swatch: row.swatch,
    rowBg: row.rowBg,
    group: groupForSlug(row.simulatorSlug),
    simulatorSlug: row.simulatorSlug,
    durationMin: row.durationMin,
  }
}

/** Серии клиента + цвета из прежних бланков. */
export const DEFAULT_CERTIFICATE_DESIGNS: readonly CertificateDesignRow[] = [
  {
    id: 'cd-eb-mi2-737ng',
    key: 'eb-mi2-737ng',
    label: 'EB-MI2-737NG-',
    code: 'EB-MI2-737NG-',
    simulatorSlug: 'combo',
    durationMin: 60,
    swatch: '#6b21a8',
    rowBg: '#d8b4fe',
    sortOrder: 1,
    active: true,
  },
  {
    id: 'cd-es-b737ng',
    key: 'es-b737ng',
    label: 'ES-B737NG-',
    code: 'ES-B737NG-',
    simulatorSlug: 'boeing-737',
    durationMin: 30,
    swatch: '#b8c0c8',
    rowBg: '#dfe4e8',
    sortOrder: 2,
    active: true,
  },
  {
    id: 'cd-es-mi2',
    key: 'es-mi2',
    label: 'ES-MI2-',
    code: 'ES-MI2-',
    simulatorSlug: 'mi-2',
    durationMin: 30,
    swatch: '#047857',
    rowBg: '#6ee7b7',
    sortOrder: 3,
    active: true,
  },
  {
    id: 'cd-eb-b737ng',
    key: 'eb-b737ng',
    label: 'EB-B737NG-',
    code: 'EB-B737NG-',
    simulatorSlug: 'boeing-737',
    durationMin: 60,
    swatch: '#ca8a04',
    rowBg: '#fde68a',
    sortOrder: 4,
    active: true,
  },
  {
    id: 'cd-eb-mi2',
    key: 'eb-mi2',
    label: 'EB-MI2-',
    code: 'EB-MI2-',
    simulatorSlug: 'mi-2',
    durationMin: 60,
    swatch: '#b45309',
    rowBg: '#fdba74',
    sortOrder: 5,
    active: true,
  },
  {
    id: 'cd-bl-b737ng',
    key: 'bl-b737ng',
    label: 'BL-B737NG-',
    code: 'BL-B737NG-',
    simulatorSlug: 'boeing-737',
    durationMin: 90,
    swatch: '#1e3a5f',
    rowBg: '#93c5fd',
    sortOrder: 6,
    active: true,
  },
  {
    id: 'cd-ef-b737ng',
    key: 'ef-b737ng',
    label: 'EF-B737NG-',
    code: 'EF-B737NG-',
    simulatorSlug: 'boeing-737',
    durationMin: 120,
    swatch: '#14b8a6',
    rowBg: '#99f6e4',
    sortOrder: 7,
    active: true,
  },
] as const

/** @deprecated */
export const CERTIFICATE_DESIGN_OPTIONS: readonly CertificateDesignOption[] =
  DEFAULT_CERTIFICATE_DESIGNS.map(rowToOption)

export function buildCertificateNumber(code: string, digits: string) {
  const prefix = String(code ?? '')
    .toUpperCase()
    .replace(/^№\s*/, '')
  const d = digits.replace(/\D/g, '')
  const maxDigits = maxDigitsForCode(prefix)
  return `${prefix}${d.slice(0, maxDigits)}`
}

export function maxDigitsForCode(code: string) {
  const prefix = String(code ?? '')
    .toUpperCase()
    .replace(/^№\s*/, '')
  return Math.max(0, CERTIFICATE_NUMBER_MAX_LEN - certificateAlnumLength(prefix))
}

/** Разобрать номер: самый длинный подходящий префикс серии + цифры. */
export function parseCertificateParts(
  raw: string,
  designs:
    | readonly CertificateDesignRow[]
    | readonly CertificateDesignOption[] = DEFAULT_CERTIFICATE_DESIGNS,
): { code: string; digits: string } {
  const cleaned = String(raw ?? '')
    .trim()
    .replace(/^№\s*/i, '')
    .toUpperCase()
  const codes = designs
    .map((d) => String(d.code ?? '').toUpperCase())
    .filter(Boolean)
    .sort((a, b) => b.length - a.length)
  if (!cleaned) {
    return { code: codes[0] || 'EB-B737NG-', digits: '' }
  }
  for (const code of codes) {
    if (cleaned.startsWith(code)) {
      return { code, digits: cleaned.slice(code.length).replace(/\D/g, '') }
    }
  }
  return { code: codes[0] || 'EB-B737NG-', digits: cleaned.replace(/\D/g, '') }
}

export function activeDesigns(
  designs: readonly CertificateDesignRow[] | null | undefined,
): CertificateDesignRow[] {
  const list = designs?.length ? [...designs] : [...DEFAULT_CERTIFICATE_DESIGNS]
  return list
    .map((d) => ({
      ...d,
      durationMin:
        typeof d.durationMin === 'number' && d.durationMin > 0 ? d.durationMin : 60,
      code: String(d.code || d.label || '').toUpperCase(),
      label: String(d.code || d.label || '').toUpperCase(),
    }))
    .filter((d) => d.active !== false)
    .sort((a, b) => a.sortOrder - b.sortOrder)
}

export function designByCode(
  code: string | undefined | null,
  designs?: readonly CertificateDesignRow[] | null,
) {
  const c = String(code ?? '')
    .toUpperCase()
    .replace(/^№\s*/, '')
  return (
    activeDesigns(designs).find((o) => o.code.toUpperCase() === c) ??
    activeDesigns(designs).find((o) => c.startsWith(o.code.toUpperCase())) ??
    null
  )
}

export function designOptionsForSim(
  simulatorSlug: string,
  designs?: readonly CertificateDesignRow[] | null,
): CertificateDesignOption[] {
  const all = activeDesigns(designs)
  const hit = all.filter((d) => d.simulatorSlug === simulatorSlug)
  const rows = hit.length > 0 ? hit : all.filter((d) => d.simulatorSlug === 'boeing-737')
  return rows.map(rowToOption)
}

export function allDesignOptions(designs?: readonly CertificateDesignRow[] | null) {
  return activeDesigns(designs).map(rowToOption)
}

export function defaultDesignForSim(
  simulatorSlug: string,
  designs?: readonly CertificateDesignRow[] | null,
): CertificateDesignColor {
  return designOptionsForSim(simulatorSlug, designs)[0]?.value ?? 'eb-b737ng'
}

/** Старые ключи бланков (серебро/золото…) → серии клиента. */
const LEGACY_DESIGN_KEY: Record<string, string> = {
  silver: 'es-b737ng',
  gold: 'eb-b737ng',
  coral: 'eb-mi2',
  emerald: 'es-mi2',
  navy: 'bl-b737ng',
  turquoise: 'ef-b737ng',
  lilac: 'eb-mi2-737ng',
}

export function resolveDesignKey(key: string | undefined | null): string {
  const k = String(key ?? '').trim()
  if (!k) return ''
  return LEGACY_DESIGN_KEY[k] ?? LEGACY_DESIGN_KEY[k.toLowerCase()] ?? k.toLowerCase()
}

export function designMeta(
  color: string | undefined | null,
  designs?: readonly CertificateDesignRow[] | null,
) {
  const list = activeDesigns(designs)
  const resolved = resolveDesignKey(color)
  const hit = list.find((o) => o.key === resolved) ?? list.find((o) => o.key === color)
  return hit ? rowToOption(hit) : rowToOption(list[0] ?? DEFAULT_CERTIFICATE_DESIGNS[0])
}

export function designForSimAndDuration(
  simulatorSlug: string,
  durationMin: number,
  designs?: readonly CertificateDesignRow[] | null,
): CertificateDesignOption | null {
  const list = activeDesigns(designs).filter((d) => d.simulatorSlug === simulatorSlug)
  const hit = list.find((d) => d.durationMin === durationMin) ?? list[0]
  return hit ? rowToOption(hit) : null
}

export function isDesignColor(
  value: string | undefined | null,
  designs?: readonly CertificateDesignRow[] | null,
): value is CertificateDesignColor {
  if (!value) return false
  const resolved = resolveDesignKey(value)
  return activeDesigns(designs).some((o) => o.key === value || o.key === resolved)
}

/** @deprecated */
export const CERTIFICATE_DESIGN_BY_SIM: Record<string, readonly CertificateDesignOption[]> = {
  'boeing-737': CERTIFICATE_DESIGN_OPTIONS.filter((o) => o.group === 'Boeing'),
  'mi-2': CERTIFICATE_DESIGN_OPTIONS.filter((o) => o.group === 'Ми-2'),
  combo: CERTIFICATE_DESIGN_OPTIONS.filter((o) => o.group === 'Сдвоенный'),
}

export type CertUrgencyTone = 'green' | 'yellow' | 'red' | 'muted'

export function certificateUrgency(
  validTo: string,
  status: string,
  today = new Date(),
): { tone: CertUrgencyTone; label: string; daysLeft: number | null; expired: boolean } {
  const todayKey = [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, '0'),
    String(today.getDate()).padStart(2, '0'),
  ].join('-')

  if (status === 'PENDING_CONFIRMATION') {
    return { tone: 'muted', label: 'Подтверждение email', daysLeft: null, expired: false }
  }
  if (status === 'CANCELLED') {
    return { tone: 'muted', label: 'Отменён', daysLeft: null, expired: false }
  }
  if (status === 'USED') {
    return { tone: 'muted', label: 'Использован', daysLeft: null, expired: false }
  }

  const expired = status === 'EXPIRED' || validTo < todayKey
  if (expired) {
    return { tone: 'red', label: 'Просрочен', daysLeft: 0, expired: true }
  }

  const [y, m, d] = validTo.split('-').map(Number)
  const end = new Date(y, (m ?? 1) - 1, d ?? 1)
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const daysLeft = Math.max(0, Math.round((end.getTime() - start.getTime()) / 86400000))

  if (daysLeft <= 7) {
    return {
      tone: 'red',
      label: daysLeft === 0 ? 'Истекает сегодня' : `Осталось ${daysLeft} дн.`,
      daysLeft,
      expired: false,
    }
  }
  if (daysLeft <= 30) {
    return { tone: 'yellow', label: `Осталось ${daysLeft} дн.`, daysLeft, expired: false }
  }
  return { tone: 'green', label: `Осталось ${daysLeft} дн.`, daysLeft, expired: false }
}

export function certificateDisplayStatus(
  validTo: string,
  status: string,
  today = new Date(),
): { label: string; tone: 'green' | 'red' | 'muted' } {
  if (status === 'PENDING_CONFIRMATION') return { label: 'Подтверждение email', tone: 'muted' }
  if (status === 'CANCELLED') return { label: 'Отменён', tone: 'muted' }
  if (status === 'USED') return { label: 'Использован', tone: 'muted' }
  const todayKey = [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, '0'),
    String(today.getDate()).padStart(2, '0'),
  ].join('-')
  if (status === 'EXPIRED' || validTo < todayKey) {
    return { label: 'Просрочен', tone: 'red' }
  }
  if (status === 'PARTIAL') return { label: 'Частично использован', tone: 'green' }
  return { label: 'Активен', tone: 'green' }
}

export function certificateStatusBadgeClass(status: string): string {
  if (status === 'ACTIVE' || status === 'PARTIAL') {
    return 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300'
  }
  if (status === 'EXPIRED') {
    return 'bg-red-100 text-red-800 border-red-200 dark:bg-red-950/40 dark:text-red-300'
  }
  if (status === 'PENDING_CONFIRMATION') {
    return 'bg-sky-100 text-sky-900 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300'
  }
  if (status === 'USED' || status === 'CANCELLED') {
    return 'bg-muted text-muted-foreground border-border'
  }
  return 'bg-muted text-muted-foreground border-border'
}

/** Срок действия сертификата: 90 дней от даты начала (~3 месяца). */
export const CERTIFICATE_VALIDITY_DAYS = 90

export function defaultCertificateValidToIso(fromIso: string): string {
  const raw = String(fromIso ?? '').trim()
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw
  const [y, m, d] = raw.split('-').map(Number)
  const from = new Date(y, m - 1, d)
  if (Number.isNaN(from.getTime())) return raw
  from.setDate(from.getDate() + CERTIFICATE_VALIDITY_DAYS)
  return [
    from.getFullYear(),
    String(from.getMonth() + 1).padStart(2, '0'),
    String(from.getDate()).padStart(2, '0'),
  ].join('-')
}

export const URGENCY_BADGE_CLASS: Record<CertUrgencyTone, string> = {
  green: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  yellow: 'bg-amber-100 text-amber-900 border-amber-200',
  red: 'bg-red-100 text-red-800 border-red-200',
  muted: 'bg-muted text-muted-foreground border-border',
}
