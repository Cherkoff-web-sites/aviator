import type { ApiPromo } from '@/lib/api'

export type BookingPromoKind = 'birthday' | 'happy-hours'

/** Сегодня (локально) в YYYY-MM-DD. */
export function todayDateKey(now = new Date()): string {
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/**
 * Акция действует в указанный день: флаг active + период [startDate, endDate].
 * Бессрочная (indefinite / endDate 9999-…) — без верхней границы.
 */
export function isPromoUsableOnDate(promo: ApiPromo | null | undefined, dateKey: string): boolean {
  if (!promo || !promo.active) return false
  const start = String(promo.startDate || '').slice(0, 10)
  if (start && dateKey < start) return false
  if (promo.indefinite) return true
  const end = String(promo.endDate || '').slice(0, 10)
  if (end && end !== '9999-12-31' && dateKey > end) return false
  return true
}

export function isPromoUsableToday(promo: ApiPromo | null | undefined, now = new Date()): boolean {
  return isPromoUsableOnDate(promo, todayDateKey(now))
}

export function promoByType(
  promos: readonly ApiPromo[] | null | undefined,
  promoType: 'BIRTHDAY' | 'HAPPY_HOURS' | 'CUSTOM',
): ApiPromo | null {
  if (!promos?.length) return null
  return promos.find((p) => p.promoType === promoType) ?? null
}

export function promoForBookingKind(
  promos: readonly ApiPromo[] | null | undefined,
  kind: BookingPromoKind,
): ApiPromo | null {
  return promoByType(promos, kind === 'birthday' ? 'BIRTHDAY' : 'HAPPY_HOURS')
}

/** Скидка 0–100 → множитель цены (15 → 0.85). */
export function discountPercentToMultiplier(percent: number | null | undefined): number {
  const p = Number(percent)
  if (!Number.isFinite(p) || p <= 0) return 1
  return Math.max(0, 1 - Math.min(100, p) / 100)
}

/**
 * Подходит ли акция к тренажёру (поле «Продукт» в админке).
 * Пустой список продуктов = действует на все.
 */
export function promoAppliesToSimulator(
  promo: ApiPromo | null | undefined,
  simulatorSlug: string,
): boolean {
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
  // boeing-737
  return lower.includes('boeing') || lower.includes('737')
}

export function formatPromoDiscountLabel(percent: number): string {
  const p = Math.round(Number(percent) || 0)
  return p > 0 ? `−${p}%` : '−0%'
}
