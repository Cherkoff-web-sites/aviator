import { CheckCheck, MessageSquare } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { useHighlightRow } from '@/hooks/useHighlightRow'
import { useLiveData } from '@/hooks/useLiveData'
import { formatAdminDateTime } from '@/lib/admin-date'
import { apiFetch } from '@/lib/api'
import { cn } from '@/lib/utils'

type FeedbackRow = {
  id: string
  name: string
  phone: string
  message: string
  createdAt: string
  read: boolean
}

type FeedbackPayload = {
  items: FeedbackRow[]
  unread: number
}

function formatWhen(iso: string) {
  return formatAdminDateTime(iso)
}

export default function AdminFeedbackPage() {
  const { data, reload } = useLiveData(
    () => apiFetch<FeedbackPayload>('/api/admin/feedback'),
    [],
  )
  const rows = data?.items ?? []
  const unread = data?.unread ?? 0
  const { rowProps } = useHighlightRow(data !== null)

  const markRead = async (id: string) => {
    await apiFetch(`/api/admin/feedback/${id}/read`, { method: 'POST' })
    void reload()
  }

  const markAll = async () => {
    await apiFetch('/api/admin/feedback/read-all', { method: 'POST' })
    void reload()
  }

  return (
    <div className="flex w-full min-w-0 flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-foreground">Обратная связь</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {unread > 0 ? `Новых заявок: ${unread}` : 'Все заявки прочитаны'}
            {' · '}
            Заявки с виджета на сайте.
          </p>
        </div>
        {unread > 0 ? (
          <Button type="button" variant="outline" size="sm" className="h-9 gap-2" onClick={() => void markAll()}>
            <CheckCheck className="size-4" />
            Прочитать все
          </Button>
        ) : null}
      </div>

      {rows.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-border bg-background px-4 py-16 text-center text-muted-foreground">
          <MessageSquare className="size-8 opacity-40" />
          <p className="text-sm">Пока нет заявок</p>
        </div>
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-background">
          {rows.map((row) => {
            const props = rowProps(row.id)
            return (
              <li
                key={row.id}
                data-highlight-id={props['data-highlight-id']}
                className={cn(
                  'flex flex-col gap-2 px-4 py-4 sm:flex-row sm:items-start sm:justify-between',
                  !row.read && 'bg-primary/[0.04]',
                  props.className,
                )}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-foreground">{row.name}</p>
                    <span className="text-[11px] text-muted-foreground">{formatWhen(row.createdAt)}</span>
                  </div>
                  <a
                    href={`tel:${row.phone.replace(/\s/g, '')}`}
                    className="text-sm text-primary hover:underline"
                  >
                    {row.phone}
                  </a>
                  {row.message ? (
                    <p className="mt-2 text-sm leading-snug text-foreground/90">{row.message}</p>
                  ) : (
                    <p className="mt-2 text-sm italic text-muted-foreground">Без сообщения</p>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-2 sm:flex-col sm:items-end">
                  {!row.read ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8 text-muted-foreground"
                      onClick={() => void markRead(row.id)}
                    >
                      Прочитано
                    </Button>
                  ) : null}
                  {!row.read ? (
                    <span
                      className="size-2.5 shrink-0 rounded-full bg-primary sm:mt-1"
                      title="Новая"
                      aria-label="Новая"
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
  )
}
