import type { UserRole } from '@/lib/api'
import {
  ADMIN_NAV_FEEDBACK,
  ADMIN_NAV_MAIN,
  ADMIN_NAV_SETTINGS_ICON,
} from '@/data/adminNav'

const PILOT_HIDDEN = new Set([
  '/admin/certificates',
  '/admin/waiting-room',
  '/admin/prices-promos',
  '/admin/schedule-settings',
  '/admin/accounts',
  '/admin/analytics',
  '/admin/maintenance',
  '/admin/settings',
  '/admin/feedback',
])

const MANAGER_HIDDEN = new Set(['/admin/accounts', '/admin/settings'])

export function navItemsForRole(role: UserRole) {
  const hidden = role === 'PILOT' ? PILOT_HIDDEN : role === 'MANAGER' ? MANAGER_HIDDEN : new Set<string>()
  return ADMIN_NAV_MAIN.filter((item) => !hidden.has(item.to)).map((item) =>
    role === 'PILOT' && item.to === '/admin/staff-schedule'
      ? { ...item, title: 'Рабочий график' }
      : item,
  )
}

export type SecondaryNavItem = {
  title: string
  url: string
  iconSrc: string
  iconSlot: string
  badgeKey?: 'feedback'
}

export function settingsNavForRole(role: UserRole): SecondaryNavItem[] {
  const items: SecondaryNavItem[] = []
  if (role === 'ADMIN' || role === 'MANAGER') {
    items.push({ ...ADMIN_NAV_FEEDBACK, badgeKey: 'feedback' })
  }
  if (role === 'ADMIN') {
    items.push({
      title: 'Настройки',
      url: '/admin/settings',
      iconSrc: ADMIN_NAV_SETTINGS_ICON,
      iconSlot: 'nav_settings',
    })
  }
  return items
}

export function canViewTechnicalLogs(role: UserRole | null | undefined) {
  return role === 'ADMIN'
}

export function canEditBookings(role: UserRole) {
  return role === 'ADMIN' || role === 'MANAGER'
}

export function canEditStaffShift(role: UserRole, shiftUserId: string, currentUserId: string) {
  if (role === 'ADMIN' || role === 'MANAGER') return true
  if (role === 'PILOT') return shiftUserId === currentUserId
  return false
}

export function canAccessRoute(role: UserRole, pathname: string) {
  if (pathname === '/admin' || pathname === '/admin/') return true
  if (pathname === '/admin/login') return false

  const hidden = role === 'PILOT' ? PILOT_HIDDEN : role === 'MANAGER' ? MANAGER_HIDDEN : new Set<string>()
  if (pathname.startsWith('/admin/settings') && role !== 'ADMIN') return false
  if (pathname.startsWith('/admin/logs') && role !== 'ADMIN') return false
  if (pathname.startsWith('/admin/feedback') && role === 'PILOT') return false
  /** Список уведомлений фильтруется на сервере по роли (см. site/server notifications). */
  if (pathname.startsWith('/admin/notifications')) return true
  /** Архив — только админ и менеджер (секции фильтруются по доступу к страницам). */
  if (pathname.startsWith('/admin/archive')) {
    return role === 'ADMIN' || role === 'MANAGER'
  }
  return !hidden.has(pathname)
}

export function canViewArchive(role: UserRole | null | undefined) {
  return role === 'ADMIN' || role === 'MANAGER'
}
