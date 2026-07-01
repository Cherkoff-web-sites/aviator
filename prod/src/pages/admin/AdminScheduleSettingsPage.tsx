import * as React from 'react'
import { MoreVertical, Plus } from 'lucide-react'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import { Calendar } from '@/components/ui/calendar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useIsMobile } from '@/hooks/use-mobile'
import { useLiveData } from '@/hooks/useLiveData'
import { apiFetch } from '@/lib/api'
import { useAdminAuth } from '@/contexts/AdminAuthContext'
import { canEditBookings } from '@/lib/admin-access'

type WorkHour = { id: string; line: string }

export default function AdminScheduleSettingsPage() {
  const isMobile = useIsMobile()
  const [month, setMonth] = React.useState(() => new Date())
  const [date, setDate] = React.useState<Date | undefined>(() => new Date())
  const [newLine, setNewLine] = React.useState('')
  const { session } = useAdminAuth()
  const canEdit = session ? canEditBookings(session.role) : false

  const { data, reload } = useLiveData(
    () => apiFetch<WorkHour[]>('/api/admin/work-hours'),
    [],
  )
  const workHours = data ?? []

  const toggleHoliday = async () => {
    if (!date || !canEdit) return
    const key = format(date, 'yyyy-MM-dd')
    await apiFetch('/api/admin/calendar/toggle-holidays', {
      method: 'POST',
      body: JSON.stringify({ dates: [key] }),
    })
  }

  const toggleBlocked = async () => {
    if (!date || !canEdit) return
    const key = format(date, 'yyyy-MM-dd')
    await apiFetch('/api/admin/calendar/toggle-blocked', {
      method: 'POST',
      body: JSON.stringify({ dates: [key] }),
    })
  }

  const addWorkHour = async () => {
    if (!newLine.trim() || !canEdit) return
    await apiFetch('/api/admin/work-hours', {
      method: 'POST',
      body: JSON.stringify({ line: newLine.trim() }),
    })
    setNewLine('')
    void reload()
  }

  const removeWorkHour = async (id: string) => {
    await apiFetch(`/api/admin/work-hours/${id}`, { method: 'DELETE' })
    void reload()
  }

  return (
    <div className="flex w-full min-w-0 flex-col gap-6">
      {canEdit ? (
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-9 w-full shrink-0 gap-2 sm:w-fit"
            onClick={() => void toggleHoliday()}
          >
            <Plus className="size-4 shrink-0" />
            Переключить выходной
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-9 w-full shrink-0 gap-2 sm:w-fit"
            onClick={() => void toggleBlocked()}
          >
            <Plus className="size-4 shrink-0" />
            Переключить блокировку даты
          </Button>
        </div>
      ) : null}

      <div className="w-fit max-w-full [&_.rdp-weekday:nth-child(6)]:text-destructive [&_.rdp-weekday:nth-child(7)]:text-destructive">
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
      </div>

      <div className="flex flex-col gap-4 rounded-lg border bg-background p-4">
        {canEdit ? (
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              value={newLine}
              onChange={(e) => setNewLine(e.target.value)}
              placeholder="Новая строка времени работы"
              className="h-10"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-10 gap-2"
              onClick={() => void addWorkHour()}
            >
              <Plus className="size-4 shrink-0" />
              Добавить время работы
            </Button>
          </div>
        ) : null}

        <ul className="flex max-h-[min(60vh,520px)] flex-col gap-2 overflow-y-auto pr-1">
          {workHours.map((item) => (
            <li
              key={item.id}
              className="flex items-start gap-2 rounded-md border border-border/70 bg-muted/50 py-2.5 pl-0 pr-2 shadow-sm"
            >
              <div className="mt-0.5 min-h-[2.25rem] w-1 shrink-0 rounded-full bg-foreground/80" aria-hidden />
              <p className="min-w-0 flex-1 pt-0.5 text-sm leading-snug text-foreground">{item.line}</p>
              {canEdit ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-8 shrink-0 text-muted-foreground"
                      aria-label="Действия со записью"
                    >
                      <MoreVertical className="size-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-44">
                    <DropdownMenuItem
                      className="text-destructive focus:bg-destructive/10 focus:text-destructive"
                      onClick={() => void removeWorkHour(item.id)}
                    >
                      Удалить
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : null}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
