import * as React from 'react'
import { format, parseISO } from 'date-fns'
import { ru } from 'date-fns/locale'

import AdminFormModal from '@/components/admin/AdminFormModal'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Input } from '@/components/ui/input'
import { BOOKING_TIME_SLOTS } from '@/components/booking/bookingTimeSlots'
import { formatAdminDate } from '@/lib/admin-date'
import { apiFetch } from '@/lib/api'

type SimScope = 'all' | 'boeing-737' | 'mi-2'

export type MaintenanceToForm = {
  date: string
  sim: SimScope
  fullDay: boolean
  startTime: string
  endTime: string
  notes: string
}

export type MaintenanceToEditRow = {
  id: string
  date: string
  simulatorSlug?: string | null
  startTime?: string | null
  endTime?: string | null
  notes: string
}

const END_SLOTS = [...BOOKING_TIME_SLOTS, '19:00', '20:00', '21:00'] as const

const selectClass =
  'mt-1 flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-sm'

export function emptyMaintenanceToForm(date?: string): MaintenanceToForm {
  return {
    date: date || format(new Date(), 'yyyy-MM-dd'),
    sim: 'boeing-737',
    fullDay: false,
    startTime: '12:00',
    endTime: '13:00',
    notes: '',
  }
}

export function formFromMaintenanceRow(row: MaintenanceToEditRow): MaintenanceToForm {
  const fullDay = !row.startTime || !row.endTime
  return {
    date: row.date,
    sim:
      row.simulatorSlug === 'mi-2' || row.simulatorSlug === 'boeing-737'
        ? row.simulatorSlug
        : 'all',
    fullDay,
    startTime: row.startTime || '12:00',
    endTime: row.endTime || '13:00',
    notes: row.notes || '',
  }
}

export function bodyFromMaintenanceToForm(form: MaintenanceToForm) {
  return {
    date: form.date,
    notes: form.notes.trim() || 'Техническое обслуживание',
    simulatorSlug: form.sim === 'all' ? null : form.sim,
    startTime: form.fullDay ? null : form.startTime,
    endTime: form.fullDay ? null : form.endTime,
  }
}

type Props = {
  open: boolean
  onClose: () => void
  /** После успешного создания */
  onCreated?: (row: { id: string }) => void
  /** После успешного сохранения правки */
  onUpdated?: (row: { id: string }) => void
  initialDate?: string
  /** Если задано — режим редактирования */
  editRow?: MaintenanceToEditRow | null
  title?: string
}

/** Красная кнопка «Добавить ТО» → эта модалка (дата / тренажёр / интервал). */
export default function MaintenanceToModal({
  open,
  onClose,
  onCreated,
  onUpdated,
  initialDate,
  editRow = null,
  title,
}: Props) {
  const isEdit = Boolean(editRow?.id)
  const [form, setForm] = React.useState(() => emptyMaintenanceToForm(initialDate))
  const [busy, setBusy] = React.useState(false)

  React.useEffect(() => {
    if (!open) return
    if (editRow) setForm(formFromMaintenanceRow(editRow))
    else setForm(emptyMaintenanceToForm(initialDate))
  }, [open, initialDate, editRow])

  const save = async () => {
    if (!form.fullDay && form.startTime >= form.endTime) return
    setBusy(true)
    try {
      const body = bodyFromMaintenanceToForm(form)
      if (isEdit && editRow) {
        await apiFetch(`/api/admin/maintenance/${editRow.id}`, {
          method: 'PATCH',
          body: JSON.stringify(body),
        })
        onUpdated?.({ id: editRow.id })
      } else {
        const created = await apiFetch<{ id: string }>('/api/admin/maintenance', {
          method: 'POST',
          body: JSON.stringify(body),
        })
        onCreated?.(created)
      }
      onClose()
    } finally {
      setBusy(false)
    }
  }

  return (
    <AdminFormModal
      open={open}
      onClose={() => {
        if (!busy) onClose()
      }}
      title={title ?? (isEdit ? 'Редактировать ТО' : 'Новое ТО')}
      description={
        isEdit
          ? 'Измените дату, тренажёр, интервал или комментарий.'
          : 'Тренажёр + дата + время с/по. Можно закрыть весь день.'
      }
      size="md"
    >
      <div className="flex flex-col gap-4">
        <div className="block text-sm">
          <span className="mb-1 block">Дата</span>
          <p className="mb-2 text-xs text-muted-foreground">
            Выбрано: <span className="font-medium text-foreground">{formatAdminDate(form.date)}</span>
          </p>
          <Calendar
            mode="single"
            locale={ru}
            selected={form.date ? parseISO(form.date) : undefined}
            onSelect={(d) => {
              if (!d) return
              setForm((f) => ({ ...f, date: format(d, 'yyyy-MM-dd') }))
            }}
            className="w-fit max-w-full rounded-lg border"
          />
        </div>

        <label className="block text-sm">
          Тренажёр
          <select
            className={selectClass}
            value={form.sim}
            onChange={(e) => setForm((f) => ({ ...f, sim: e.target.value as SimScope }))}
          >
            <option value="boeing-737">Boeing 737</option>
            <option value="mi-2">Ми-2</option>
            <option value="all">Оба тренажёра</option>
          </select>
        </label>

        <label className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2.5 text-sm">
          <span>
            <span className="font-medium text-foreground">Блокировка интервала (ТО)</span>
            <span className="mt-0.5 block text-xs text-muted-foreground">
              Вкл. — указать время «С»/«По». Выкл. — весь день.
            </span>
          </span>
          <input
            type="checkbox"
            className="size-5 accent-primary"
            checked={!form.fullDay}
            onChange={(e) => setForm((f) => ({ ...f, fullDay: !e.target.checked }))}
            aria-label="Блокировка интервала"
          />
        </label>

        {!form.fullDay ? (
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-sm">
              С
              <select
                className={selectClass}
                value={form.startTime}
                onChange={(e) => setForm((f) => ({ ...f, startTime: e.target.value }))}
              >
                {BOOKING_TIME_SLOTS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              По
              <select
                className={selectClass}
                value={form.endTime}
                onChange={(e) => setForm((f) => ({ ...f, endTime: e.target.value }))}
              >
                {END_SLOTS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </label>
          </div>
        ) : null}

        {!form.fullDay && form.startTime >= form.endTime ? (
          <p className="text-xs text-destructive">Время «По» должно быть позже «С»</p>
        ) : null}

        <p className="text-xs text-muted-foreground">
          {form.fullDay
            ? form.sim === 'all'
              ? 'Закроет дату на всём сайте для обоих тренажёров.'
              : `Закроет весь день только для ${form.sim === 'mi-2' ? 'Ми-2' : 'Boeing 737'}.`
            : `Закроет слоты ${form.startTime}–${form.endTime} на ${
                form.sim === 'all' ? 'обоих тренажёрах' : form.sim === 'mi-2' ? 'Ми-2' : 'Boeing 737'
              }.`}
        </p>

        <label className="block text-sm">
          Комментарий
          <Input
            className="mt-1 h-9"
            value={form.notes}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            placeholder="Например: калибровка штурвала"
          />
        </label>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={busy}>
            Отмена
          </Button>
          <Button
            type="button"
            disabled={busy || (!form.fullDay && form.startTime >= form.endTime)}
            onClick={() => void save()}
          >
            {isEdit ? 'Сохранить' : 'Создать'}
          </Button>
        </div>
      </div>
    </AdminFormModal>
  )
}
