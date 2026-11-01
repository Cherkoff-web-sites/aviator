import { format, parseISO } from 'date-fns'
import { ru } from 'date-fns/locale'

import { useHighlightRow } from '@/hooks/useHighlightRow'
import { useLiveData } from '@/hooks/useLiveData'
import { apiFetch } from '@/lib/api'
import { cn } from '@/lib/utils'

type FeedbackRow = {
  id: string
  name: string
  phone: string
  message: string
  createdAt: string
}

function formatWhen(iso: string) {
  try {
    return format(parseISO(iso), 'd MMM yyyy, HH:mm', { locale: ru })
  } catch {
    return iso
  }
}

export default function AdminFeedbackPage() {
  const { data } = useLiveData(() => apiFetch<FeedbackRow[]>('/api/admin/feedback'), [])
  const rows = data ?? []
  const { rowProps } = useHighlightRow(data !== null)

  return (
    <div className="flex w-full min-w-0 flex-col gap-4">
      <p className="text-sm text-muted-foreground">
        Заявки с виджета обратной связи на сайте. Новые заявки также попадают в уведомления.
      </p>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">Пока нет заявок.</p>
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-background">
          {rows.map((row) => {
            const props = rowProps(row.id)
            return (
              <li
                key={row.id}
                data-highlight-id={props['data-highlight-id']}
                className={cn('flex flex-col gap-2 px-4 py-4 sm:flex-row sm:justify-between', props.className)}
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground">{row.name}</p>
                  <a href={`tel:${row.phone.replace(/\s/g, '')}`} className="text-sm text-primary hover:underline">
                    {row.phone}
                  </a>
                  {row.message ? (
                    <p className="mt-2 text-sm leading-snug text-foreground/90">{row.message}</p>
                  ) : (
                    <p className="mt-2 text-sm italic text-muted-foreground">Без сообщения</p>
                  )}
                </div>
                <p className="shrink-0 text-xs text-muted-foreground">{formatWhen(row.createdAt)}</p>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
