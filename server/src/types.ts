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

export type Certificate = {
  id: string
  number: string
  phone: string
  fullName: string
  durationMin: number
  paymentStatus: PaymentStatus
  validFrom: string
  validTo: string
  simulatorSlug: string
  status: CertificateStatus
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

export type MaintenanceEntry = {
  id: string
  plannedAt: string
  notes: string
  createdAt: string
}

export type OptionItem = {
  id: string
  value: string
  label: string
  sortOrder: number
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
}
