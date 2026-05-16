import * as React from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { ru } from 'date-fns/locale'
import { Calendar } from '@/components/ui/calendar'
import { Button } from '@/components/ui/button'
import { useIsMobile } from '@/hooks/use-mobile'

type WaitingQueueItem = {
  id: string
  /** Готовая строка как на макете */
  line: string
}

const DEMO_QUEUE: WaitingQueueItem[] = [
  {
    id: '1',
    line: 'Боинг, 11.02.2025. Сафонов Никита, +375 (12) 1234567. Буду с сыном. 18:00 мск',
  },
  {
    id: '2',
    line: 'Ми-2, 14.02.2025. Иванов Петр, +375 (29) 9876543. Подарок жене. 15:30 мск',
  },
  {
    id: '3',
    line: 'Боинг, 18.02.2025. Козлова Анна, +375 (44) 5551212. Впервые, нужна консультация. 12:00 мск',
  },
  {
    id: '4',
    line: 'Ми-2 + Боинг, 22.02.2025. Тихомиров Олег, +375 (17) 2223344. Корпоратив. 19:00 мск',
  },
]

export default function AdminWaitingRoomPage() {
  const isMobile = useIsMobile()
  const [month, setMonth] = React.useState(() => new Date(2025, 0, 1))
  const [date, setDate] = React.useState<Date | undefined>(() => new Date(2025, 0, 23))
  const [queue, setQueue] = React.useState<WaitingQueueItem[]>(DEMO_QUEUE)

  const removeItem = (id: string) => {
    setQueue((prev) => prev.filter((item) => item.id !== id))
  }

  return (
    <div className="flex w-full min-w-0 flex-col gap-6">
      <Calendar
        mode="single"
        month={month}
        onMonthChange={setMonth}
        numberOfMonths={isMobile ? 1 : 3}
        selected={date}
        onSelect={setDate}
        locale={ru}
        className="w-fit max-w-full rounded-lg border"
      />

      <div className="flex flex-col gap-4 rounded-lg border bg-background p-4">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-9 w-full shrink-0 gap-2 sm:w-fit"
        >
          <Plus className="size-4 shrink-0" />
          Добавить в очередь
        </Button>

        <ul className="flex max-h-[min(60vh,520px)] flex-col gap-2 overflow-y-auto pr-1">
          {queue.map((item) => (
            <li
              key={item.id}
              className="flex items-start gap-2 rounded-md border border-border/70 bg-muted/50 py-2.5 pl-0 pr-2 shadow-sm"
            >
              <div
                className="mt-0.5 min-h-[2.25rem] w-1 shrink-0 rounded-full bg-foreground/80"
                aria-hidden
              />
              <p className="min-w-0 flex-1 pt-0.5 text-sm leading-snug text-foreground">
                {item.line}
              </p>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-8 shrink-0 text-muted-foreground hover:text-destructive"
                aria-label="Удалить из очереди"
                onClick={() => removeItem(item.id)}
              >
                <Trash2 className="size-4" />
              </Button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
