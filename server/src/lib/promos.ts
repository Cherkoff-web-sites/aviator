import type { Promo } from '../types.js'

export function isPromoUsableOnDate(promo: Promo | null | undefined, dateKey: string): boolean {
  if (!promo || !promo.active) return false
  const start = String(promo.startDate || '').slice(0, 10)
  if (start && dateKey < start) return false
  if (promo.indefinite) return true
  const end = String(promo.endDate || '').slice(0, 10)
  if (end && end !== '9999-12-31' && dateKey > end) return false
  return true
}

export function promoByType(
  promos: Promo[],
  promoType: 'BIRTHDAY' | 'HAPPY_HOURS' | 'CUSTOM',
): Promo | null {
  return promos.find((p) => p.promoType === promoType) ?? null
}

export function promoAppliesToSimulator(promo: Promo | null | undefined, simulatorSlug: string): boolean {
  if (!promo) return false
  const raw = String(promo.productType || '').trim()
  if (!raw) return true
  const lower = raw.toLowerCase()
  const slug = simulatorSlug.toLowerCase()
  if (slug === 'combo') {
    return (
      lower.includes('combo') ||
      lower.includes('2в1') ||
      lower.includes('+') ||
      (lower.includes('boeing') && (lower.includes('ми') || lower.includes('mi')))
    )
  }
  if (slug === 'mi-2') {
    return (
      lower.includes('ми-2') ||
      lower.includes('mi-2') ||
      lower.includes('mi2') ||
      /\bmi\b/.test(lower)
    )
  }
  return lower.includes('boeing') || lower.includes('737')
}

export function promoNoteLabel(promo: Promo): string {
  const pct = Math.round(Number(promo.discountPercent) || 0)
  if (promo.promoType === 'BIRTHDAY') return `ДР-${pct}%`
  if (promo.promoType === 'HAPPY_HOURS') return `Счастливые часы -${pct}%`
  return `${promo.name} -${pct}%`
}
