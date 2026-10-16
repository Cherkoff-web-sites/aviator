import { randomUUID } from 'node:crypto'
import { addDays } from 'date-fns'
import type { DataStore, UserRole } from '../types.js'

export const ARCHIVE_RETENTION_DAYS = 30

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

export type ArchiveEntry = {
  id: string
  section: ArchiveSectionKey
  /** Подтип внутри секции (например flight_prices / promos). */
  kind?: string
  entityId: string
  title: string
  summary: string
  payload: unknown
  deletedAt: string
  expiresAt: string
  deletedByUserId?: string
  deletedByName?: string
  /** Путь страницы-источника для ACL. */
  sourcePath: string
}

export const ARCHIVE_SECTION_META: Record<
  ArchiveSectionKey,
  { title: string; sourcePath: string; adminOnly?: boolean }
> = {
  bookings: { title: 'Домашняя — записи', sourcePath: '/admin' },
  certificates: { title: 'Сертификаты', sourcePath: '/admin/certificates' },
  waiting_room: { title: 'Зал ожидания', sourcePath: '/admin/waiting-room' },
  staff_shifts: { title: 'График персонала', sourcePath: '/admin/staff-schedule' },
  maintenance: { title: 'Техническое обслуживание', sourcePath: '/admin/maintenance' },
  schedule_settings: { title: 'Настройки графика', sourcePath: '/admin/schedule-settings' },
  accounts: { title: 'Аккаунты', sourcePath: '/admin/accounts', adminOnly: true },
  prices_promos: { title: 'Цены и акции', sourcePath: '/admin/prices-promos' },
}

export function canViewArchiveSection(role: UserRole, section: ArchiveSectionKey): boolean {
  if (role === 'PILOT') return false
  const meta = ARCHIVE_SECTION_META[section]
  if (meta.adminOnly && role !== 'ADMIN') return false
  if (role === 'MANAGER') {
    if (meta.sourcePath === '/admin/accounts' || meta.sourcePath === '/admin/settings') return false
  }
  return role === 'ADMIN' || role === 'MANAGER'
}

export function ensureArchive(store: DataStore) {
  if (!Array.isArray(store.archive)) store.archive = []
}

export function purgeExpiredArchive(store: DataStore, now = new Date()) {
  ensureArchive(store)
  const t = now.getTime()
  store.archive = store.archive!.filter((e) => new Date(e.expiresAt).getTime() > t)
}

export function clearArchiveEntity(
  store: DataStore,
  section: ArchiveSectionKey,
  entityId: string,
) {
  ensureArchive(store)
  store.archive = store.archive!.filter(
    (e) => !(e.section === section && e.entityId === entityId),
  )
}

export function pushArchive(
  store: DataStore,
  input: {
    section: ArchiveSectionKey
    kind?: string
    entityId: string
    title: string
    summary: string
    payload: unknown
    deletedByUserId?: string
    deletedByName?: string
    sourcePath?: string
  },
  now = new Date(),
) {
  ensureArchive(store)
  purgeExpiredArchive(store, now)
  // Не дублируем одну и ту же сущность
  store.archive = store.archive!.filter(
    (e) => !(e.section === input.section && e.entityId === input.entityId),
  )
  const meta = ARCHIVE_SECTION_META[input.section]
  const entry: ArchiveEntry = {
    id: randomUUID(),
    section: input.section,
    kind: input.kind,
    entityId: input.entityId,
    title: input.title,
    summary: input.summary,
    payload: JSON.parse(JSON.stringify(input.payload)),
    deletedAt: now.toISOString(),
    expiresAt: addDays(now, ARCHIVE_RETENTION_DAYS).toISOString(),
    deletedByUserId: input.deletedByUserId,
    deletedByName: input.deletedByName,
    sourcePath: input.sourcePath ?? meta.sourcePath,
  }
  store.archive!.unshift(entry)
  return entry
}

export function listArchiveForRole(store: DataStore, role: UserRole): ArchiveEntry[] {
  ensureArchive(store)
  purgeExpiredArchive(store)
  return (store.archive ?? []).filter((e) => canViewArchiveSection(role, e.section))
}
