import * as React from 'react'
import { format, isValid, parseISO } from 'date-fns'
import { Check, Clock, Info, Loader2, MoreHorizontal, Plus } from 'lucide-react'
import { ru } from 'date-fns/locale'
import { useSearchParams } from 'react-router-dom'
import { Calendar } from '@/components/ui/calendar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import AdminFormModal from '@/components/admin/AdminFormModal'
import ConfirmDialog from '@/components/admin/ConfirmDialog'
import { useHighlightRow } from '@/hooks/useHighlightRow'
import { useIsMobile } from '@/hooks/use-mobile'
import { useLiveData } from '@/hooks/useLiveData'
import { useAdminAuth } from '@/contexts/AdminAuthContext'
import { useAdminUndo } from '@/contexts/AdminUndoContext'
import { apiFetch, type ApiBooking } from '@/lib/api'
import { canEditBookings } from '@/lib/admin-access'
import PaymentMethodIcon from '@/components/admin/PaymentMethodIcon'
import { BOOKING_STATUS_OPTIONS, PAYMENT_METHOD_OPTIONS } from '@/lib/admin-labels'
import { clampDurationForSimulator, durationsForSimulator } from '@/lib/flight-durations'
import { cn } from '@/lib/utils'

const SIM_PLANE = '✈️'
const SIM_HELI = '🚁'
const PAY_OK = '✅'
const PAY_BAD = '❌'

function EmojiCell({
  emoji,
  label,
  className,
  title,
}: {
  emoji: string
  label: string
  className?: string
  title?: string
}) {
  return (
    <span
      role="img"
      aria-label={label}
      title={title}
      className={cn(
        'inline-flex select-none items-center justify-center text-[1.125rem] leading-none',
        className,
      )}
    >
      {emoji}
    </span>
  )
}

type SimulatorType = 'plane' | 'helicopter' | 'both'
type BookingStatus = 'in_progress' | 'done' | 'waiting' | 'canceled'

type BookingRow = {
  id: string
  name: string
  phone: string
  simulator: SimulatorType
  status: BookingStatus
  paid: boolean
  time: string
  method: 'ONLINE' | 'OFFLINE'
  comment: string
  muted: boolean
  raw: ApiBooking
}

const EMPTY_FORM = {
  name: '',
  phone: '',
  email: '',
  startTime: '12:00',
  durationMin: 30,
  simulatorSlug: 'boeing-737',
  comment: '',
  paymentMethod: 'OFFLINE' as 'OFFLINE' | 'ONLINE',
  paid: false,
  status: 'CONFIRMED',
}

function mapApiBooking(row: ApiBooking): BookingRow {
  const simulator: SimulatorType =
    row.simulatorSlug === 'mi-2'
      ? 'helicopter'
      : row.simulatorSlug === 'boeing-737'
        ? 'plane'
        : 'both'
  const statusMap: Record<string, BookingStatus> = {
    IN_PROGRESS: 'in_progress',
    DONE: 'done',
    WAITING: 'waiting',
    CANCELLED: 'canceled',
    CONFIRMED: 'waiting',
    PENDING_CONFIRMATION: 'in_progress',
    EXPIRED: 'canceled',
  }
  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    simulator,
    status: statusMap[row.status] ?? 'waiting',
    paid: row.paid,
    time: `${row.startTime} - ${row.endTime}`,
    method: row.paymentMethod === 'ONLINE' ? 'ONLINE' : 'OFFLINE',
    comment: [
      row.comment,
      row.email ? `Email: ${row.email}` : '',
      row.promoNote ? `Акция: ${row.promoNote}` : '',
      row.birthdayDate ? `ДР: ${row.birthdayDate}` : '',
      row.certificateNumber ? `Сертификат: ${row.certificateNumber}` : '',
      row.holdExpiresAt ? `Резерв до: ${row.holdExpiresAt.slice(11, 16)}` : '',
    ]
      .filter(Boolean)
      .join(' · '),
    muted: row.status === 'DONE' || row.status === 'CANCELLED' || row.status === 'EXPIRED',
    raw: row,
  }
}

function formatTableHeaderDate(d: Date) {
  const raw = format(d, "d MMMM yyyy 'г.'", { locale: ru })
  return raw.replace(/^(\d+\s+)([а-яё]+)/i, (_, n: string, m: string) => {
    return `${n}${m.charAt(0).toUpperCase()}${m.slice(1)}`
  })
}

function SimulatorIcons({ type }: { type: SimulatorType }) {
  const plane = <EmojiCell emoji={SIM_PLANE} label="Самолёт" />
  const heli = <EmojiCell emoji={SIM_HELI} label="Вертолёт" />
  if (type === 'plane') return <span className="inline-flex">{plane}</span>
  if (type === 'helicopter') return <span className="inline-flex">{heli}</span>
  return (
    <span className="inline-flex items-center gap-0.5">
      {heli}
      {plane}
    </span>
  )
}

function StatusBadge({ status }: { status: BookingStatus }) {
  switch (status) {
    case 'in_progress':
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-foreground">
          <Loader2 className="size-3.5 shrink-0 animate-spin text-muted-foreground" />
          В процессе
        </span>
      )
    case 'done':
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-green-500/[0.04] px-2.5 py-1 text-xs font-medium text-green-700/55 dark:text-green-400/55">
          <Check className="size-3.5 shrink-0 text-green-700/55 dark:text-green-400/55" />
          Закончили
        </span>
      )
    case 'waiting':
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-foreground">
          <Clock className="size-3.5 shrink-0 text-muted-foreground" />
          Ожидаем
        </span>
      )
    case 'canceled':
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-destructive/[0.04] px-2.5 py-1 text-xs font-medium text-destructive/55">
          <Info className="size-3.5 shrink-0 text-destructive/55" />
          Отменен
        </span>
      )
    default:
      return null
  }
}

function PayCell({ paid }: { paid: boolean }) {
  if (paid) {
    return (
      <EmojiCell
        emoji={PAY_OK}
        label="Оплачено"
        className="min-w-7 min-h-7 text-[1.25rem]"
        title="Оплачено"
      />
    )
  }
  return (
    <EmojiCell
      emoji={PAY_BAD}
      label="Не оплачено"
      className="min-h-7 text-[1.25rem]"
      title="Не оплачено"
    />
  )
}

export default function AdminDashboardPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const dateFromUrl = React.useMemo(() => {
    const raw = searchParams.get('date')
    if (!raw) return undefined
    const parsed = parseISO(raw)
    return isValid(parsed) ? parsed : undefined
  }, [searchParams])

  const [date, setDate] = React.useState<Date | undefined>(() => dateFromUrl ?? new Date())
  const [formOpen, setFormOpen] = React.useState(false)
  const [editId, setEditId] = React.useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = React.useState<BookingRow | null>(null)
  const [saveConfirmOpen, setSaveConfirmOpen] = React.useState(false)
  const [actionBusy, setActionBusy] = React.useState(false)
  const [form, setForm] = React.useState(EMPTY_FORM)
  const [initialForm, setInitialForm] = React.useState(EMPTY_FORM)
  const { session } = useAdminAuth()
  const { pushUndo } = useAdminUndo()
  const isMobile = useIsMobile()
  const headerDate = date ?? new Date()
  const canEdit = session ? canEditBookings(session.role) : false

  React.useEffect(() => {
    if (dateFromUrl) setDate(dateFromUrl)
  }, [dateFromUrl])

  const selectDate = React.useCallback(
    (next: Date | undefined) => {
      setDate(next)
      setSearchParams(
        (prev) => {
          const nextParams = new URLSearchParams()
          if (next) nextParams.set('date', format(next, 'yyyy-MM-dd'))
          const highlight = prev.get('highlight')
          if (highlight) nextParams.set('highlight', highlight)
          return nextParams
        },
        { replace: true },
      )
    },
    [setSearchParams],
  )

  const dateKey = format(headerDate, 'yyyy-MM-dd')
  const { data: calPayload } = useLiveData(
    () => apiFetch<{ days: { date: string; status: string }[]; range: { from: string; to: string } }>(
      '/api/admin/calendar',
    ),
    [],
  )
  const calDays = calPayload?.days ?? []
  const calRange = calPayload?.range
  const blockedKeys = React.useMemo(
    () => new Set(calDays.filter((d) => d.status === 'BLOCKED').map((d) => d.date)),
    [calDays],
  )
  const holidayKeys = React.useMemo(
    () => new Set(calDays.filter((d) => d.status === 'HOLIDAY').map((d) => d.date)),
    [calDays],
  )

  const { data: apiRows, reload } = useLiveData(
    () => apiFetch<ApiBooking[]>(`/api/admin/bookings?date=${dateKey}`),
    [dateKey],
  )

  const mapped = (apiRows ?? []).map(mapApiBooking)
  const { rowProps } = useHighlightRow(apiRows !== null)
  const formDirty = JSON.stringify(form) !== JSON.stringify(initialForm)

  const openCreate = () => {
    setEditId(null)
    setForm(EMPTY_FORM)
    setInitialForm(EMPTY_FORM)
    setFormOpen(true)
  }

  const openEdit = (row: BookingRow) => {
    const next = {
      name: row.raw.name,
      phone: row.raw.phone,
      email: row.raw.email,
      startTime: row.raw.startTime,
      durationMin: clampDurationForSimulator(row.raw.simulatorSlug, row.raw.durationMin),
      simulatorSlug: row.raw.simulatorSlug,
      comment: row.raw.comment,
      paymentMethod: row.raw.paymentMethod,
      paid: row.raw.paid,
      status: row.raw.status,
    }
    setEditId(row.id)
    setForm(next)
    setInitialForm(next)
    setFormOpen(true)
  }

  const save = async () => {
    if (!canEdit || !formDirty) return
    setActionBusy(true)
    try {
      const endH = Math.floor(
        (Number(form.startTime.split(':')[0]) * 60 + Number(form.startTime.split(':')[1]) + form.durationMin) / 60,
      )
      const endM =
        (Number(form.startTime.split(':')[0]) * 60 + Number(form.startTime.split(':')[1]) + form.durationMin) % 60
      const endTime = `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`

      if (editId) {
        const previous = mapped.find((r) => r.id === editId)?.raw
        await apiFetch(`/api/admin/bookings/${editId}`, {
          method: 'PATCH',
          body: JSON.stringify({ ...form, endTime }),
        })
        if (previous) {
          pushUndo({
            label: `Отменить изменение записи «${previous.name}»`,
            run: async () => {
              await apiFetch(`/api/admin/bookings/${previous.id}`, {
                method: 'PATCH',
                body: JSON.stringify(previous),
              })
              void reload()
            },
          })
        }
      } else {
        const created = await apiFetch<ApiBooking>('/api/admin/bookings', {
          method: 'POST',
          body: JSON.stringify({ ...form, date: dateKey, endTime }),
        })
        pushUndo({
          label: `Отменить создание записи «${created.name}»`,
          run: async () => {
            await apiFetch(`/api/admin/bookings/${created.id}`, { method: 'DELETE' })
            void reload()
          },
        })
      }
      setFormOpen(false)
      setSaveConfirmOpen(false)
      void reload()
    } finally {
      setActionBusy(false)
    }
  }

  const deleteBooking = async () => {
    if (!canEdit || !deleteTarget) return
    setActionBusy(true)
    try {
      const snapshot = deleteTarget.raw
      await apiFetch(`/api/admin/bookings/${deleteTarget.id}`, { method: 'DELETE' })
      pushUndo({
        label: `Отменить удаление записи «${snapshot.name}»`,
        run: async () => {
          await apiFetch('/api/admin/bookings', {
            method: 'POST',
            body: JSON.stringify(snapshot),
          })
          void reload()
        },
      })
      setDeleteTarget(null)
      void reload()
    } finally {
      setActionBusy(false)
    }
  }

  return (
    <div className="flex w-full min-w-0 flex-col gap-6">
      <Calendar
        mode="single"
        numberOfMonths={isMobile ? 1 : 3}
        selected={date}
        onSelect={selectDate}
        locale={ru}
        className="w-fit max-w-full rounded-lg border"
        disabled={(d) => {
          const key = format(d, 'yyyy-MM-dd')
          if (blockedKeys.has(key)) return true
          if (calRange && (key < calRange.from || key > calRange.to)) return true
          return false
        }}
        modifiers={{
          holiday: (d) => holidayKeys.has(format(d, 'yyyy-MM-dd')),
        }}
        modifiersClassNames={{
          holiday: '[&_button]:text-destructive [&_button]:font-semibold',
        }}
      />

      <div className="flex flex-col gap-4 rounded-lg border bg-background p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-medium leading-tight text-foreground">
            {formatTableHeaderDate(headerDate)}
          </p>
          {canEdit ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9 w-full shrink-0 gap-2 sm:w-auto"
              onClick={openCreate}
            >
              <Plus className="size-4 shrink-0" />
              Добавить новую запись
            </Button>
          ) : null}
        </div>

        <AdminFormModal
          open={formOpen && canEdit}
          title={editId ? 'Редактировать запись' : 'Новая запись'}
          description={formatTableHeaderDate(headerDate)}
          onClose={() => setFormOpen(false)}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            {(
              [
                ['name', 'Имя'],
                ['phone', 'Телефон'],
                ['email', 'Email'],
                ['startTime', 'Время начала'],
                ['comment', 'Комментарий'],
              ] as const
            ).map(([key, label]) => (
              <label key={key} className="text-sm">
                <span className="text-muted-foreground">{label}</span>
                <Input
                  className="mt-1 h-9"
                  value={String(form[key] ?? '')}
                  onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                />
              </label>
            ))}
            <label className="text-sm">
              <span className="text-muted-foreground">Статус</span>
              <select
                className="mt-1 h-9 w-full rounded-md border bg-background px-2 text-sm"
                value={form.status}
                onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
              >
                {BOOKING_STATUS_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              <span className="text-muted-foreground">Тренажёр</span>
              <select
                className="mt-1 h-9 w-full rounded-md border bg-background px-2 text-sm"
                value={form.simulatorSlug}
                onChange={(e) => {
                  const simulatorSlug = e.target.value
                  setForm((f) => ({
                    ...f,
                    simulatorSlug,
                    durationMin: clampDurationForSimulator(simulatorSlug, f.durationMin),
                  }))
                }}
              >
                <option value="boeing-737">Boeing 737</option>
                <option value="mi-2">Ми-2</option>
              </select>
            </label>
            <label className="text-sm">
              <span className="text-muted-foreground">Минуты</span>
              <select
                className="mt-1 h-9 w-full rounded-md border bg-background px-2 text-sm"
                value={form.durationMin}
                onChange={(e) => setForm((f) => ({ ...f, durationMin: Number(e.target.value) }))}
              >
                {durationsForSimulator(form.simulatorSlug).map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              <span className="text-muted-foreground">Способ оплаты</span>
              <select
                className="mt-1 h-9 w-full rounded-md border bg-background px-2 text-sm"
                value={form.paymentMethod}
                onChange={(e) =>
                  setForm((f) => ({ ...f, paymentMethod: e.target.value as 'OFFLINE' | 'ONLINE' }))
                }
              >
                {PAYMENT_METHOD_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex items-center gap-2 pt-6 text-sm">
              <input
                type="checkbox"
                checked={form.paid}
                onChange={(e) => setForm((f) => ({ ...f, paid: e.target.checked }))}
              />
              <span>Оплачено</span>
            </label>
            <div className="flex flex-wrap gap-2 sm:col-span-2">
              {formDirty ? (
                <Button type="button" onClick={() => setSaveConfirmOpen(true)}>
                  Сохранить
                </Button>
              ) : null}
              <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>
                Закрыть
              </Button>
            </div>
          </div>
        </AdminFormModal>

        <ConfirmDialog
          open={saveConfirmOpen}
          title={editId ? 'Сохранить изменения?' : 'Создать запись?'}
          description={
            editId
              ? `Запись «${form.name || 'без имени'}» будет обновлена. При необходимости действие можно отменить вверху страницы.`
              : `Будет создана новая запись на ${formatTableHeaderDate(headerDate)}. При необходимости действие можно отменить вверху страницы.`
          }
          confirmLabel="Сохранить"
          busy={actionBusy}
          onConfirm={() => void save()}
          onCancel={() => setSaveConfirmOpen(false)}
        />

        <ConfirmDialog
          open={!!deleteTarget}
          title="Удалить запись?"
          description={
            deleteTarget
              ? `Запись «${deleteTarget.name}», ${deleteTarget.time} будет удалена. При необходимости действие можно отменить вверху страницы.`
              : undefined
          }
          confirmLabel="Удалить"
          destructive
          busy={actionBusy}
          onConfirm={() => void deleteBooking()}
          onCancel={() => setDeleteTarget(null)}
        />

        {mapped.length > 0 ? (
          <div className="-mx-4 max-w-[calc(100vw-2rem)] overflow-x-auto sm:mx-0 sm:max-w-none">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[100px] whitespace-nowrap">Имя</TableHead>
                  <TableHead className="min-w-[150px] whitespace-nowrap">Телефон</TableHead>
                  <TableHead className="w-14 px-2 text-center" />
                  <TableHead className="min-w-[120px] whitespace-nowrap">Статус</TableHead>
                  <TableHead className="w-14 text-center">Pay</TableHead>
                  <TableHead className="min-w-[110px] whitespace-nowrap">Время</TableHead>
                  <TableHead className="w-12 text-center">Способ</TableHead>
                  <TableHead className="min-w-[160px]">Комментарий</TableHead>
                  {canEdit ? <TableHead className="w-[52px] text-right pr-2" /> : null}
                </TableRow>
              </TableHeader>
              <TableBody>
                {mapped.map((row) => (
                  <TableRow
                    key={row.id}
                    {...rowProps(row.id, cn(row.muted && 'text-muted-foreground/70 opacity-70'))}
                  >
                    <TableCell className={cn('whitespace-nowrap', !row.muted && 'font-semibold text-foreground')}>
                      {row.name}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">{row.phone}</TableCell>
                    <TableCell className="px-2 text-center">
                      <SimulatorIcons type={row.simulator} />
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={row.status} />
                    </TableCell>
                    <TableCell className="text-center">
                      <PayCell paid={row.paid} />
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-[13px]">{row.time}</TableCell>
                    <TableCell className="text-center">
                      <PaymentMethodIcon method={row.method} />
                    </TableCell>
                    <TableCell className="max-w-[220px] text-sm leading-snug">{row.comment}</TableCell>
                    {canEdit ? (
                      <TableCell className="pr-2 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="size-8">
                              <MoreHorizontal className="size-4" />
                              <span className="sr-only">Действия</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEdit(row)}>Редактировать</DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive focus:bg-destructive/10 focus:text-destructive"
                              onClick={() => setDeleteTarget(row)}
                            >
                              Удалить
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    ) : null}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Записей на выбранную дату пока нет.</p>
        )}
      </div>
    </div>
  )
}
