/** Подписи статусов и справочников админки — по-русски, для селектов и таблиц. */

export const CERTIFICATE_STATUS_OPTIONS = [
  { value: 'ACTIVE', label: 'Активен' },
  { value: 'USED', label: 'Использован' },
  { value: 'PARTIAL', label: 'Частично использован' },
  { value: 'EXPIRED', label: 'Истёк' },
  { value: 'CANCELLED', label: 'Отменён' },
] as const

export const BOOKING_STATUS_OPTIONS = [
  { value: 'PENDING_CONFIRMATION', label: 'Ожидает подтверждения' },
  { value: 'CONFIRMED', label: 'Подтверждена' },
  { value: 'IN_PROGRESS', label: 'В процессе' },
  { value: 'WAITING', label: 'Ожидаем' },
  { value: 'DONE', label: 'Закончили' },
  { value: 'CANCELLED', label: 'Отменён' },
  { value: 'EXPIRED', label: 'Истекла' },
] as const

export const PROMO_TYPE_OPTIONS = [
  { value: 'BIRTHDAY', label: 'День рождения' },
  { value: 'HAPPY_HOURS', label: 'Счастливые часы' },
  { value: 'CUSTOM', label: 'Другая' },
] as const

export const ACCOUNT_ROLE_OPTIONS = [
  { value: 'ADMIN', label: 'Админ' },
  { value: 'MANAGER', label: 'Менеджер' },
  { value: 'PILOT', label: 'Пилот' },
] as const

/** Именованные цвета для аккаунтов (вместо ручного hex). */
export const ACCOUNT_COLOR_OPTIONS = [
  { value: '#dc2626', label: 'Красный' },
  { value: '#ea580c', label: 'Оранжевый' },
  { value: '#ca8a04', label: 'Жёлтый' },
  { value: '#16a34a', label: 'Зелёный' },
  { value: '#0891b2', label: 'Голубой' },
  { value: '#2563eb', label: 'Синий' },
  { value: '#9333ea', label: 'Фиолетовый' },
  { value: '#db2777', label: 'Розовый' },
  { value: '#64748b', label: 'Серый' },
  { value: '#171717', label: 'Чёрный' },
] as const

export const SIMULATOR_OPTIONS = [
  { value: 'boeing-737', label: 'Boeing 737' },
  { value: 'mi-2', label: 'Ми-2' },
] as const

export const CERT_SIMULATOR_OPTIONS = [
  ...SIMULATOR_OPTIONS,
  { value: 'combo', label: 'Комбо (Boeing + Ми-2)' },
] as const

/** Значения API: ONLINE / OFFLINE; в UI селектов — словесные подписи. */
export const PAYMENT_METHOD_OPTIONS = [
  { value: 'ONLINE', label: 'На сайте' },
  { value: 'OFFLINE', label: 'В офисе' },
] as const

export type PaymentMethodValue = (typeof PAYMENT_METHOD_OPTIONS)[number]['value']

export function labelOf(
  options: readonly { value: string; label: string }[],
  value: string | undefined | null,
  fallback = value ?? '—',
) {
  return options.find((o) => o.value === value)?.label ?? fallback
}
