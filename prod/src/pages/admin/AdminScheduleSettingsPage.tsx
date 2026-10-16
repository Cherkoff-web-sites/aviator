import * as React from 'react'
import { MoreVertical, Plus, Trash2 } from 'lucide-react'
import { format, isWeekend } from 'date-fns'
import { ru } from 'date-fns/locale'
import ConfirmDialog from '@/components/admin/ConfirmDialog'
import { Calendar } from '@/components/ui/calendar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { BOOKING_TIME_SLOTS } from '@/components/booking/bookingTimeSlots'
import { useIsMobile } from '@/hooks/use-mobile'
import { useLiveData } from '@/hooks/useLiveData'
import { apiFetch } from '@/lib/api'
import { useAdminAuth } from '@/contexts/AdminAuthContext'
import { useAdminUndo } from '@/contexts/AdminUndoContext'
import { canEditBookings } from '@/lib/admin-access'
import { cn } from '@/lib/utils'

type WorkHour = { id: string; line: string; createdAt?: string }
type DayStatus = 'OPEN' | 'HOLIDAY' | 'BLOCKED'
type MaintenanceRow = {
  id: string
  date: string
  simulatorSlug?: string | null
  startTime?: string | null
  endTime?: string | null
  notes: string
  createdAt?: string
}

const TIME_OPTIONS = [...BOOKING_TIME_SLOTS, '14:00', '19:00', '21:00'] as const

const selectClass =
  'mt-1 flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-sm'

function statusLabel(status: DayStatus): string {
  if (status === 'HOLIDAY') return 'Выходной / праздничный (красный)'
  if (status === 'BLOCKED') return 'Заблокирован (серый) — бронь невозможна'
  return 'Обычный рабочий день'
}

export default function AdminScheduleSettingsPage() {
  const isMobile = useIsMobile()
  const [month, setMonth] = React.useState(() => new Date())
  const [date, setDate] = React.useState<Date | undefined>(() => new Date())
  const [newLine, setNewLine] = React.useState('')
  const [deleteTarget, setDeleteTarget] = React.useState<WorkHour | null>(null)
  const [deleteInterval, setDeleteInterval] = React.useState<MaintenanceRow | null>(null)
  const [busy, setBusy] = React.useState(false)
  const todayKey = format(new Date(), 'yyyy-MM-dd')
  const [rangeForm, setRangeForm] = React.useState({
    from: todayKey,
    to: todayKey,
    startTime: '12:00',
    endTime: '14:00',
    notes: 'ТО / блокировка интервала',
  })
  const { session } = useAdminAuth()
  const { pushUndo } = useAdminUndo()
  const canEdit = session ? canEditBookings(session.role) : false

  const { data, reload } = useLiveData(
    () => apiFetch<WorkHour[]>('/api/admin/work-hours'),
    [],
  )
  const workHours = data ?? []

  const { data: calPayload, reload: reloadCal } = useLiveData(
    () =>
      apiFetch<{ days: { date: string; status: DayStatus }[]; range: { from: string; to: string } }>(
        '/api/admin/calendar',
      ),
    [],
  )
  const calDays = calPayload?.days ?? []
  const statusByDate = React.useMemo(() => {
    const map = new Map<string, DayStatus>()
    for (const d of calDays) map.set(d.date, d.status)
    return map
  }, [calDays])

  const holidayKeys = React.useMemo(
    () => new Set(calDays.filter((d) => d.status === 'HOLIDAY').map((d) => d.date)),
    [calDays],
  )
  const blockedKeys = React.useMemo(
    () => new Set(calDays.filter((d) => d.status === 'BLOCKED').map((d) => d.date)),
    [calDays],
  )

  const { data: maintPayload, reload: reloadMaint } = useLiveData(
    () => apiFetch<{ items: MaintenanceRow[] }>('/api/admin/maintenance'),
    [],
  )
  const intervalBlocks = React.useMemo(() => {
    const today = format(new Date(), 'yyyy-MM-dd')
    return (maintPayload?.items ?? [])
      .filter(
        (m) =>
          !m.simulatorSlug &&
          m.startTime &&
          m.endTime &&
          m.date >= today,
      )
      .sort((a, b) => a.date.localeCompare(b.date) || String(a.startTime).localeCompare(String(b.startTime)))
  }, [maintPayload])

  const selectedKey = date ? format(date, 'yyyy-MM-dd') : null
  const selectedStatus: DayStatus = selectedKey
    ? (statusByDate.get(selectedKey) ?? (date && isWeekend(date) ? 'HOLIDAY' : 'OPEN'))
    : 'OPEN'

  const selectedTitle = date
    ? format(date, "d MMMM yyyy 'г.' (EEEE)", { locale: ru })
    : 'День не выбран'

  const refreshAfterToggle = () => {
    void reloadCal()
  }

  const toggleHoliday = async () => {
    if (!date || !canEdit || !selectedKey) return
    const wasHoliday = selectedStatus === 'HOLIDAY'
    await apiFetch('/api/admin/calendar/toggle-holidays', {
      method: 'POST',
      body: JSON.stringify({ dates: [selectedKey] }),
    })
    pushUndo({
      label: wasHoliday
        ? `Вернуть выходной (${selectedKey})`
        : `Снять выходной (${selectedKey})`,
      run: async () => {
        await apiFetch('/api/admin/calendar/toggle-holidays', {
          method: 'POST',
          body: JSON.stringify({ dates: [selectedKey] }),
        })
        refreshAfterToggle()
      },
    })
    refreshAfterToggle()
  }

  const toggleBlocked = async () => {
    if (!date || !canEdit || !selectedKey) return
    const wasBlocked = selectedStatus === 'BLOCKED'
    await apiFetch('/api/admin/calendar/toggle-blocked', {
      method: 'POST',
      body: JSON.stringify({ dates: [selectedKey] }),
    })
    pushUndo({
      label: wasBlocked
        ? `Снова заблокировать (${selectedKey})`
        : `Снять блокировку (${selectedKey})`,
      run: async () => {
        await apiFetch('/api/admin/calendar/toggle-blocked', {
          method: 'POST',
          body: JSON.stringify({ dates: [selectedKey] }),
        })
        refreshAfterToggle()
      },
    })
    refreshAfterToggle()
  }

  const applyInterval = async () => {
    if (!canEdit) return
    if (rangeForm.from > rangeForm.to || rangeForm.startTime >= rangeForm.endTime) return
    setBusy(true)
    try {
      const result = await apiFetch<{ items: MaintenanceRow[] }>('/api/admin/maintenance/range', {
        method: 'POST',
        body: JSON.stringify(rangeForm),
      })
      const ids = result.items.map((i) => i.id)
      pushUndo({
        label: `Отменить блокировку интервала (${ids.length} дн.)`,
        run: async () => {
          for (const id of ids) {
            await apiFetch(`/api/admin/maintenance/${id}?archiveSection=schedule_settings`, {
              method: 'DELETE',
            })
          }
          void reloadMaint()
        },
      })
      void reloadMaint()
    } finally {
      setBusy(false)
    }
  }

  const confirmDeleteInterval = async () => {
    if (!deleteInterval || !canEdit) return
    setBusy(true)
    try {
      const snapshot = deleteInterval
      await apiFetch(
        `/api/admin/maintenance/${snapshot.id}?archiveSection=schedule_settings`,
        { method: 'DELETE' },
      )
      pushUndo({
        label: 'Отменить удаление интервала',
        run: async () => {
          await apiFetch('/api/admin/maintenance', {
            method: 'POST',
            body: JSON.stringify({
              id: snapshot.id,
              date: snapshot.date,
              startTime: snapshot.startTime,
              endTime: snapshot.endTime,
              notes: snapshot.notes,
              createdAt: snapshot.createdAt,
              archiveSection: 'schedule_settings',
            }),
          })
          void reloadMaint()
        },
      })
      setDeleteInterval(null)
      void reloadMaint()
    } finally {
      setBusy(false)
    }
  }

  const addWorkHour = async () => {
    if (!newLine.trim() || !canEdit) return
    const created = await apiFetch<WorkHour>('/api/admin/work-hours', {
      method: 'POST',
      body: JSON.stringify({ line: newLine.trim() }),
    })
    pushUndo({
      label: 'Отменить добавление времени работы',
      run: async () => {
        await apiFetch(`/api/admin/work-hours/${created.id}`, { method: 'DELETE' })
        void reload()
      },
    })
    setNewLine('')
    void reload()
  }

  const confirmDelete = async () => {
    if (!deleteTarget || !canEdit) return
    setBusy(true)
    try {
      const snapshot = deleteTarget
      await apiFetch(`/api/admin/work-hours/${snapshot.id}`, { method: 'DELETE' })
      pushUndo({
        label: 'Отменить удаление времени работы',
        run: async () => {
          await apiFetch('/api/admin/work-hours', {
            method: 'POST',
            body: JSON.stringify({
              id: snapshot.id,
              line: snapshot.line,
              createdAt: snapshot.createdAt,
            }),
          })
          void reload()
        },
      })
      setDeleteTarget(null)
      void reload()
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex w-full min-w-0 flex-col gap-6">
      <p className="text-sm text-muted-foreground">
        Выходной, блокировка даты и интервалы действуют на <strong>оба тренажёра</strong> (Boeing 737
        и Ми-2).
      </p>

      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm bg-destructive/80" />
          Выходной / праздник
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm bg-muted-foreground/50 line-through" />
          Блокировка даты (бронь невозможна)
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm border border-border bg-background" />
          Обычный день
        </span>
      </div>

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
          modifiers={{
            holiday: (d) => holidayKeys.has(format(d, 'yyyy-MM-dd')),
            blocked: (d) => blockedKeys.has(format(d, 'yyyy-MM-dd')),
          }}
          modifiersClassNames={{
            holiday: '[&_button]:font-semibold [&_button]:text-destructive',
            blocked:
              '[&_button]:bg-muted/80 [&_button]:text-muted-foreground [&_button]:line-through',
          }}
        />
      </div>

      <div className="rounded-lg border border-border bg-background p-4">
        <p className="text-sm font-medium capitalize text-foreground">{selectedTitle}</p>
        <p
          className={cn(
            'mt-1 text-sm',
            selectedStatus === 'HOLIDAY' && 'font-medium text-destructive',
            selectedStatus === 'BLOCKED' && 'font-medium text-muted-foreground',
            selectedStatus === 'OPEN' && 'text-muted-foreground',
          )}
        >
          Сейчас: {statusLabel(selectedStatus)}
        </p>
        {canEdit && date ? (
          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <Button
              type="button"
              variant={selectedStatus === 'HOLIDAY' ? 'secondary' : 'outline'}
              size="sm"
              className="h-9"
              onClick={() => void toggleHoliday()}
              disabled={selectedStatus === 'BLOCKED'}
            >
              {selectedStatus === 'HOLIDAY'
                ? 'Снять выходной / праздничный день'
                : 'Назначить выходной / Праздничный день'}
            </Button>
            <Button
              type="button"
              variant={selectedStatus === 'BLOCKED' ? 'secondary' : 'outline'}
              size="sm"
              className="h-9"
              onClick={() => void toggleBlocked()}
            >
              {selectedStatus === 'BLOCKED' ? 'Снять блокировку даты' : 'Блокировка даты'}
            </Button>
          </div>
        ) : null}
        <p className="mt-2 text-xs text-muted-foreground">
          Выходной — день красный, бронь возможна, без «Счастливых часов». Блокировка даты — день
          серый, забронировать нельзя (оба тренажёра). Повторное нажатие снимает статус.
        </p>
      </div>

      <div className="rounded-lg border border-border bg-background p-4">
        <h3 className="text-sm font-semibold text-foreground">Блокировка интервала (ТО)</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Например 5 дней подряд с 12:00 до 14:00 — в это время запись на оба тренажёра недоступна.
          Остальная часть дня остаётся открытой.
        </p>
        {canEdit ? (
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <label className="text-sm">
              С даты
              <Input
                type="date"
                className="mt-1 h-9"
                value={rangeForm.from}
                onChange={(e) => setRangeForm((f) => ({ ...f, from: e.target.value }))}
              />
            </label>
            <label className="text-sm">
              По дату
              <Input
                type="date"
                className="mt-1 h-9"
                value={rangeForm.to}
                onChange={(e) => setRangeForm((f) => ({ ...f, to: e.target.value }))}
              />
            </label>
            <label className="text-sm sm:col-span-2 lg:col-span-1">
              Комментарий
              <Input
                className="mt-1 h-9"
                value={rangeForm.notes}
                onChange={(e) => setRangeForm((f) => ({ ...f, notes: e.target.value }))}
              />
            </label>
            <label className="text-sm">
              Время с
              <select
                className={selectClass}
                value={rangeForm.startTime}
                onChange={(e) => setRangeForm((f) => ({ ...f, startTime: e.target.value }))}
              >
                {TIME_OPTIONS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              Время до
              <select
                className={selectClass}
                value={rangeForm.endTime}
                onChange={(e) => setRangeForm((f) => ({ ...f, endTime: e.target.value }))}
              >
                {TIME_OPTIONS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </label>
            <div className="flex items-end">
              <Button
                type="button"
                size="sm"
                className="h-9 w-full"
                disabled={
                  busy ||
                  rangeForm.from > rangeForm.to ||
                  rangeForm.startTime >= rangeForm.endTime
                }
                onClick={() => void applyInterval()}
              >
                Заблокировать интервал
              </Button>
            </div>
          </div>
        ) : null}

        <ul className="mt-4 flex max-h-[240px] flex-col gap-2 overflow-y-auto">
          {intervalBlocks.length === 0 ? (
            <li className="text-sm text-muted-foreground">Нет предстоящих интервалов</li>
          ) : (
            intervalBlocks.map((m) => (
              <li
                key={m.id}
                className="flex items-start gap-2 rounded-md border border-border/70 bg-muted/40 px-3 py-2"
              >
                <div className="min-w-0 flex-1 text-sm">
                  <p className="font-medium text-foreground">
                    {m.date} · {m.startTime}–{m.endTime}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Оба тренажёра{m.notes ? ` · ${m.notes}` : ''}
                  </p>
                </div>
                {canEdit ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-8 shrink-0 text-muted-foreground hover:text-destructive"
                    aria-label="Удалить интервал"
                    onClick={() => setDeleteInterval(m)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                ) : null}
              </li>
            ))
          )}
        </ul>
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
                      onClick={() => setDeleteTarget(item)}
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

      <ConfirmDialog
        open={!!deleteTarget}
        title="Удалить время работы?"
        description={
          deleteTarget
            ? `«${deleteTarget.line}» будет удалено. Действие можно отменить вверху страницы.`
            : undefined
        }
        confirmLabel="Удалить"
        destructive
        busy={busy}
        onConfirm={() => void confirmDelete()}
        onCancel={() => setDeleteTarget(null)}
      />

      <ConfirmDialog
        open={!!deleteInterval}
        title="Удалить блокировку интервала?"
        description={
          deleteInterval
            ? `${deleteInterval.date} · ${deleteInterval.startTime}–${deleteInterval.endTime}. Действие можно отменить.`
            : undefined
        }
        confirmLabel="Удалить"
        destructive
        busy={busy}
        onConfirm={() => void confirmDeleteInterval()}
        onCancel={() => setDeleteInterval(null)}
      />
    </div>
  )
}
