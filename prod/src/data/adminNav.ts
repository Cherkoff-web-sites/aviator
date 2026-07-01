/**
 * Иконки меню: файлы из `public/assets/admin/` → URL `/assets/admin/*.svg`.
 * Имена файлов — только латиница и подчёркивания (без дефисов).
 */
const icon = (name: string) => `/assets/admin/${name}.svg` as const

export type AdminNavMainItem = {
  title: string
  to: string
  iconSrc: string
  iconSlot: string
}

export const ADMIN_NAV_MAIN: AdminNavMainItem[] = [
  { title: 'Домашняя страница', to: '/admin', iconSrc: icon('nav_home'), iconSlot: 'nav_home' },
  {
    title: 'График работы персонала',
    to: '/admin/staff-schedule',
    iconSrc: icon('nav_staff_schedule'),
    iconSlot: 'nav_staff_schedule',
  },
  { title: 'Сертификаты', to: '/admin/certificates', iconSrc: icon('nav_certificates'), iconSlot: 'nav_certificates' },
  {
    title: 'Зал ожидания',
    to: '/admin/waiting-room',
    iconSrc: icon('nav_waiting_room'),
    iconSlot: 'nav_waiting_room',
  },
  {
    title: 'Цены и акции',
    to: '/admin/prices-promos',
    iconSrc: icon('nav_prices_promos'),
    iconSlot: 'nav_prices_promos',
  },
  {
    title: 'Настройка графика работы',
    to: '/admin/schedule-settings',
    iconSrc: icon('nav_schedule_settings'),
    iconSlot: 'nav_schedule_settings',
  },
  {
    title: 'Управление аккаунтами',
    to: '/admin/accounts',
    iconSrc: icon('nav_accounts'),
    iconSlot: 'nav_accounts',
  },
  { title: 'Аналитика', to: '/admin/analytics', iconSrc: icon('nav_analytics'), iconSlot: 'nav_analytics' },
  {
    title: 'Техническое обслуживание',
    to: '/admin/maintenance',
    iconSrc: icon('nav_maintenance'),
    iconSlot: 'nav_maintenance',
  },
]

export const ADMIN_NAV_SETTINGS_ICON = icon('nav_settings')
