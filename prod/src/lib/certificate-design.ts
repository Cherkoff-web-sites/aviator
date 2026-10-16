/** Цвет бланка сертификата (колонка «Тренажёр» в админке). */
export type CertificateDesignColor =
  | 'silver'
  | 'turquoise'
  | 'gold'
  | 'navy'
  | 'coral'
  | 'emerald'
  | 'lilac'

export type CertificateDesignOption = {
  value: CertificateDesignColor
  label: string
  swatch: string
  /** Фон в колонке тренажёра — заметный, но читаемый текст */
  rowBg: string
  group: 'Boeing' | 'Ми-2' | 'Сдвоенный'
}

/** Полный список — все цвета из ТЗ. */
export const CERTIFICATE_DESIGN_OPTIONS: readonly CertificateDesignOption[] = [
  { value: 'silver', label: 'Серебристый', swatch: '#b8c0c8', rowBg: '#dfe4e8', group: 'Boeing' },
  { value: 'turquoise', label: 'Бирюзовый', swatch: '#14b8a6', rowBg: '#99f6e4', group: 'Boeing' },
  { value: 'gold', label: 'Золотой', swatch: '#ca8a04', rowBg: '#fde68a', group: 'Boeing' },
  { value: 'navy', label: 'Тёмно-синий', swatch: '#1e3a5f', rowBg: '#93c5fd', group: 'Boeing' },
  { value: 'coral', label: 'Коралловый тёмный', swatch: '#b91c1c', rowBg: '#fca5a5', group: 'Ми-2' },
  { value: 'emerald', label: 'Изумрудный', swatch: '#047857', rowBg: '#6ee7b7', group: 'Ми-2' },
  { value: 'lilac', label: 'Тёмно-сиреневый', swatch: '#6b21a8', rowBg: '#d8b4fe', group: 'Сдвоенный' },
] as const

export const CERTIFICATE_DESIGN_BY_SIM: Record<string, readonly CertificateDesignOption[]> = {
  'boeing-737': CERTIFICATE_DESIGN_OPTIONS.filter((o) => o.group === 'Boeing'),
  'mi-2': CERTIFICATE_DESIGN_OPTIONS.filter((o) => o.group === 'Ми-2'),
  combo: CERTIFICATE_DESIGN_OPTIONS.filter((o) => o.group === 'Сдвоенный'),
}

export function designOptionsForSim(simulatorSlug: string) {
  return CERTIFICATE_DESIGN_BY_SIM[simulatorSlug] ?? CERTIFICATE_DESIGN_BY_SIM['boeing-737']
}

/** Все цвета — для выбора в форме. */
export function allDesignOptions() {
  return CERTIFICATE_DESIGN_OPTIONS
}

export function defaultDesignForSim(simulatorSlug: string): CertificateDesignColor {
  return designOptionsForSim(simulatorSlug)[0].value
}

export function designMeta(color: string | undefined | null) {
  const hit = CERTIFICATE_DESIGN_OPTIONS.find((o) => o.value === color)
  return hit ?? CERTIFICATE_DESIGN_OPTIONS[0]
}

export function isDesignColor(value: string | undefined | null): value is CertificateDesignColor {
  return CERTIFICATE_DESIGN_OPTIONS.some((o) => o.value === value)
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

export const URGENCY_BADGE_CLASS: Record<CertUrgencyTone, string> = {
  green: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  yellow: 'bg-amber-100 text-amber-900 border-amber-200',
  red: 'bg-red-100 text-red-800 border-red-200',
  muted: 'bg-muted text-muted-foreground border-border',
}
