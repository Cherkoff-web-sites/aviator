import * as React from 'react'
import { format, isValid, parseISO } from 'date-fns'
import { Plus, Trash2 } from 'lucide-react'
import { ru } from 'date-fns/locale'
import { useSearchParams } from 'react-router-dom'
import AdminFormModal from '@/components/admin/AdminFormModal'
import ConfirmDialog from '@/components/admin/ConfirmDialog'
import { Calendar } from '@/components/ui/calendar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useHighlightRow } from '@/hooks/useHighlightRow'
import { useLiveData } from '@/hooks/useLiveData'
import { apiFetch, type ApiWaiting } from '@/lib/api'
import { useAdminAuth } from '@/contexts/AdminAuthContext'
import { useAdminUndo } from '@/contexts/AdminUndoContext'
import { canEditBookings } from '@/lib/admin-access'
import { cn } from '@/lib/utils'

const PENCIL = '/assets/admin/certificates_pencil_icon.svg'

export default function AdminWaitingRoomPage() {
  const [searchParams] = useSearchParams()
  const dateFromUrl = React.useMemo(() => {
    const raw = searchParams.get('date')
    if (!raw) return undefined
    const parsed = parseISO(raw)
    return isValid(parsed) ? parsed : undefined
  }, [searchParams])

  const [month, setMonth] = React.useState(() => dateFromUrl ?? new Date())
  const [date, setDate] = React.useState<Date | undefined>(() => dateFromUrl ?? new Date())
  const [line, setLine] = React.useState('')
  const [deleteTarget, setDeleteTarget] = React.useState<ApiWaiting | null>(null)
  const [editTarget, setEditTarget] = React.useState<ApiWaiting | null>(null)
  const [editForm, setEditForm] = React.useState({ date: '', line: '' })
  const [saveConfirmOpen, setSaveConfirmOpen] = React.useState(false)
  const [busy, setBusy] = React.useState(false)
  const { session } = useAdminAuth()
  const { pushUndo } = useAdminUndo()
  const canEdit = session ? canEditBookings(session.role) : false
  const dateKey = date ? format(date, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd')

  React.useEffect(() => {
    if (dateFromUrl) {
      setDate(dateFromUrl)
      setMonth(dateFromUrl)
    }
  }, [dateFromUrl])

  const { data, reload } = useLiveData(
    () => apiFetch<ApiWaiting[]>(`/api/admin/waiting-room?date=${dateKey}`),
    [dateKey],
  )
  const queue = data ?? []
  const { rowProps } = useHighlightRow(data !== null)

  const openEdit = (item: ApiWaiting) => {
    setEditTarget(item)
    setEditForm({ date: item.date, line: item.line })
  }

  const addItem = async () => {
    if (!line.trim() || !canEdit) return
    const text = line.trim()
    const created = await apiFetch<ApiWaiting>('/api/admin/waiting-room', {
      method: 'POST',
      body: JSON.stringify({ date: dateKey, line: text }),
    })
    pushUndo({
      label: 'Отменить добавление в очередь',
      run: async () => {
        await apiFetch(`/api/admin/waiting-room/${created.id}`, { method: 'DELETE' })
        void reload()
      },
    })
    setLine('')
    void reload()
  }

  const saveEdit = async () => {
    if (!editTarget || !canEdit || !editForm.line.trim() || !editForm.date) return
    setBusy(true)
    try {
      const previous = { ...editTarget }
      const nextDate = editForm.date
      const nextLine = editForm.line.trim()
      await apiFetch(`/api/admin/waiting-room/${editTarget.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ date: nextDate, line: nextLine }),
      })
      pushUndo({
        label: 'Отменить изменение заметки',
        run: async () => {
          await apiFetch(`/api/admin/waiting-room/${previous.id}`, {
            method: 'PATCH',
            body: JSON.stringify({ date: previous.date, line: previous.line }),
          })
          void reload()
        },
      })
      // Если дату сменили — перейти к новой дате в календаре
      if (nextDate !== dateKey) {
        const parsed = parseISO(nextDate)
        if (isValid(parsed)) {
          setDate(parsed)
          setMonth(parsed)
        }
      }
      setEditTarget(null)
      setSaveConfirmOpen(false)
      void reload()
    } finally {
      setBusy(false)
    }
  }

  const confirmDelete = async () => {
    if (!deleteTarget || !canEdit) return
    setBusy(true)
    try {
      const snapshot = deleteTarget
      await apiFetch(`/api/admin/waiting-room/${snapshot.id}`, { method: 'DELETE' })
      pushUndo({
        label: 'Отменить удаление из очереди',
        run: async () => {
          await apiFetch('/api/admin/waiting-room', {
            method: 'POST',
            body: JSON.stringify({
              id: snapshot.id,
              date: snapshot.date,
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
          {queue.map((item) => {
            const props = rowProps(item.id)
            return (
              <li
                key={item.id}
                data-highlight-id={props['data-highlight-id']}
                className={cn(
                  'flex items-start gap-2 rounded-md border border-border/70 bg-muted/50 py-2.5 pl-0 pr-2 shadow-sm',
                  props.className,
                )}
              >
                <div className="mt-0.5 min-h-[2.25rem] w-1 shrink-0 rounded-full bg-foreground/80" aria-hidden />
                <p className="min-w-0 flex-1 pt-0.5 text-sm leading-snug text-foreground">{item.line}</p>
                {canEdit ? (
                  <div className="flex shrink-0 gap-0.5">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-8 text-muted-foreground"
                      aria-label="Редактировать"
                      onClick={() => openEdit(item)}
                    >
                      <img src={PENCIL} alt="" className="size-4" width={16} height={16} />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-8 text-muted-foreground hover:text-destructive"
                      aria-label="Удалить"
                      onClick={() => setDeleteTarget(item)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                ) : null}
              </li>
            )
          })}
        </ul>
      </div>

      <AdminFormModal
        open={!!editTarget}
        title="Редактировать заметку"
        description="Можно изменить дату и текст."
        onClose={() => {
          if (!busy) {
            setEditTarget(null)
            setSaveConfirmOpen(false)
          }
        }}
        size="md"
      >
        <div className="flex flex-col gap-4">
          <label className="block text-sm">
            Дата
            <Input
              type="date"
              className="mt-1 h-9"
              value={editForm.date}
              onChange={(e) => setEditForm((f) => ({ ...f, date: e.target.value }))}
            />
          </label>
          <label className="block text-sm">
            Текст заметки
            <Input
              className="mt-1 h-9"
              value={editForm.line}
              onChange={(e) => setEditForm((f) => ({ ...f, line: e.target.value }))}
            />
          </label>
          <div className="flex justify-end gap-2 pt-1">
            <Button
              type="button"
              variant="outline"
              onClick={() => setEditTarget(null)}
              disabled={busy}
            >
              Отмена
            </Button>
            <Button
              type="button"
              disabled={busy || !editForm.line.trim() || !editForm.date}
              onClick={() => setSaveConfirmOpen(true)}
            >
              Сохранить
            </Button>
          </div>
        </div>
      </AdminFormModal>

      <ConfirmDialog
        open={saveConfirmOpen}
        title="Сохранить изменения?"
        description="Действие можно отменить вверху страницы в течение минуты."
        confirmLabel="Сохранить"
        busy={busy}
        onConfirm={() => void saveEdit()}
        onCancel={() => setSaveConfirmOpen(false)}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        title="Удалить из очереди?"
        description={
          deleteTarget
            ? `Запись «${deleteTarget.line.slice(0, 80)}${deleteTarget.line.length > 80 ? '…' : ''}» будет удалена. Действие можно отменить вверху страницы.`
            : undefined
        }
        confirmLabel="Удалить"
        destructive
        busy={busy}
        onConfirm={() => void confirmDelete()}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}
