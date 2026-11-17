import * as React from 'react'
import { format, isValid, parseISO } from 'date-fns'
import { Check, ChevronDown, Clock, Info, Loader2, MoreHorizontal, Plus } from 'lucide-react'
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
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  AdminDataTableToolbar,
  AdminSortableHead,
  useAdminDataTable,
  type AdminColumnDef,
} from '@/components/admin/AdminDataTable'
import AdminFormModal from '@/components/admin/AdminFormModal'
import ConfirmDialog from '@/components/admin/ConfirmDialog'
import { useHighlightRow } from '@/hooks/useHighlightRow'
import { useIsMobile } from '@/hooks/use-mobile'
import { useLiveData } from '@/hooks/useLiveData'
import { useAdminAuth } from '@/contexts/AdminAuthContext'
import { useAdminUndo } from '@/contexts/AdminUndoContext'
import { ApiError, apiFetch, type ApiBooking } from '@/lib/api'
import { canEditBookings } from '@/lib/admin-access'
import PaymentMethodIcon from '@/components/admin/PaymentMethodIcon'
import {
  BOOKING_STATUS_OPTIONS,
  PAYMENT_METHOD_OPTIONS,
  SIMULATOR_OPTIONS,
  labelOf,
} from '@/lib/admin-labels'
import { BOOKING_TIME_SLOTS } from '@/components/booking/bookingTimeSlots'
import { clampDurationForSimulator, durationsForSimulator } from '@/lib/flight-durations'
import { formatAdminDate } from '@/lib/admin-date'
import { isTimeHmValid, sanitizeTimeHmInput } from '@/lib/fieldInput'
import { cn } from '@/lib/utils'

const PENCIL = '/assets/admin/certificates_pencil_icon.svg'

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
  status: 'WAITING',
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
        <span className="inline-flex items-center gap-1.5 rounded-full bg-green-500/10 px-2.5 py-1 text-xs font-medium text-green-700 dark:text-green-400">
          <Check className="size-3.5 shrink-0 text-green-700 dark:text-green-400" />
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
        <span className="inline-flex items-center gap-1.5 rounded-full bg-destructive/10 px-2.5 py-1 text-xs font-medium text-destructive">
          <Info className="size-3.5 shrink-0 text-destructive" />
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

function bookingSaveErrorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    const msg = String(err.message || '').trim()
    if (msg && msg !== 'Conflict') return msg
    if (err.status === 409) {
      return 'На это время уже есть запись (время полёта пересекается). Выберите другое время или тренажёр.'
    }
    if (err.status === 400) return msg || 'Некорректные данные записи.'
    if (err.status === 403) return 'Недостаточно прав для сохранения записи.'
    return msg || `Не удалось сохранить запись (${err.status}).`
  }
  if (err instanceof Error && err.message) return err.message
  return 'Не удалось сохранить запись. Попробуйте ещё раз.'
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
  const [discardConfirmOpen, setDiscardConfirmOpen] = React.useState(false)
  const [actionBusy, setActionBusy] = React.useState(false)
  const [formError, setFormError] = React.useState('')
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
    () =>
      apiFetch<{ days: { date: string; status: string }[]; range: { from: string; to: string } }>(
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

  const blockedDatesList = React.useMemo(
    () =>
      calDays
        .filter((d) => d.status === 'BLOCKED')
        .map((d) => d.date)
        .sort(),
    [calDays],
  )
  const [unblockDate, setUnblockDate] = React.useState<string | null>(null)
  const [calBusy, setCalBusy] = React.useState(false)

  const confirmUnblock = async () => {
    if (!unblockDate || !canEdit) return
    setCalBusy(true)
    try {
      await apiFetch('/api/admin/calendar/toggle-blocked', {
        method: 'POST',
        body: JSON.stringify({ dates: [unblockDate] }),
      })
      setUnblockDate(null)
    } finally {
      setCalBusy(false)
    }
  }

  const mapped = (apiRows ?? []).map(mapApiBooking)
  const { rowProps } = useHighlightRow(apiRows !== null)
  const formDirty = JSON.stringify(form) !== JSON.stringify(initialForm)

  const closeForm = () => {
    setFormOpen(false)
    setFormError('')
    setDiscardConfirmOpen(false)
    setSaveConfirmOpen(false)
  }

  const requestCloseForm = () => {
    if (formDirty) {
      setDiscardConfirmOpen(true)
      return
    }
    closeForm()
  }

  const openCreate = () => {
    setEditId(null)
    setForm(EMPTY_FORM)
    setInitialForm(EMPTY_FORM)
    setFormError('')
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
    setFormError('')
    setFormOpen(true)
  }

  const save = async () => {
    if (!canEdit || !formDirty) return
    const startTime = form.startTime.trim()
    if (!isTimeHmValid(startTime)) {
      setSaveConfirmOpen(false)
      setFormError('Укажите время начала в формате ЧЧ:ММ (можно выбрать из списка или ввести вручную).')
      return
    }
    setActionBusy(true)
    setFormError('')
    try {
      const endTotal =
        Number(startTime.split(':')[0]) * 60 +
        Number(startTime.split(':')[1]) +
        form.durationMin
      const endH = Math.floor(endTotal / 60)
      const endM = endTotal % 60
      const endTime = `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`
      const payload = {
        ...form,
        startTime,
        status: editId ? form.status : 'WAITING',
      }

      if (editId) {
        const previous = mapped.find((r) => r.id === editId)?.raw
        await apiFetch(`/api/admin/bookings/${editId}`, {
          method: 'PATCH',
          body: JSON.stringify({ ...payload, endTime }),
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
          body: JSON.stringify({ ...payload, date: dateKey, endTime }),
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
      setFormError('')
      void reload()
    } catch (err) {
      const message = bookingSaveErrorMessage(err)
      setSaveConfirmOpen(false)
      setFormError(message)
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

  const bookingColumns: AdminColumnDef<BookingRow>[] = React.useMemo(
    () => [
      {
        id: 'name',
        header: 'Имя',
        accessor: 'name',
        headerClassName: 'min-w-[100px] whitespace-nowrap',
        className: 'whitespace-nowrap',
      },
      {
        id: 'phone',
        header: 'Телефон',
        accessor: 'phone',
        headerClassName: 'min-w-[150px] whitespace-nowrap',
        className: 'whitespace-nowrap',
      },
      {
        id: 'simulator',
        header: '',
        accessor: (r) => r.raw.simulatorSlug,
        filterType: 'enum',
        enumOptions: [...SIMULATOR_OPTIONS],
        hideColumnFilter: true,
        sortable: false,
        headerClassName: 'w-14 px-2 text-center',
        className: 'px-2 text-center',
        cell: (row) => <SimulatorIcons type={row.simulator} />,
      },
      {
        id: 'status',
        header: 'Статус',
        accessor: (r) => r.raw.status,
        filterType: 'enum',
        enumOptions: [...BOOKING_STATUS_OPTIONS],
        filterValue: (r) => labelOf(BOOKING_STATUS_OPTIONS, r.raw.status),
        headerClassName: 'min-w-[120px] whitespace-nowrap',
        cell: (row) => <StatusBadge status={row.status} />,
      },
      {
        id: 'paid',
        header: 'Pay',
        accessor: 'paid',
        filterType: 'boolean',
        headerClassName: 'w-14 text-center',
        className: 'text-center',
        cell: (row) => <PayCell paid={row.paid} />,
      },
      {
        id: 'time',
        header: 'Время',
        accessor: 'time',
        headerClassName: 'min-w-[110px] whitespace-nowrap',
        className: 'whitespace-nowrap text-[13px]',
      },
      {
        id: 'method',
        header: 'Способ',
        accessor: 'method',
        filterType: 'enum',
        enumOptions: [...PAYMENT_METHOD_OPTIONS],
        hideColumnFilter: true,
        sortable: false,
        headerClassName: 'w-12 text-center',
        className: 'text-center',
        cell: (row) => <PaymentMethodIcon method={row.method} />,
      },
      {
        id: 'comment',
        header: 'Комментарий',
        accessor: 'comment',
        headerClassName: 'min-w-[160px]',
        className: 'max-w-[220px] text-sm leading-snug',
      },
      ...(canEdit
        ? ([
            {
              id: 'actions',
              header: '',
              sortable: false,
              filterable: false,
              headerClassName: 'w-[52px] text-right pr-2',
              cell: (row: BookingRow) => (
                <div className="flex justify-end gap-0.5">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-8"
                    onClick={() => openEdit(row)}
                    aria-label="Редактировать"
                  >
                    <img src={PENCIL} alt="" className="size-4" width={16} height={16} />
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="size-8">
                        <MoreHorizontal className="size-4" />
                        <span className="sr-only">Ещё</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        className="text-destructive focus:bg-destructive/10 focus:text-destructive"
                        onClick={() => setDeleteTarget(row)}
                      >
                        Удалить
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ),
            },
          ] satisfies AdminColumnDef<BookingRow>[])
        : []),
    ],
    [canEdit],
  )

  const bookingsTable = useAdminDataTable(mapped, bookingColumns)
  const displayRows = bookingsTable.processedRows

  return (
    <div className="flex w-full min-w-0 flex-col gap-6">
      <Calendar
        mode="single"
        numberOfMonths={isMobile ? 1 : 3}
        selected={date}
        onSelect={selectDate}
        locale={ru}
        className="w-fit max-w-full rounded-lg border"
        classNames={{
          disabled: 'text-muted-foreground',
        }}
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

      {blockedDatesList.length > 0 ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3">
          <p className="text-xs font-medium uppercase tracking-wide text-destructive">
            Заблокированные даты
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {blockedDatesList.map((d) => (
              <button
                key={d}
                type="button"
                disabled={!canEdit}
                className="inline-flex rounded-md border border-destructive/40 bg-background px-2 py-1 text-xs font-medium text-destructive transition-colors hover:bg-destructive/10 disabled:opacity-50"
                onClick={() => canEdit && setUnblockDate(d)}
              >
                {formatAdminDate(d)} — снять блок
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <ConfirmDialog
        open={!!unblockDate}
        title="Снять блокировку даты?"
        description={
          unblockDate
            ? `Дата ${unblockDate} снова станет доступна для брони на обоих тренажёрах.`
            : undefined
        }
        confirmLabel="Снять блокировку"
        busy={calBusy}
        onConfirm={() => void confirmUnblock()}
        onCancel={() => setUnblockDate(null)}
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
          onClose={requestCloseForm}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            {(
              [
                ['name', 'Имя'],
                ['phone', 'Телефон'],
                ['email', 'Email'],
                ['comment', 'Комментарий'],
              ] as const
            ).map(([key, label]) => (
              <label key={key} className="text-sm">
                <span className="text-muted-foreground">{label}</span>
                <Input
                  className="mt-1 h-9"
                  value={String(form[key] ?? '')}
                  onChange={(e) => {
                    setFormError('')
                    setForm((f) => ({ ...f, [key]: e.target.value }))
                  }}
                />
              </label>
            ))}
            <label className="text-sm">
              <span className="text-muted-foreground">Время начала</span>
              <div className="relative mt-1">
                <Input
                  className="h-9 pr-9 font-mono"
                  placeholder="12:00"
                  inputMode="numeric"
                  value={form.startTime}
                  onChange={(e) => {
                    setFormError('')
                    setForm((f) => ({ ...f, startTime: sanitizeTimeHmInput(e.target.value) }))
                  }}
                />
                <div className="absolute inset-y-0 right-0 w-9">
                  <select
                    aria-label="Выбрать слот из списка"
                    className="absolute inset-0 cursor-pointer opacity-0"
                    value={
                      (BOOKING_TIME_SLOTS as readonly string[]).includes(form.startTime)
                        ? form.startTime
                        : ''
                    }
                    onChange={(e) => {
                      const v = e.target.value
                      if (v) {
                        setFormError('')
                        setForm((f) => ({ ...f, startTime: v }))
                      }
                    }}
                  >
                    {!(BOOKING_TIME_SLOTS as readonly string[]).includes(form.startTime) ? (
                      <option value="" disabled>
                        Своё время
                      </option>
                    ) : null}
                    {BOOKING_TIME_SLOTS.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute left-1/2 top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 text-muted-foreground" />
                </div>
              </div>
            </label>
            <label className="text-sm">
              <span className="text-muted-foreground">Статус</span>
              {editId ? (
                <select
                  className="mt-1 h-9 w-full rounded-md border bg-background px-2 text-sm"
                  value={form.status}
                  onChange={(e) => {
                    setFormError('')
                    setForm((f) => ({ ...f, status: e.target.value }))
                  }}
                >
                  {BOOKING_STATUS_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              ) : (
                <Input
                  className="mt-1 h-9"
                  value="Ожидаем"
                  readOnly
                  title="Новые записи всегда создаются со статусом «Ожидаем»"
                />
              )}
            </label>
            <label className="text-sm">
              <span className="text-muted-foreground">Тренажёр</span>
              <select
                className="mt-1 h-9 w-full rounded-md border bg-background px-2 text-sm"
                value={form.simulatorSlug}
                onChange={(e) => {
                  const simulatorSlug = e.target.value
                  setFormError('')
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
                onChange={(e) => {
                  setFormError('')
                  setForm((f) => ({ ...f, durationMin: Number(e.target.value) }))
                }}
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
                onChange={(e) => {
                  setFormError('')
                  setForm((f) => ({ ...f, paymentMethod: e.target.value as 'OFFLINE' | 'ONLINE' }))
                }}
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
                onChange={(e) => {
                  setFormError('')
                  setForm((f) => ({ ...f, paid: e.target.checked }))
                }}
              />
              <span>Оплачено</span>
            </label>
            {formError ? (
              <p
                className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm leading-snug text-destructive sm:col-span-2"
                role="alert"
              >
                {formError}
              </p>
            ) : null}
            <div className="flex flex-wrap gap-2 sm:col-span-2">
              {formDirty ? (
                <Button type="button" onClick={() => setSaveConfirmOpen(true)}>
                  Сохранить
                </Button>
              ) : null}
              <Button type="button" variant="outline" onClick={requestCloseForm}>
                Закрыть
              </Button>
            </div>
          </div>
        </AdminFormModal>

        <ConfirmDialog
          open={discardConfirmOpen}
          title="Закрыть окно?"
          description="Текущие данные формы не сохранятся. Закрыть без сохранения?"
          confirmLabel="Закрыть без сохранения"
          destructive
          onConfirm={closeForm}
          onCancel={() => setDiscardConfirmOpen(false)}
        />

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
          <AdminDataTableToolbar
            table={bookingsTable}
            columns={bookingColumns}
            searchPlaceholder="Поиск по записям"
          />
        ) : null}

        {mapped.length > 0 && isMobile ? (
          <div className="overflow-hidden rounded-lg border border-border bg-background">
            <p className="border-b border-border bg-muted/40 px-3 py-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              День · {formatAdminDate(dateKey)}
            </p>
            <ul className="divide-y divide-border">
              {[...displayRows]
                .sort((a, b) => a.raw.startTime.localeCompare(b.raw.startTime))
                .map((row) => (
                  <li
                    key={row.id}
                    {...rowProps(
                      row.id,
                      cn('flex gap-3 px-3 py-3', row.muted && 'opacity-70'),
                    )}
                  >
                    <div className="w-14 shrink-0 text-right">
                      <p className="font-mono text-sm font-semibold tabular-nums text-foreground">
                        {row.raw.startTime}
                      </p>
                      <p className="font-mono text-[11px] tabular-nums text-muted-foreground">
                        {row.raw.endTime}
                      </p>
                    </div>
                    <div className="min-w-0 flex-1 border-l border-border pl-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p
                            className={cn(
                              'truncate font-semibold',
                              row.muted && 'text-muted-foreground',
                            )}
                          >
                            {row.name}
                          </p>
                          <p className="text-xs text-muted-foreground">{row.phone}</p>
                        </div>
                        {canEdit ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="size-8 shrink-0"
                            onClick={() => openEdit(row)}
                            aria-label="Редактировать"
                          >
                            <img src={PENCIL} alt="" className="size-4" width={16} height={16} />
                          </Button>
                        ) : null}
                      </div>
                      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                        <SimulatorIcons type={row.simulator} />
                        <StatusBadge status={row.status} />
                        <PayCell paid={row.paid} />
                        <PaymentMethodIcon method={row.method} />
                      </div>
                    </div>
                  </li>
                ))}
            </ul>
          </div>
        ) : mapped.length > 0 ? (
          <div className="-mx-4 max-w-[calc(100vw-2rem)] overflow-x-auto sm:mx-0 sm:max-w-none">
            <div className="rounded-lg border bg-background">
              <Table>
                <TableHeader>
                  <TableRow>
                    {bookingColumns.map((column) => (
                      <AdminSortableHead
                        key={column.id}
                        column={column}
                        sort={bookingsTable.sort}
                        onToggle={bookingsTable.toggleSort}
                      />
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayRows.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={bookingColumns.length}
                        className="h-20 text-center text-muted-foreground"
                      >
                        Нет записей по фильтру
                      </TableCell>
                    </TableRow>
                  ) : (
                    displayRows.map((row) => (
                      <TableRow
                        key={row.id}
                        {...rowProps(row.id, cn(row.muted && 'text-muted-foreground'))}
                      >
                        {bookingColumns.map((column) => (
                          <TableCell
                            key={column.id}
                            className={cn(
                              column.className,
                              column.id === 'name' &&
                                !row.muted &&
                                'font-semibold text-foreground',
                            )}
                          >
                            {column.cell
                              ? column.cell(row)
                              : column.accessor == null
                                ? null
                                : (() => {
                                    const value =
                                      typeof column.accessor === 'function'
                                        ? column.accessor(row)
                                        : row[column.accessor]
                                    if (value == null || value === '') return '—'
                                    if (typeof value === 'boolean') return value ? 'Да' : 'Нет'
                                    return String(value)
                                  })()}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        ) : (
          <p className="py-8 text-center text-sm text-muted-foreground">На эту дату записей нет</p>
        )}
      </div>
    </div>
  )
}
