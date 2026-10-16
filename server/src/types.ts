export type UserRole = 'ADMIN' | 'MANAGER' | 'PILOT'

export type CalendarDayStatus = 'OPEN' | 'BLOCKED' | 'HOLIDAY'

export type BookingStatus =
  | 'PENDING_CONFIRMATION'
  | 'CONFIRMED'
  | 'IN_PROGRESS'
  | 'DONE'
  | 'WAITING'
  | 'CANCELLED'
  | 'EXPIRED'

export type CertificateStatus = 'ACTIVE' | 'USED' | 'PARTIAL' | 'EXPIRED' | 'CANCELLED'

export type PaymentStatus = 'PAID' | 'UNPAID'

export type User = {
  id: string
  login: string
  /** Демо-хранилище: пароль в открытом виде (для админки). */
  password: string
  fullName: string
  phone: string
  role: UserRole
  isActive: boolean
  color: string
  pilotSimulators: string[]
}

export type Booking = {
  id: string
  date: string
  startTime: string
  endTime: string
  durationMin: number
  simulatorSlug: string
  name: string
  phone: string
  email: string
  status: BookingStatus
  paid: boolean
  paymentMethod: 'OFFLINE' | 'ONLINE'
  comment: string
  isBirthdayPromo: boolean
  birthdayDate?: string
  certificateNumber?: string
  promoNote?: string
  holdExpiresAt?: string
  createdAt: string
  updatedAt: string
}

export type StaffShift = {
  id: string
  date: string
  userId: string
  simulatorSlug: string
  createdAt: string
}

/** Цвет бланка: Boeing — silver/turquoise/gold/navy; Ми-2 — coral/emerald; combo — lilac. */
export type CertificateDesignColor =
  | 'silver'
  | 'turquoise'
  | 'gold'
  | 'navy'
  | 'coral'
  | 'emerald'
  | 'lilac'

export type Certificate = {
  id: string
  number: string
  phone: string
  fullName: string
  durationMin: number
  paymentStatus: PaymentStatus
  /** ONLINE = на сайте, OFFLINE = в офисе */
  paymentMethod: 'ONLINE' | 'OFFLINE'
  validFrom: string
  validTo: string
  simulatorSlug: string
  status: CertificateStatus
  /** Цвет бланка / фон строки в админке */
  designColor?: CertificateDesignColor
  comment: string
  createdAt: string
}

export type WaitingEntry = {
  id: string
  date: string
  line: string
  createdAt: string
}

export type PriceRow = {
  id: string
  durationMin: number
  simulatorSlug: string
  priceByn: number
}

export type Promo = {
  id: string
  name: string
  discountPercent: number
  startDate: string
  endDate: string
  productType: string
  promoType: 'BIRTHDAY' | 'HAPPY_HOURS' | 'CUSTOM'
  active: boolean
}

export type WorkHourEntry = {
  id: string
  line: string
  createdAt: string
}

/**
 * Закрытие под ТО / недоступность на сайте.
 * - без simulatorSlug → все тренажёры
 * - без startTime/endTime → весь день
 * - с интервалом → только это окно (можно закрыть «полдня»)
 */
export type MaintenanceEntry = {
  id: string
  /** yyyy-MM-dd */
  date: string
  /** null/undefined = все тренажёры */
  simulatorSlug?: string | null
  /** HH:mm; без пары start/end = весь день */
  startTime?: string | null
  endTime?: string | null
  notes: string
  createdAt: string
  /** @deprecated старые записи — мигрируются в date */
  plannedAt?: string
}

export type OptionItem = {
  id: string
  value: string
  label: string
  sortOrder: number
}

export type FeedbackRequest = {
  id: string
  name: string
  phone: string
  message: string
  createdAt: string
}

export type NotificationKind =
  | 'booking'
  | 'certificate'
  | 'maintenance'
  | 'staff_shift'
  | 'waiting_room'
  | 'feedback'
  | 'calendar'
  | 'system'

export type AdminNotification = {
  id: string
  kind: NotificationKind
  title: string
  body: string
  href: string
  /** Кому показывать по роли. Пусто = никому (не используется). */
  audienceRoles: UserRole[]
  /** Если задано — видно только этому пользователю (поверх ролей). */
  targetUserId?: string
  /** userId → когда прочитано */
  readBy: Record<string, string>
  createdAt: string
  meta?: Record<string, string>
}

/** Секция архива = страница-источник удаления. */
export type ArchiveSectionKey =
  | 'bookings'
  | 'certificates'
  | 'waiting_room'
  | 'staff_shifts'
  | 'maintenance'
  | 'schedule_settings'
  | 'accounts'
  | 'prices_promos'

/** Запись архива удалений (см. lib/archive.ts). */
export type ArchiveEntry = {
  id: string
  section: ArchiveSectionKey
  kind?: string
  entityId: string
  title: string
  summary: string
  payload: unknown
  deletedAt: string
  expiresAt: string
  deletedByUserId?: string
  deletedByName?: string
  sourcePath: string
}

export type DataStore = {
  version: 1
  users: User[]
  bookings: Booking[]
  calendar: Record<string, CalendarDayStatus>
  staffShifts: StaffShift[]
  certificates: Certificate[]
  waitingRoom: WaitingEntry[]
  flightPrices: PriceRow[]
  certPrices: PriceRow[]
  promos: Promo[]
  documents: { key: string; title: string; content: string }[]
  contacts: { phone: string; email: string; hours: string }
  gallery: Record<string, string[]>
  workHours: WorkHourEntry[]
  maintenance: MaintenanceEntry[]
  optionLists: Record<string, OptionItem[]>
  settings: { bookingWindowMonths: number }
  counters: { certificate: number }
  pendingCodes: { bookingId: string; code: string; expiresAt: string; sentAt: string }[]
  feedbackRequests?: FeedbackRequest[]
  notifications?: AdminNotification[]
  /** Удалённые записи (хранятся 30 дней). */
  archive?: ArchiveEntry[]
}
