import { randomUUID } from 'node:crypto'
import type { AdminNotification, DataStore, NotificationKind, UserRole } from '../types.js'

const MAX_NOTIFICATIONS = 200

export type NewNotification = {
  kind: NotificationKind
  title: string
  body: string
  href: string
  audienceRoles: UserRole[]
  targetUserId?: string
  meta?: Record<string, string>
  createdAt?: string
}

export function pushNotification(store: DataStore, input: NewNotification): AdminNotification {
  const entry: AdminNotification = {
    id: randomUUID(),
    kind: input.kind,
    title: input.title,
    body: input.body,
    href: input.href,
    audienceRoles: input.audienceRoles,
    targetUserId: input.targetUserId,
    readBy: {},
    createdAt: input.createdAt ?? new Date().toISOString(),
    meta: input.meta,
  }
  const list = store.notifications ?? []
  list.unshift(entry)
  store.notifications = list.slice(0, MAX_NOTIFICATIONS)
  return entry
}

/** Видимость уведомления для текущего пользователя. */
export function isNotificationVisible(
  n: AdminNotification,
  role: UserRole,
  userId: string,
): boolean {
  if (n.targetUserId) return n.targetUserId === userId
  return n.audienceRoles.includes(role)
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
