import { useLiveData } from '@/hooks/useLiveData'
import { formatAdminDateTime } from '@/lib/admin-date'
import { apiFetch } from '@/lib/api'
import { cn } from '@/lib/utils'

type LogRow = {
  id: string
  level: 'info' | 'warn' | 'error'
  message: string
  context?: string
  meta?: Record<string, string>
  createdAt: string
}

const LEVEL_CLASS: Record<LogRow['level'], string> = {
  info: 'text-foreground',
  warn: 'text-amber-700 dark:text-amber-400',
  error: 'text-destructive',
}

export default function AdminLogsPage() {
  const { data } = useLiveData(() => apiFetch<LogRow[]>('/api/admin/logs'), [])
  const rows = data ?? []

  return (
    <div className="flex w-full min-w-0 flex-col gap-4">
      <p className="text-sm text-muted-foreground">
        Технические логи для поддержки (брони, сертификаты, ТО, настройки). Записей: {rows.length}.
      </p>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">Записей пока нет.</p>
      ) : (
        <div className="max-h-[min(70vh,640px)] overflow-y-auto rounded-lg border border-border bg-background">
          <ul className="divide-y divide-border font-mono text-xs">
            {rows.map((row) => (
              <li key={row.id} className="px-3 py-2.5">
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                  <span className="text-muted-foreground">{formatAdminDateTime(row.createdAt)}</span>
                  <span className={cn('font-semibold uppercase', LEVEL_CLASS[row.level])}>{row.level}</span>
                  {row.context ? (
                    <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                      {row.context}
                    </span>
                  ) : null}
                </div>
                <p className={cn('mt-1 text-sm font-sans', LEVEL_CLASS[row.level])}>{row.message}</p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
