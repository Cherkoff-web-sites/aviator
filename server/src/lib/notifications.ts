import { randomUUID } from 'node:crypto'
import type { AdminNotification, DataStore, NotificationKind, UserRole } from '../types.js'
import { emitAll } from './socket.js'

const MAX_NOTIFICATIONS = 200

export type NewNotification = {
  kind: NotificationKind
  title: string
  body: string
  href: string
  /** Если не задано — берётся из матрицы доступа по kind (+ personal). */
  audienceRoles?: UserRole[]
  /** Личное уведомление (смена пилоту и т.п.). */
  targetUserId?: string
  meta?: Record<string, string>
  createdAt?: string
}

/**
 * Кому по умолчанию адресовано уведомление данного типа.
 * ADMIN при чтении видит всё всегда (см. isNotificationVisible).
 *
 * PILOT — только личные события графика (targetUserId), не сертификаты/брони/ТО.
 * MANAGER — операционка без аккаунтов/настроек системы.
 */
export function audienceRolesForKind(
  kind: NotificationKind,
  opts?: { personal?: boolean },
): UserRole[] {
  if (opts?.personal) {
    // Личное: пилот-адресат (+ админ видит через bypass при чтении)
    return ['PILOT']
  }
  switch (kind) {
    case 'staff_shift':
      // Сводка по графику для офиса; пилотам уходит отдельное personal-уведомление
      return ['ADMIN', 'MANAGER']
    case 'booking':
    case 'certificate':
    case 'maintenance':
    case 'waiting_room':
    case 'feedback':
    case 'calendar':
      return ['ADMIN', 'MANAGER']
    case 'system':
      return ['ADMIN']
    default:
      return ['ADMIN', 'MANAGER']
  }
}

/** Пути, недоступные менеджеру — такие уведомления ему не показываем. */
const MANAGER_HIDDEN_PATH_PREFIXES = ['/admin/accounts', '/admin/settings', '/admin/logs']

/** Что пилот может открыть из уведомлений (кроме личных targetUserId). */
const PILOT_ALLOWED_PATH_PREFIXES = ['/admin/staff-schedule', '/admin/pilot-hours']

function notificationPath(href: string): string {
  const raw = String(href || '').split('?')[0] || ''
  return raw.replace(/\/+$/, '') || '/'
}

function pathMatchesPrefix(path: string, prefix: string): boolean {
  return path === prefix || path.startsWith(`${prefix}/`)
}

/** Доп. фильтр по разделу, на который ведёт уведомление (как в меню по ролям). */
export function roleCanSeeNotificationPath(role: UserRole, href: string): boolean {
  if (role === 'ADMIN') return true
  const path = notificationPath(href)
  if (role === 'MANAGER') {
    return !MANAGER_HIDDEN_PATH_PREFIXES.some((p) => pathMatchesPrefix(path, p))
  }
  if (role === 'PILOT') {
    return PILOT_ALLOWED_PATH_PREFIXES.some((p) => pathMatchesPrefix(path, p))
  }
  return false
}

export function pushNotification(store: DataStore, input: NewNotification): AdminNotification {
  const personal = Boolean(input.targetUserId)
  const audienceRoles =
    input.audienceRoles && input.audienceRoles.length > 0
      ? input.audienceRoles
      : audienceRolesForKind(input.kind, { personal })

  const entry: AdminNotification = {
    id: randomUUID(),
    kind: input.kind,
    title: input.title,
    body: input.body,
    href: input.href,
    audienceRoles,
    targetUserId: input.targetUserId,
    readBy: {},
    createdAt: input.createdAt ?? new Date().toISOString(),
    meta: input.meta,
  }
  const list = store.notifications ?? []
  list.unshift(entry)
  store.notifications = list.slice(0, MAX_NOTIFICATIONS)
  // Всем клиентам (фильтр по роли на клиенте). Не завязано на комнату admin —
  // иначе тост легко «теряется», если join не успел.
  try {
    emitAll('notification:created', entry)
  } catch {
    /* socket ещё не поднят (миграции/seed) */
  }
  return entry
}

/**
 * Видимость уведомления для текущего пользователя.
 * - ADMIN — все
 * - с targetUserId — только адресат (админ уже прошёл выше)
 * - иначе — роль из матрицы kind + доступ к разделу href
 */
export function isNotificationVisible(
  n: AdminNotification,
  role: UserRole,
  userId: string,
): boolean {
  if (role === 'ADMIN') return true

  if (n.targetUserId) {
    return n.targetUserId === userId
  }

  const byKind = audienceRolesForKind(n.kind, { personal: false })
  // Старые записи могли содержать лишние роли — kind первичен
  if (!byKind.includes(role)) return false
  if (n.audienceRoles?.length && !n.audienceRoles.includes(role)) {
    // Ещё уже́ сужаем по сохранённому списку, если он есть
    return false
  }

  return roleCanSeeNotificationPath(role, n.href)
}

export function notificationsForUser(store: DataStore, role: UserRole, userId: string) {
  const list = store.notifications ?? []
  return list
    .filter((n) => isNotificationVisible(n, role, userId))
    .map((n) => ({
      ...n,
      read: Boolean(n.readBy[userId]),
    }))
}

/** @deprecated используйте audienceRolesForKind — оставлено для call sites */
export const ROLES_STAFF: UserRole[] = ['ADMIN', 'MANAGER']
export const ROLES_ALL_ADMIN: UserRole[] = ['ADMIN', 'MANAGER', 'PILOT']

/** Ссылка с подсветкой строки: `/admin/certificates?highlight=id` */
export function notifHref(
  path: string,
  highlightId?: string,
  extra?: Record<string, string | undefined>,
) {
  const params = new URLSearchParams()
  if (extra) {
    for (const [key, value] of Object.entries(extra)) {
      if (value) params.set(key, value)
    }
  }
  if (highlightId) params.set('highlight', highlightId)
  const q = params.toString()
  return q ? `${path}?${q}` : path
}
