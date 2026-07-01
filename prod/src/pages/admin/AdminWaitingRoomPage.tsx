import * as React from 'react'
import { format } from 'date-fns'
import { Plus, Trash2 } from 'lucide-react'
import { ru } from 'date-fns/locale'
import { Calendar } from '@/components/ui/calendar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useLiveData } from '@/hooks/useLiveData'
import { apiFetch, type ApiWaiting } from '@/lib/api'
import { useAdminAuth } from '@/contexts/AdminAuthContext'
import { canEditBookings } from '@/lib/admin-access'

export default function AdminWaitingRoomPage() {
  const [month, setMonth] = React.useState(() => new Date())
  const [date, setDate] = React.useState<Date | undefined>(() => new Date())
  const [line, setLine] = React.useState('')
  const { session } = useAdminAuth()
  const canEdit = session ? canEditBookings(session.role) : false
  const dateKey = date ? format(date, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd')

  const { data, reload } = useLiveData(
    () => apiFetch<ApiWaiting[]>(`/api/admin/waiting-room?date=${dateKey}`),
    [dateKey],
  )
  const queue = data ?? []

  const addItem = async () => {
    if (!line.trim() || !canEdit) return
    await apiFetch('/api/admin/waiting-room', {
      method: 'POST',
      body: JSON.stringify({ date: dateKey, line: line.trim() }),
    })
    setLine('')
    void reload()
  }

  const removeItem = async (id: string) => {
    await apiFetch(`/api/admin/waiting-room/${id}`, { method: 'DELETE' })
    void reload()
  }

  return (
    <div className="flex w-full min-w-0 flex-col gap-6">
      <Calendar
        mode="single"
        month={month}
        onMonthChange={setMonth}
        numberOfMonths={1}
        selected={date}
        onSelect={setDate}
        locale={ru}
        className="w-fit max-w-full rounded-lg border"
      />

      <div className="flex flex-col gap-4 rounded-lg border bg-background p-4">
        {canEdit ? (
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              value={line}
              onChange={(e) => setLine(e.target.value)}
              placeholder="Текст заметки для очереди"
              className="h-10"
            />
            <Button type="button" variant="outline" size="sm" className="h-10 gap-2" onClick={() => void addItem()}>
              <Plus className="size-4" />
              Добавить в очередь
            </Button>
          </div>
        ) : null}

        <ul className="flex max-h-[min(60vh,520px)] flex-col gap-2 overflow-y-auto pr-1">
          {queue.map((item) => (
            <li
              key={item.id}
              className="flex items-start gap-2 rounded-md border border-border/70 bg-muted/50 py-2.5 pl-0 pr-2 shadow-sm"
            >
              <div className="mt-0.5 min-h-[2.25rem] w-1 shrink-0 rounded-full bg-foreground/80" aria-hidden />
              <p className="min-w-0 flex-1 pt-0.5 text-sm leading-snug text-foreground">{item.line}</p>
              {canEdit ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-8 shrink-0 text-muted-foreground hover:text-destructive"
                  aria-label="Удалить"
                  onClick={() => void removeItem(item.id)}
                >
                  <Trash2 className="size-4" />
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
