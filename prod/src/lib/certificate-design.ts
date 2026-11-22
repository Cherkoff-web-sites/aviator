/** Цвет/вид бланка сертификата — ключ из настроек (раньше фиксированный enum). */
export type CertificateDesignColor = string

export type CertificateDesignRow = {
  id: string
  key: string
  label: string
  /** Буквенный префикс серии на бланке (№S123456) */
  code: string
  simulatorSlug: string
  swatch: string
  rowBg: string
  sortOrder: number
  active: boolean
}

/** Совместимость со старым API (group вычисляется из simulatorSlug). */
export type CertificateDesignOption = {
  value: CertificateDesignColor
  label: string
  code: string
  swatch: string
  rowBg: string
  group: 'Boeing' | 'Ми-2' | 'Сдвоенный' | string
  simulatorSlug?: string
}

function groupForSlug(slug: string): string {
  if (slug === 'mi-2') return 'Ми-2'
  if (slug === 'combo') return 'Сдвоенный'
  return 'Boeing'
}

export function rowToOption(row: CertificateDesignRow): CertificateDesignOption {
  return {
    value: row.key,
    label: row.label,
    code: row.code,
    swatch: row.swatch,
    rowBg: row.rowBg,
    group: groupForSlug(row.simulatorSlug),
    simulatorSlug: row.simulatorSlug,
  }
}

/** Фоллбек, если API ещё не отдал виды. */
export const DEFAULT_CERTIFICATE_DESIGNS: readonly CertificateDesignRow[] = [
  {
    id: 'cd-silver',
    key: 'silver',
    label: 'Серебристый',
    code: 'S',
    simulatorSlug: 'boeing-737',
    swatch: '#b8c0c8',
    rowBg: '#dfe4e8',
    sortOrder: 1,
    active: true,
  },
  {
    id: 'cd-turquoise',
    key: 'turquoise',
    label: 'Бирюзовый',
    code: 'T',
    simulatorSlug: 'boeing-737',
    swatch: '#14b8a6',
    rowBg: '#99f6e4',
    sortOrder: 2,
    active: true,
  },
  {
    id: 'cd-gold',
    key: 'gold',
    label: 'Золотой',
    code: 'G',
    simulatorSlug: 'boeing-737',
    swatch: '#ca8a04',
    rowBg: '#fde68a',
    sortOrder: 3,
    active: true,
  },
  {
    id: 'cd-navy',
    key: 'navy',
    label: 'Тёмно-синий',
    code: 'N',
    simulatorSlug: 'boeing-737',
    swatch: '#1e3a5f',
    rowBg: '#93c5fd',
    sortOrder: 4,
    active: true,
  },
  {
    id: 'cd-coral',
    key: 'coral',
    label: 'Коралловый тёмный',
    code: 'C',
    simulatorSlug: 'mi-2',
    swatch: '#b91c1c',
    rowBg: '#fca5a5',
    sortOrder: 5,
    active: true,
  },
  {
    id: 'cd-emerald',
    key: 'emerald',
    label: 'Изумрудный',
    code: 'E',
    simulatorSlug: 'mi-2',
    swatch: '#047857',
    rowBg: '#6ee7b7',
    sortOrder: 6,
    active: true,
  },
  {
    id: 'cd-lilac',
    key: 'lilac',
    label: 'Тёмно-сиреневый',
    code: 'L',
    simulatorSlug: 'combo',
    swatch: '#6b21a8',
    rowBg: '#d8b4fe',
    sortOrder: 7,
    active: true,
  },
] as const

/** @deprecated используйте DEFAULT_CERTIFICATE_DESIGNS / API */
export const CERTIFICATE_DESIGN_OPTIONS: readonly CertificateDesignOption[] =
  DEFAULT_CERTIFICATE_DESIGNS.map(rowToOption)

/** Собрать полный номер: № + буква серии + цифры */
export function buildCertificateNumber(code: string, digits: string) {
  const d = digits.replace(/\D/g, '')
  return `№${code.toUpperCase()}${d}`
}

/** Разобрать номер на букву серии и цифры (как в форме брони). */
export function parseCertificateParts(
  raw: string,
  designs: readonly CertificateDesignRow[] | readonly CertificateDesignOption[] = DEFAULT_CERTIFICATE_DESIGNS,
): { code: string; digits: string } {
  const cleaned = String(raw ?? '')
    .trim()
    .replace(/^№\s*/i, '')
  if (!cleaned) {
    const first = 'code' in (designs[0] ?? {})
      ? (designs[0] as CertificateDesignOption).code
      : (designs[0] as CertificateDesignRow)?.code
    return { code: first || 'S', digits: '' }
  }
  const codes = new Set(
    designs.map((d) => ('code' in d ? String(d.code).toUpperCase() : '')).filter(Boolean),
  )
  const first = cleaned[0]?.toUpperCase() ?? ''
  if (codes.has(first)) {
    return { code: first, digits: cleaned.slice(1).replace(/\D/g, '') }
  }
  const fallback =
    'code' in (designs[0] ?? {})
      ? (designs[0] as CertificateDesignOption).code
      : (designs[0] as CertificateDesignRow)?.code
  return { code: fallback || 'S', digits: cleaned.replace(/\D/g, '') }
}

export function activeDesigns(
  designs: readonly CertificateDesignRow[] | null | undefined,
): CertificateDesignRow[] {
  const list = designs?.length ? [...designs] : [...DEFAULT_CERTIFICATE_DESIGNS]
  return list.filter((d) => d.active !== false).sort((a, b) => a.sortOrder - b.sortOrder)
}

export function designByCode(
  code: string | undefined | null,
  designs?: readonly CertificateDesignRow[] | null,
) {
  const c = String(code ?? '').toUpperCase()
  return activeDesigns(designs).find((o) => o.code.toUpperCase() === c) ?? null
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

/** Все активные виды — для выбора серии в форме. */
export function allDesignOptions(designs?: readonly CertificateDesignRow[] | null) {
  return activeDesigns(designs).map(rowToOption)
}

export function defaultDesignForSim(
  simulatorSlug: string,
  designs?: readonly CertificateDesignRow[] | null,
): CertificateDesignColor {
  return designOptionsForSim(simulatorSlug, designs)[0]?.value ?? 'silver'
}

export function designMeta(
  color: string | undefined | null,
  designs?: readonly CertificateDesignRow[] | null,
) {
  const list = activeDesigns(designs)
  const hit = list.find((o) => o.key === color)
  return hit ? rowToOption(hit) : rowToOption(list[0] ?? DEFAULT_CERTIFICATE_DESIGNS[0])
}

export function isDesignColor(
  value: string | undefined | null,
  designs?: readonly CertificateDesignRow[] | null,
): value is CertificateDesignColor {
  if (!value) return false
  return activeDesigns(designs).some((o) => o.key === value)
}

/** @deprecated статичная карта — предпочитайте designOptionsForSim(slug, designs) */
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
  if (status === 'USED' || status === 'CANCELLED') {
    return 'bg-muted text-muted-foreground border-border'
  }
  return 'bg-muted text-muted-foreground border-border'
}

export const URGENCY_BADGE_CLASS: Record<CertUrgencyTone, string> = {
  green: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  yellow: 'bg-amber-100 text-amber-900 border-amber-200',
  red: 'bg-red-100 text-red-800 border-red-200',
  muted: 'bg-muted text-muted-foreground border-border',
}
