import * as React from 'react'
import { format } from 'date-fns'
import { Plus, Trash2 } from 'lucide-react'

import AdminFormModal from '@/components/admin/AdminFormModal'
import ConfirmDialog from '@/components/admin/ConfirmDialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAdminAuth } from '@/contexts/AdminAuthContext'
import { useAdminUndo } from '@/contexts/AdminUndoContext'
import { useHighlightRow } from '@/hooks/useHighlightRow'
import { useLiveData } from '@/hooks/useLiveData'
import { apiFetch } from '@/lib/api'
import { canEditBookings } from '@/lib/admin-access'
import { formatAdminDate } from '@/lib/admin-date'
import { SiteDateInput } from '@/components/ui/site-date-input'
import { BOOKING_TIME_SLOTS } from '@/components/booking/bookingTimeSlots'
import { cn } from '@/lib/utils'

const PENCIL = '/assets/admin/certificates_pencil_icon.svg'

type MaintenanceRow = {
  id: string
  date: string
  simulatorSlug?: string | null
  startTime?: string | null
  endTime?: string | null
  notes: string
  createdAt: string
}

type MaintenancePayload = {
  items: MaintenanceRow[]
  blockedDates: string[]
}

type SimScope = 'all' | 'boeing-737' | 'mi-2'

const selectClass =
  'mt-1 flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-sm'

const END_SLOTS = [...BOOKING_TIME_SLOTS, '19:00', '20:00', '21:00'] as const

const EMPTY_FORM = {
  date: format(new Date(), 'yyyy-MM-dd'),
  sim: 'boeing-737' as SimScope,
  fullDay: false,
  startTime: '12:00',
  endTime: '13:00',
  notes: '',
}

function simLabel(slug?: string | null) {
  if (slug === 'mi-2') return 'Ми-2'
  if (slug === 'boeing-737') return 'Boeing 737'
  return 'Все тренажёры'
}

function scopeLabel(row: MaintenanceRow) {
  const fullDay = !row.startTime || !row.endTime
  if (!row.simulatorSlug && fullDay) return 'Весь день · весь зал'
  if (row.simulatorSlug && fullDay) return `Весь день · ${simLabel(row.simulatorSlug)}`
  return `${row.startTime}–${row.endTime} · ${simLabel(row.simulatorSlug)}`
}

function formatDateRu(iso: string) {
  return formatAdminDate(iso)
}

function formFromRow(row: MaintenanceRow) {
  const fullDay = !row.startTime || !row.endTime
  return {
    date: row.date,
    sim: (row.simulatorSlug === 'mi-2' || row.simulatorSlug === 'boeing-737'
      ? row.simulatorSlug
      : 'all') as SimScope,
    fullDay,
    startTime: row.startTime || '12:00',
    endTime: row.endTime || '13:00',
    notes: row.notes || '',
  }
}

function bodyFromForm(form: typeof EMPTY_FORM) {
  const body: Record<string, unknown> = {
    date: form.date,
    notes: form.notes.trim() || 'Техническое обслуживание',
    simulatorSlug: form.sim === 'all' ? null : form.sim,
    startTime: form.fullDay ? null : form.startTime,
    endTime: form.fullDay ? null : form.endTime,
  }
  return body
}

export default function AdminMaintenancePage() {
  const { session } = useAdminAuth()
  const { pushUndo } = useAdminUndo()
  const canEdit = session ? canEditBookings(session.role) : false

  const { data, reload } = useLiveData(
    () => apiFetch<MaintenancePayload>('/api/admin/maintenance'),
    [],
  )
  const items = data?.items ?? []
  const blockedDates = data?.blockedDates ?? []
  const { rowProps } = useHighlightRow(data !== null)

  const [formOpen, setFormOpen] = React.useState(false)
  const [editId, setEditId] = React.useState<string | null>(null)
  const [editSnapshot, setEditSnapshot] = React.useState<MaintenanceRow | null>(null)
  const [deleteTarget, setDeleteTarget] = React.useState<MaintenanceRow | null>(null)
  const [unblockDate, setUnblockDate] = React.useState<string | null>(null)
  const [busy, setBusy] = React.useState(false)
  const [form, setForm] = React.useState(EMPTY_FORM)

  const siteClosedDates = React.useMemo(() => {
    const set = new Set(blockedDates)
    for (const m of items) {
      if (!m.simulatorSlug && (!m.startTime || !m.endTime)) set.add(m.date)
    }
    return [...set].sort()
  }, [blockedDates, items])

  const upcoming = React.useMemo(() => {
    const today = format(new Date(), 'yyyy-MM-dd')
    return items.filter((m) => m.date >= today)
  }, [items])

  const past = React.useMemo(() => {
    const today = format(new Date(), 'yyyy-MM-dd')
    return items.filter((m) => m.date < today).reverse()
  }, [items])

  const openCreate = () => {
    setEditId(null)
    setEditSnapshot(null)
    setForm({
      ...EMPTY_FORM,
      date: format(new Date(), 'yyyy-MM-dd'),
    })
    setFormOpen(true)
  }

  const openEdit = (row: MaintenanceRow) => {
    setEditId(row.id)
    setEditSnapshot(row)
    setForm(formFromRow(row))
    setFormOpen(true)
  }

  const closeForm = () => {
    setFormOpen(false)
    setEditId(null)
    setEditSnapshot(null)
  }

  const save = async () => {
    if (!canEdit) return
    if (!form.fullDay && form.startTime >= form.endTime) return
    setBusy(true)
    try {
      const body = bodyFromForm(form)
      if (editId) {
        const previous = editSnapshot
        await apiFetch<MaintenanceRow>(`/api/admin/maintenance/${editId}`, {
          method: 'PATCH',
          body: JSON.stringify(body),
        })
        if (previous) {
          pushUndo({
            label: 'Отменить изменение ТО',
            run: async () => {
              await apiFetch(`/api/admin/maintenance/${previous.id}`, {
                method: 'PATCH',
                body: JSON.stringify({
                  date: previous.date,
                  simulatorSlug: previous.simulatorSlug ?? null,
                  startTime: previous.startTime ?? null,
                  endTime: previous.endTime ?? null,
                  notes: previous.notes,
                }),
              })
              void reload()
            },
          })
        }
      } else {
        const created = await apiFetch<MaintenanceRow>('/api/admin/maintenance', {
          method: 'POST',
          body: JSON.stringify(body),
        })
        pushUndo({
          label: 'Отменить добавление ТО',
          run: async () => {
            await apiFetch(`/api/admin/maintenance/${created.id}`, { method: 'DELETE' })
            void reload()
          },
        })
      }
      closeForm()
      void reload()
    } finally {
      setBusy(false)
    }
  }

  const remove = async () => {
    if (!deleteTarget || !canEdit) return
    setBusy(true)
    try {
      const snapshot = deleteTarget
      await apiFetch(`/api/admin/maintenance/${snapshot.id}`, { method: 'DELETE' })
      pushUndo({
        label: 'Отменить удаление ТО',
        run: async () => {
          await apiFetch('/api/admin/maintenance', {
            method: 'POST',
            body: JSON.stringify({
              id: snapshot.id,
              date: snapshot.date,
              simulatorSlug: snapshot.simulatorSlug,
              startTime: snapshot.startTime,
              endTime: snapshot.endTime,
              notes: snapshot.notes,
              createdAt: snapshot.createdAt,
              archiveSection: 'maintenance',
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

  const confirmUnblock = async () => {
    if (!unblockDate || !canEdit) return
    setBusy(true)
    try {
      await apiFetch('/api/admin/calendar/toggle-blocked', {
        method: 'POST',
        body: JSON.stringify({ dates: [unblockDate] }),
      })
      setUnblockDate(null)
      void reload()
    } finally {
      setBusy(false)
    }
  }

  const renderList = (rows: MaintenanceRow[], empty: string) => {
    if (rows.length === 0) {
      return <p className="px-1 py-6 text-sm text-muted-foreground">{empty}</p>
    }
    return (
      <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-background">
        {rows.map((row) => {
          const props = rowProps(row.id)
          return (
            <li
              key={row.id}
              data-highlight-id={props['data-highlight-id']}
              className={cn(
                'flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-start sm:justify-between',
                props.className,
              )}
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">{formatDateRu(row.date)}</p>
                <p className="mt-0.5 text-sm text-muted-foreground">{scopeLabel(row)}</p>
                {row.notes ? (
                  <p className="mt-1 text-sm leading-snug text-foreground/80">{row.notes}</p>
                ) : null}
                {!row.simulatorSlug && (!row.startTime || !row.endTime) ? (
                  <p className="mt-1 text-[11px] font-medium text-destructive">
                    Закрыто на всём сайте
                  </p>
                ) : null}
              </div>
              {canEdit ? (
                <div className="flex shrink-0 gap-0.5">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-8 text-muted-foreground"
                    aria-label="Редактировать"
                    onClick={() => openEdit(row)}
                  >
                    <img src={PENCIL} alt="" className="size-4" width={16} height={16} />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-8 text-muted-foreground hover:text-destructive"
                    aria-label="Удалить"
                    onClick={() => setDeleteTarget(row)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              ) : null}
            </li>
          )
        })}
      </ul>
    )
  }

  return (
    <div className="flex w-full min-w-0 flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-foreground">Техническое обслуживание</h2>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Укажите тренажёр, дату и интервал (например завтра с 12:00 до 13:00). На это время
            запись на сайте будет недоступна.
          </p>
        </div>
        {canEdit ? (
          <Button type="button" variant="destructive" size="sm" className="h-9 shrink-0 gap-2" onClick={openCreate}>
            <Plus className="size-4" />
            Добавить ТО
          </Button>
        ) : null}
      </div>

      <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3">
        <p className="text-xs font-medium uppercase tracking-wide text-destructive">
          Заблокированные даты
        </p>
        {siteClosedDates.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">Сейчас нет полностью закрытых дней</p>
        ) : (
          <div className="mt-2 flex flex-wrap gap-2">
            {siteClosedDates.map((d) => (
              <button
                key={d}
                type="button"
                disabled={!canEdit}
                className="inline-flex rounded-md border border-destructive/40 bg-background px-2 py-1 text-xs font-medium text-destructive transition-colors hover:bg-destructive/10 disabled:cursor-default disabled:opacity-70"
                onClick={() => canEdit && setUnblockDate(d)}
              >
                {formatDateRu(d)} — снять блок
              </button>
            ))}
          </div>
        )}
      </div>

      <section className="flex flex-col gap-2">
        <h3 className="text-sm font-semibold text-foreground">Предстоящие</h3>
        {renderList(upcoming, 'Нет предстоящих закрытий')}
      </section>

      <section className="flex flex-col gap-2">
        <h3 className="text-sm font-semibold text-foreground">Прошедшие</h3>
        {renderList(past, 'Нет записей в истории')}
      </section>

      <AdminFormModal
        open={formOpen}
        onClose={() => {
          if (!busy) closeForm()
        }}
        title={editId ? 'Редактировать ТО' : 'Новое ТО'}
        description={
          editId
            ? 'Измените дату, тренажёр, интервал или комментарий.'
            : 'Тренажёр + дата + время с/по. Можно закрыть весь день.'
        }
        size="md"
      >
        <div className="flex flex-col gap-4">
          <label className="block text-sm">
            Дата
            <SiteDateInput
              className="mt-1 h-9"
              value={form.date}
              onValueChange={(date) => setForm((f) => ({ ...f, date }))}
            />
          </label>

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
            <Button type="button" variant="outline" onClick={closeForm} disabled={busy}>
              Отмена
            </Button>
            <Button
              type="button"
              disabled={busy || (!form.fullDay && form.startTime >= form.endTime)}
              onClick={() => void save()}
            >
              {editId ? 'Сохранить' : 'Создать'}
            </Button>
          </div>
        </div>
      </AdminFormModal>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Удалить закрытие?"
        description={
          deleteTarget
            ? `${formatDateRu(deleteTarget.date)} · ${scopeLabel(deleteTarget)}. Действие можно отменить вверху страницы.`
            : undefined
        }
        confirmLabel="Удалить"
        destructive
        busy={busy}
        onConfirm={() => void remove()}
        onCancel={() => setDeleteTarget(null)}
      />

      <ConfirmDialog
        open={!!unblockDate}
        title="Снять блокировку даты?"
        description={
          unblockDate
            ? `Дата ${formatDateRu(unblockDate)} снова станет доступна для брони на обоих тренажёрах.`
            : undefined
        }
        confirmLabel="Снять блокировку"
        busy={busy}
        onConfirm={() => void confirmUnblock()}
        onCancel={() => setUnblockDate(null)}
      />
    </div>
  )
}
