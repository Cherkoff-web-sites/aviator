import type { UserRole } from '@/lib/api'
import { ADMIN_NAV_MAIN, ADMIN_NAV_SETTINGS_ICON } from '@/data/adminNav'

const PILOT_HIDDEN = new Set([
  '/admin/certificates',
  '/admin/waiting-room',
  '/admin/prices-promos',
  '/admin/schedule-settings',
  '/admin/accounts',
  '/admin/analytics',
  '/admin/maintenance',
  '/admin/settings',
])

const MANAGER_HIDDEN = new Set(['/admin/accounts', '/admin/settings'])

export function navItemsForRole(role: UserRole) {
  const hidden = role === 'PILOT' ? PILOT_HIDDEN : role === 'MANAGER' ? MANAGER_HIDDEN : new Set<string>()
  return ADMIN_NAV_MAIN.filter((item) => !hidden.has(item.to))
}

export function settingsNavForRole(role: UserRole) {
  if (role !== 'ADMIN') return []
  return [
    {
      title: 'Настройки',
      url: '/admin/settings',
      iconSrc: ADMIN_NAV_SETTINGS_ICON,
      iconSlot: 'nav_settings',
    },
  ]
}

export function canEditBookings(role: UserRole) {
  return role === 'ADMIN' || role === 'MANAGER'
}

export function canEditStaffShift(role: UserRole, shiftUserId: string, currentUserId: string) {
  if (role === 'ADMIN' || role === 'MANAGER') return true
  if (role === 'PILOT') return shiftUserId === currentUserId
  return false
}

const ALL_HIDDEN = new Set([...PILOT_HIDDEN, ...MANAGER_HIDDEN, '/admin/login'])

export function canAccessRoute(role: UserRole, pathname: string) {
  const hidden = role === 'PILOT' ? PILOT_HIDDEN : role === 'MANAGER' ? MANAGER_HIDDEN : new Set<string>()
  if (pathname.startsWith('/admin/settings') && role !== 'ADMIN') return false
  return !hidden.has(pathname) && !ALL_HIDDEN.has(pathname)
}
