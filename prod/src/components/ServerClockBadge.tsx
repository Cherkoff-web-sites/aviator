import { useServerClock } from '@/contexts/ServerClockContext'
import { cn } from '@/lib/utils'

function formatClock(d: Date) {
  return d.toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

/** Компактные часы внизу экрана: текущая (эффективная) дата и время. */
export default function ServerClockBadge() {
  const { now, active } = useServerClock()

  return (
    <div
      className={cn(
        'pointer-events-none fixed bottom-3 left-3 z-[240] rounded-md border px-2.5 py-1.5 text-[11px] font-medium tabular-nums shadow-sm backdrop-blur-sm',
        active
          ? 'border-amber-300/80 bg-amber-50/95 text-amber-950 dark:border-amber-700 dark:bg-amber-950/90 dark:text-amber-100'
          : 'border-border/80 bg-background/90 text-muted-foreground',
      )}
      title={active ? 'Демо-время сервера (идёт в реальном темпе)' : 'Время сервера'}
    >
      {active ? <span className="mr-1.5 font-semibold">Демо</span> : null}
      <span>{formatClock(now)}</span>
    </div>
  )
}
