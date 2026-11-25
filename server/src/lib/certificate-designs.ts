import type { CertificateDesign } from '../types.js'

/**
 * Макс. букв+цифр в полном номере (тире не считаются).
 * Пример: EB-MI2-737NG-001 → 13 значимых символов при тире в серии.
 */
export const CERTIFICATE_NUMBER_MAX_LEN = 13

export function certificateAlnumLength(value: string): number {
  return String(value ?? '').replace(/[^A-Za-z0-9]/g, '').length
}

/** Обрезает серию по лимиту букв+цифр (тире сохраняются). Запас ≥1 на цифры номера. */
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

/**
 * Серии по данным клиента.
 * Цвета взяты из прежних бланков (золотой/серебро/изумруд/сирень/синий/бирюза) + бронза для EB-MI2.
 */
export const DEFAULT_CERTIFICATE_DESIGNS: CertificateDesign[] = [
  {
    id: 'cd-eb-mi2-737ng',
    key: 'eb-mi2-737ng',
    label: 'EB-MI2-737NG-',
    /** 10 букв/цифр в серии → до 3 цифр номера при лимите 13 (тире не считаются). */
    code: 'EB-MI2-737NG-',
    simulatorSlug: 'combo',
    durationMin: 60,
    /** Бывший «lilac» / сдвоенный бланк */
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
    /** Бывший «silver» */
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
    /** Бывший «emerald» */
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
    /** Бывший «gold» */
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
    /** Бывший «coral» → бронза */
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
    /** Бывший «navy» */
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
    /** Бывший «turquoise» */
    swatch: '#14b8a6',
    rowBg: '#99f6e4',
    sortOrder: 7,
    active: true,
  },
]

/** Старые ключи бланков → новые серии клиента. */
const LEGACY_DESIGN_KEY: Record<string, string> = {
  silver: 'es-b737ng',
  gold: 'eb-b737ng',
  coral: 'eb-mi2',
  emerald: 'es-mi2',
  navy: 'bl-b737ng',
  turquoise: 'ef-b737ng',
  lilac: 'eb-mi2-737ng',
  S: 'es-b737ng',
  G: 'eb-b737ng',
  C: 'eb-mi2',
  E: 'es-mi2',
  N: 'bl-b737ng',
  T: 'ef-b737ng',
  L: 'eb-mi2-737ng',
}

function slugFromCode(code: string, fallback: string) {
  const s = code
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
  return s || fallback
}

function isLegacySingleLetterSet(rows: CertificateDesign[]): boolean {
  if (!rows.length) return true
  const legacyKeys = new Set(Object.keys(LEGACY_DESIGN_KEY))
  return rows.every((r) => {
    const code = String(r.code ?? '')
      .replace(/^№/, '')
      .trim()
    const key = String(r.key ?? '').trim().toLowerCase()
    if (legacyKeys.has(key) || legacyKeys.has(code)) return true
    return code.length <= 1
  })
}

export function normalizeCertificateDesigns(
  rows: CertificateDesign[] | null | undefined,
): CertificateDesign[] {
  if (!Array.isArray(rows) || rows.length === 0 || isLegacySingleLetterSet(rows as CertificateDesign[])) {
    return DEFAULT_CERTIFICATE_DESIGNS.map((r) => ({ ...r }))
  }
  return rows
    .map((r, i) => {
      const codeRaw = clipCertificateSeriesCode(
        String(r.code || '')
          .trim()
          .replace(/^№\s*/, ''),
      )
      const code = codeRaw || `X${i + 1}-`
      const key =
        String(r.key || '')
          .trim()
          .toLowerCase() || slugFromCode(code, `design-${i + 1}`)
      const durationMin =
        typeof r.durationMin === 'number' && r.durationMin > 0
          ? Math.round(r.durationMin)
          : 60
      return {
        id: String(r.id || `cd-${i}`),
        key,
        label: code,
        code,
        simulatorSlug: String(r.simulatorSlug || 'boeing-737').trim() || 'boeing-737',
        durationMin,
        swatch: String(r.swatch || '#64748b'),
        rowBg: String(r.rowBg || '#e2e8f0'),
        sortOrder: typeof r.sortOrder === 'number' ? r.sortOrder : i + 1,
        active: r.active !== false,
      }
    })
    .sort((a, b) => a.sortOrder - b.sortOrder || a.code.localeCompare(b.code, 'ru'))
}

export function designsForSimulator(designs: CertificateDesign[], simulatorSlug: string) {
  const active = designs.filter((d) => d.active !== false)
  const hit = active.filter((d) => d.simulatorSlug === simulatorSlug)
  return hit.length > 0 ? hit : active.filter((d) => d.simulatorSlug === 'boeing-737')
}

export function resolveDesignKey(key: string | undefined | null): string {
  const k = String(key ?? '').trim()
  if (!k) return ''
  return LEGACY_DESIGN_KEY[k] ?? LEGACY_DESIGN_KEY[k.toLowerCase()] ?? k.toLowerCase()
}

export function defaultDesignKey(
  designs: CertificateDesign[],
  simulatorSlug: string,
  preferred?: string,
  durationMin?: number,
) {
  const allowed = designsForSimulator(designs, simulatorSlug)
  const pref = resolveDesignKey(preferred)
  if (pref && allowed.some((d) => d.key === pref)) return pref
  if (pref) {
    const any = designs.find((d) => d.key === pref)
    if (any) return any.key
  }
  if (typeof durationMin === 'number' && durationMin > 0) {
    const byDur = allowed.find((d) => d.durationMin === durationMin)
    if (byDur) return byDur.key
  }
  return allowed[0]?.key ?? designs[0]?.key ?? 'eb-b737ng'
}

export function designByKey(designs: CertificateDesign[], key: string | undefined | null) {
  const resolved = resolveDesignKey(key)
  return (
    designs.find((d) => d.key === resolved) ??
    designs.find((d) => d.key === key) ??
    designs[0] ??
    DEFAULT_CERTIFICATE_DESIGNS[0]
  )
}

export function designByCode(designs: CertificateDesign[], code: string | undefined | null) {
  const c = String(code ?? '')
    .trim()
    .toUpperCase()
    .replace(/^№\s*/, '')
  return (
    designs.find((d) => d.code.toUpperCase() === c) ??
    designs.find((d) => c.startsWith(d.code.toUpperCase())) ??
    null
  )
}

export function normalizeCertificateNumber(raw: string | undefined | null): string {
  return String(raw ?? '')
    .trim()
    .replace(/^№\s*/i, '')
    .replace(/\s+/g, '')
    .toUpperCase()
}

export function nextCertificateNumber(counter: number, design: CertificateDesign): string {
  const prefix = String(design.code || '')
    .toUpperCase()
    .replace(/^№\s*/, '')
  const maxDigits = Math.max(0, CERTIFICATE_NUMBER_MAX_LEN - certificateAlnumLength(prefix))
  if (maxDigits <= 0) return prefix
  const raw = String(Math.max(0, counter))
  const digits = raw.length > maxDigits ? raw.slice(-maxDigits) : raw.padStart(Math.min(maxDigits, 3), '0')
  return `${prefix}${digits}`
}

/**
 * Следующий свободный номер для серии: max(цифры у существующих с этим префиксом) + 1.
 * Глобальный counter — только нижняя граница, если сертификатов ещё нет.
 */
export function allocateNextCertificateNumber(
  certificates: { number: string }[],
  design: CertificateDesign,
  counterFallback = 0,
): string {
  const prefix = String(design.code || '')
    .toUpperCase()
    .replace(/^№\s*/, '')
  const maxDigits = Math.max(0, CERTIFICATE_NUMBER_MAX_LEN - certificateAlnumLength(prefix))
  if (maxDigits <= 0) return prefix

  let maxNum = Math.max(0, counterFallback) - 1
  for (const c of certificates) {
    const n = normalizeCertificateNumber(c.number)
    if (!n.startsWith(prefix)) continue
    const suffix = n.slice(prefix.length)
    if (!/^\d+$/.test(suffix)) continue
    const v = Number(suffix)
    if (Number.isFinite(v) && v > maxNum) maxNum = v
  }
  const next = maxNum + 1
  const digits = String(next).padStart(Math.min(maxDigits, 3), '0')
  const clipped = digits.length > maxDigits ? digits.slice(-maxDigits) : digits
  return `${prefix}${clipped}`
}

export function isCertificateNumberTaken(
  certificates: { id?: string; number: string }[],
  number: string,
  excludeId?: string | null,
): boolean {
  const want = normalizeCertificateNumber(number)
  if (!want) return false
  return certificates.some((c) => {
    if (excludeId && c.id === excludeId) return false
    return normalizeCertificateNumber(c.number) === want
  })
}
