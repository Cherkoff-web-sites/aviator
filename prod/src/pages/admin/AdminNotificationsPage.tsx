import * as React from 'react'
import { format, parseISO } from 'date-fns'
import { ru } from 'date-fns/locale'
import { Bell, CheckCheck } from 'lucide-react'
import { Link } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import { useLiveData } from '@/hooks/useLiveData'
import { ADMIN_NAV_MAIN, ADMIN_NAV_SETTINGS_ICON } from '@/data/adminNav'
import { apiFetch } from '@/lib/api'
import { cn } from '@/lib/utils'

export type ApiNotification = {
  id: string
  kind: string
  title: string
  body: string
  href: string
  read: boolean
  createdAt: string
}

type NotificationsPayload = {
  items: ApiNotification[]
  unread: number
}

const KIND_META: Record<string, { label: string; iconSrc: string }> = {
  booking: { label: 'Запись', iconSrc: '/assets/admin/nav_home.svg' },
  certificate: { label: 'Сертификат', iconSrc: '/assets/admin/nav_certificates.svg' },
  maintenance: { label: 'ТО', iconSrc: '/assets/admin/nav_maintenance.svg' },
  staff_shift: { label: 'График', iconSrc: '/assets/admin/nav_staff_schedule.svg' },
  waiting_room: { label: 'Ожидание', iconSrc: '/assets/admin/nav_waiting_room.svg' },
  feedback: { label: 'Обратная связь', iconSrc: '/assets/admin/nav_home.svg' },
  calendar: { label: 'Календарь', iconSrc: '/assets/admin/nav_schedule_settings.svg' },
  system: { label: 'Система', iconSrc: ADMIN_NAV_SETTINGS_ICON },
}

function metaForNotification(n: ApiNotification) {
  const byKind = KIND_META[n.kind]
  const path = n.href.split('?')[0]
  const nav = ADMIN_NAV_MAIN.find(
    (item) => item.to === path || (item.to !== '/admin' && path.startsWith(item.to)),
  )
  return {
    label: byKind?.label ?? nav?.title ?? n.kind,
    iconSrc: byKind?.iconSrc ?? nav?.iconSrc ?? '/assets/admin/nav_home.svg',
  }
}

function formatWhen(iso: string) {
  try {
    return format(parseISO(iso), "d MMM, HH:mm", { locale: ru })
  } catch {
    return iso
  }
}

export default function AdminNotificationsPage() {
  const { data, reload } = useLiveData(
    () => apiFetch<NotificationsPayload>('/api/admin/notifications'),
    [],
  )
  const items = data?.items ?? []
  const unread = data?.unread ?? 0

  const markRead = async (id: string) => {
    await apiFetch(`/api/admin/notifications/${id}/read`, { method: 'POST' })
    void reload()
  }

  const markAll = async () => {
    await apiFetch('/api/admin/notifications/read-all', { method: 'POST' })
    void reload()
  }

  return (
    <div className="flex w-full min-w-0 flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-foreground">Уведомления</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {unread > 0 ? `Непрочитанных: ${unread}` : 'Все уведомления прочитаны'}
          </p>
        </div>
        {unread > 0 ? (
          <Button type="button" variant="outline" size="sm" className="h-9 gap-2" onClick={() => void markAll()}>
            <CheckCheck className="size-4" />
            Прочитать все
          </Button>
        ) : null}
      </div>

      <div className="overflow-hidden rounded-lg border border-border bg-background">
        {items.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-4 py-16 text-center text-muted-foreground">
            <Bell className="size-8 opacity-40" />
            <p className="text-sm">Пока нет уведомлений</p>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {items.map((n) => {
              const meta = metaForNotification(n)
              return (
                <li
                  key={n.id}
                  className={cn(
                    'flex flex-col gap-2 px-4 py-3 transition-colors sm:flex-row sm:items-start sm:justify-between',
                    !n.read && 'bg-primary/[0.04]',
                  )}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center gap-1.5 rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                        <img
                          src={meta.iconSrc}
                          alt=""
                          className="size-3.5 shrink-0 opacity-80"
                          width={14}
                          height={14}
                        />
                        {meta.label}
                      </span>
                      <span className="text-[11px] text-muted-foreground">{formatWhen(n.createdAt)}</span>
                    </div>
                    <p className="mt-1 text-sm font-medium text-foreground">{n.title}</p>
                    <p className="mt-0.5 text-sm leading-snug text-muted-foreground">{n.body}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2 sm:flex-col sm:items-end">
                    <div className="flex flex-wrap gap-2 sm:flex-col sm:items-end">
                      <Button type="button" variant="outline" size="sm" className="h-8" asChild>
                        <Link
                          to={n.href}
                          onClick={() => {
                            if (!n.read) void markRead(n.id)
                          }}
                        >
                          Открыть
                        </Link>
                      </Button>
                      {!n.read ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-8 text-muted-foreground"
                          onClick={() => void markRead(n.id)}
                        >
                          Прочитано
                        </Button>
                      ) : null}
                    </div>
                    {!n.read ? (
                      <span
                        className="size-2.5 shrink-0 rounded-full bg-primary sm:mt-1"
                        title="Непрочитано"
                        aria-label="Непрочитано"
                      />
                    ) : (
                      <span className="size-2.5 shrink-0" aria-hidden />
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
