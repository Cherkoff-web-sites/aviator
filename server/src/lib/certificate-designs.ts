import type { CertificateDesign } from '../types.js'

/** Дефолтные виды бланков (серия в номере = code). */
export const DEFAULT_CERTIFICATE_DESIGNS: CertificateDesign[] = [
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
]

export function normalizeCertificateDesigns(
  rows: CertificateDesign[] | null | undefined,
): CertificateDesign[] {
  if (!Array.isArray(rows) || rows.length === 0) {
    return DEFAULT_CERTIFICATE_DESIGNS.map((r) => ({ ...r }))
  }
  return rows
    .map((r, i) => ({
      id: String(r.id || `cd-${i}`),
      key: String(r.key || r.id || `design-${i}`).trim() || `design-${i}`,
      label: String(r.label || r.key || '').trim() || `Вид ${i + 1}`,
      code: String(r.code || 'X')
        .trim()
        .toUpperCase()
        .slice(0, 1) || 'X',
      simulatorSlug: String(r.simulatorSlug || 'boeing-737').trim() || 'boeing-737',
      swatch: String(r.swatch || '#64748b'),
      rowBg: String(r.rowBg || '#e2e8f0'),
      sortOrder: typeof r.sortOrder === 'number' ? r.sortOrder : i + 1,
      active: r.active !== false,
    }))
    .sort((a, b) => a.sortOrder - b.sortOrder || a.label.localeCompare(b.label, 'ru'))
}

export function designsForSimulator(designs: CertificateDesign[], simulatorSlug: string) {
  const active = designs.filter((d) => d.active !== false)
  const hit = active.filter((d) => d.simulatorSlug === simulatorSlug)
  return hit.length > 0 ? hit : active.filter((d) => d.simulatorSlug === 'boeing-737')
}

export function defaultDesignKey(designs: CertificateDesign[], simulatorSlug: string, preferred?: string) {
  const allowed = designsForSimulator(designs, simulatorSlug)
  if (preferred && allowed.some((d) => d.key === preferred)) return preferred
  return allowed[0]?.key ?? 'silver'
}

export function designByKey(designs: CertificateDesign[], key: string | undefined | null) {
  return designs.find((d) => d.key === key) ?? designs[0] ?? DEFAULT_CERTIFICATE_DESIGNS[0]
}

export function nextCertificateNumber(counter: number, design: CertificateDesign): string {
  return `№${design.code.toUpperCase()}${counter}`
}
