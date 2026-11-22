import * as React from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { format, isValid, parseISO } from 'date-fns'
import { Check, ChevronDown, Clock, Info, Loader2, MoreHorizontal, Plus, Trash2 } from 'lucide-react'
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
import { ApiError, apiFetch, type AdminUser, type ApiBooking } from '@/lib/api'
import { canEditBookings } from '@/lib/admin-access'
import PaymentMethodIcon from '@/components/admin/PaymentMethodIcon'
import {
  BOOKING_STATUS_OPTIONS,
  PAYMENT_METHOD_OPTIONS,
  SIMULATOR_OPTIONS,
  labelOf,
} from '@/lib/admin-labels'
import { bookingTimeSlotsFor } from '@/components/booking/bookingTimeSlots'
import { clampDurationForSimulator } from '@/lib/flight-durations'
import {
  durationChoicesFromList,
  filterDurationChoicesForSimulator,
  simulatorChoicesFromList,
  type OptionListRow,
} from '@/lib/option-list-utils'
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

type BookingRow = {
  id: string
  name: string
  phone: string
  simulator: SimulatorType
  /** API-статус (WAITING / CONFIRMED / …) — для бейджа и фильтра */
  status: string
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
  pilotUserId: '',
}

function statusRequiresPilot(status: string) {
  return status === 'DONE' || status === 'IN_PROGRESS'
}

function mapApiBooking(row: ApiBooking): BookingRow {
  const simulator: SimulatorType =
    row.simulatorSlug === 'mi-2'
      ? 'helicopter'
      : row.simulatorSlug === 'boeing-737'
        ? 'plane'
        : 'both'
  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    simulator,
    status: row.status,
    paid: row.paid,
    time: `${row.startTime} - ${row.endTime}`,
    method: row.paymentMethod === 'ONLINE' ? 'ONLINE' : 'OFFLINE',
    comment: [
      row.comment,
      row.email ? `Email: ${row.email}` : '',
      row.promoNote ? `Акция: ${row.promoNote}` : '',
      row.birthdayDate
        ? `ДР: ${row.birthdayDate.replace(/^(\d{1,2})\.(\d{1,2})$/, (_, d, m) => `${String(d).padStart(2, '0')}-${String(m).padStart(2, '0')}`)}`
        : '',
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
  return formatAdminDate(d)
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

function StatusBadge({ status }: { status: string }) {
  const label = labelOf(BOOKING_STATUS_OPTIONS, status, status)
  switch (status) {
    case 'IN_PROGRESS':
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-foreground">
          <Loader2 className="size-3.5 shrink-0 animate-spin text-muted-foreground" />
          {label}
        </span>
      )
    case 'DONE':
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-green-500/10 px-2.5 py-1 text-xs font-medium text-green-700 dark:text-green-400">
          <Check className="size-3.5 shrink-0 text-green-700 dark:text-green-400" />
          {label}
        </span>
      )
    case 'WAITING':
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-800 dark:text-amber-300">
          <Clock className="size-3.5 shrink-0 text-amber-700 dark:text-amber-300" />
          {label}
        </span>
      )
    case 'CONFIRMED':
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-500/10 px-2.5 py-1 text-xs font-medium text-blue-700 dark:text-blue-300">
          <Check className="size-3.5 shrink-0 text-blue-700 dark:text-blue-300" />
          {label}
        </span>
      )
    case 'PENDING_CONFIRMATION':
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-foreground">
          <Loader2 className="size-3.5 shrink-0 animate-spin text-muted-foreground" />
          {label}
        </span>
      )
    case 'EXPIRED':
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-orange-500/10 px-2.5 py-1 text-xs font-medium text-orange-800 dark:text-orange-300">
          <Info className="size-3.5 shrink-0 text-orange-700 dark:text-orange-300" />
          {label}
        </span>
      )
    case 'CANCELLED':
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-destructive/10 px-2.5 py-1 text-xs font-medium text-destructive">
          <Info className="size-3.5 shrink-0 text-destructive" />
          {label}
        </span>
      )
    default:
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-foreground">
          {label}
        </span>
      )
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
  const [pilotAskOpen, setPilotAskOpen] = React.useState(false)
  const [pilotAskDraft, setPilotAskDraft] = React.useState('')
  const [pilotAskContinueSave, setPilotAskContinueSave] = React.useState(false)
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
      apiFetch<{
        days: { date: string; status: string; fullyClosed?: boolean }[]
        range: { from: string; to: string }
      }>('/api/admin/calendar'),
    [],
  )
  const calDays = calPayload?.days ?? []
  const calRange = calPayload?.range
  /** BLOCKED в календаре или fullyClosed (ТО на весь зал) — день недоступен для записи */
  const blockedKeys = React.useMemo(
    () =>
      new Set(
        calDays
          .filter((d) => d.status === 'BLOCKED' || d.fullyClosed)
          .map((d) => d.date),
      ),
    [calDays],
  )
  const holidayKeys = React.useMemo(
    () => new Set(calDays.filter((d) => d.status === 'HOLIDAY').map((d) => d.date)),
    [calDays],
  )
  const dayFullyClosed = blockedKeys.has(dateKey)

  const { data: apiRows, reload } = useLiveData(
    () => apiFetch<ApiBooking[]>(`/api/admin/bookings?date=${dateKey}`),
    [dateKey],
  )
  const { data: optionLists } = useLiveData(
    () =>
      apiFetch<{
        duration: OptionListRow[]
        simulator: OptionListRow[]
      }>('/api/admin/settings/option-lists'),
    [],
  )
  const bookingSimOptions = React.useMemo(
    () =>
      simulatorChoicesFromList(optionLists?.simulator, [...SIMULATOR_OPTIONS]).filter(
        (s) => s.value !== 'combo',
      ),
    [optionLists],
  )
  const bookingDurationChoices = React.useMemo(
    () =>
      filterDurationChoicesForSimulator(
        durationChoicesFromList(optionLists?.duration),
        form.simulatorSlug,
      ),
    [optionLists, form.simulatorSlug],
  )
  const { data: publicSettings } = useLiveData(
    () => apiFetch<{ bookingGapMin: number }>('/api/public/settings'),
    [],
  )
  const bookingGapMin = publicSettings?.bookingGapMin ?? 15
  const startTimeSlots = React.useMemo(
    () => bookingTimeSlotsFor(bookingGapMin, form.durationMin || 30),
    [bookingGapMin, form.durationMin],
  )
  // Подтягиваем автозавершение «В процессе» → «Закончили» по времени, даже без socket
  React.useEffect(() => {
    const t = window.setInterval(() => {
      void reload()
    }, 30_000)
    return () => window.clearInterval(t)
  }, [reload])
  const { data: pilotsData } = useLiveData(
    () => (canEdit ? apiFetch<AdminUser[]>('/api/admin/pilots') : Promise.resolve([])),
    [canEdit],
  )
  const pilots = pilotsData ?? []
  const monthKey = dateKey.slice(0, 7)
  const { data: shiftsData } = useLiveData(
    () =>
      canEdit
        ? apiFetch<{ userId: string; simulatorSlug: string; date: string }[]>(
            `/api/admin/staff-shifts?month=${monthKey}`,
          )
            .then((list) => list.filter((s) => s.date === dateKey))
            .catch(() => [])
        : Promise.resolve([]),
    [canEdit, dateKey, monthKey],
  )
  const dayShifts = shiftsData ?? []
  const pilotNameById = React.useMemo(() => {
    const map = new Map<string, string>()
    for (const p of pilots) map.set(p.id, p.fullName)
    return map
  }, [pilots])
  const orderedPilots = React.useMemo(() => {
    const list = [...pilots]
    const onShift = new Set(dayShifts.map((s) => s.userId))
    const onThisSim = new Set(
      dayShifts
        .filter((s) => s.simulatorSlug === form.simulatorSlug)
        .map((s) => s.userId),
    )
    list.sort((a, b) => {
      const aSim = onThisSim.has(a.id) ? 0 : onShift.has(a.id) ? 1 : 2
      const bSim = onThisSim.has(b.id) ? 0 : onShift.has(b.id) ? 1 : 2
      if (aSim !== bSim) return aSim - bSim
      return a.fullName.localeCompare(b.fullName, 'ru')
    })
    return list
  }, [pilots, dayShifts, form.simulatorSlug])

  const openPilotAsk = React.useCallback(
    (continueSave: boolean) => {
      const preferred =
        form.pilotUserId ||
        dayShifts.find((s) => s.simulatorSlug === form.simulatorSlug)?.userId ||
        orderedPilots[0]?.id ||
        ''
      setPilotAskDraft(preferred)
      setPilotAskContinueSave(continueSave)
      setPilotAskOpen(true)
    },
    [form.pilotUserId, form.simulatorSlug, dayShifts, orderedPilots],
  )

  const mapped = (apiRows ?? []).map(mapApiBooking)
  const { rowProps } = useHighlightRow(apiRows !== null)
  const formDirty = JSON.stringify(form) !== JSON.stringify(initialForm)

  const closeForm = () => {
    setFormOpen(false)
    setFormError('')
    setDiscardConfirmOpen(false)
    setSaveConfirmOpen(false)
    setPilotAskOpen(false)
    setPilotAskContinueSave(false)
  }

  const requestCloseForm = () => {
    if (formDirty) {
      setDiscardConfirmOpen(true)
      return
    }
    closeForm()
  }

  const openCreate = () => {
    if (dayFullyClosed) return
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
      durationMin: clampDurationForSimulator(
        row.raw.simulatorSlug,
        row.raw.durationMin,
        optionLists?.duration,
      ),
      simulatorSlug: row.raw.simulatorSlug,
      comment: row.raw.comment,
      paymentMethod: row.raw.paymentMethod === 'ONLINE' ? ('ONLINE' as const) : ('OFFLINE' as const),
      paid: row.raw.paid,
      status: row.raw.status,
      pilotUserId: row.raw.pilotUserId ?? '',
    }
    setEditId(row.id)
    setForm(next)
    setInitialForm(next)
    setFormError('')
    setFormOpen(true)
  }

  const requestSave = () => {
    if (!canEdit || !formDirty) return
    if (editId && statusRequiresPilot(form.status) && !form.pilotUserId) {
      openPilotAsk(true)
      return
    }
    setSaveConfirmOpen(true)
  }

  const confirmPilotAsk = () => {
    if (!pilotAskDraft) return
    setForm((f) => ({ ...f, pilotUserId: pilotAskDraft }))
    setFormError('')
    setPilotAskOpen(false)
    if (pilotAskContinueSave) {
      setPilotAskContinueSave(false)
      setSaveConfirmOpen(true)
    }
  }

  const save = async () => {
    if (!canEdit || !formDirty) return
    if (!editId && dayFullyClosed) {
      setSaveConfirmOpen(false)
      setFormError('День закрыт (ТО / блокировка). Запись на эту дату недоступна.')
      return
    }
    if (editId && statusRequiresPilot(form.status) && !form.pilotUserId) {
      setSaveConfirmOpen(false)
      openPilotAsk(true)
      return
    }
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
        pilotUserId: form.pilotUserId || null,
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
        sortable: false,
        headerClassName: 'min-w-[150px] whitespace-nowrap',
        className: 'whitespace-nowrap',
      },
      {
        id: 'simulator',
        header: '',
        filterLabel: 'Тренажёр',
        accessor: (r) => r.raw.simulatorSlug,
        filterType: 'enum',
        enumOptions: bookingSimOptions,
        headerClassName: 'w-14 px-2 text-center',
        className: 'px-2 text-center',
        cell: (row) => <SimulatorIcons type={row.simulator} />,
      },
      {
        id: 'status',
        header: 'Статус',
        accessor: 'status',
        filterType: 'enum',
        enumOptions: [...BOOKING_STATUS_OPTIONS],
        filterValue: (r) => labelOf(BOOKING_STATUS_OPTIONS, r.status),
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
        accessor: (r) => r.raw.startTime,
        sortable: false,
        filterType: 'timeRange',
        filterLabel: 'Время',
        filterValue: (r) => r.time,
        headerClassName: 'min-w-[110px] whitespace-nowrap',
        className: 'whitespace-nowrap text-[13px]',
        cell: (row) => row.time,
      },
      {
        id: 'method',
        header: 'Способ',
        accessor: 'method',
        filterType: 'enum',
        enumOptions: [...PAYMENT_METHOD_OPTIONS],
        filterValue: (r) => labelOf(PAYMENT_METHOD_OPTIONS, r.method),
        headerClassName: 'w-12 text-center',
        className: 'text-center',
        cell: (row) => <PaymentMethodIcon method={row.method} />,
      },
      {
        id: 'pilot',
        header: 'Пилот',
        accessor: (r) => r.raw.pilotUserId ?? '',
        filterType: 'enum',
        enumOptions: [
          { value: '__none__', label: 'Не назначен' },
          ...pilots.map((p) => ({ value: p.id, label: p.fullName })),
        ],
        filterMatch: (r) => r.raw.pilotUserId || '__none__',
        filterValue: (r) =>
          r.raw.pilotUserId
            ? (pilotNameById.get(r.raw.pilotUserId) ?? r.raw.pilotUserId)
            : 'Не назначен',
        headerClassName: 'min-w-[120px] whitespace-nowrap',
        className: 'whitespace-nowrap text-sm',
        cell: (row) =>
          row.raw.pilotUserId
            ? (pilotNameById.get(row.raw.pilotUserId) ?? '—')
            : '—',
      },
      {
        id: 'comment',
        header: 'Комментарий',
        accessor: 'comment',
        sortable: false,
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
              headerClassName: 'w-10 text-right pr-2',
              cell: (row: BookingRow) => (
                <div className="flex justify-end">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="size-8">
                        <MoreHorizontal className="size-4" />
                        <span className="sr-only">Ещё</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => openEdit(row)}>
                        <img src={PENCIL} alt="" className="size-4" width={16} height={16} />
                        Редактировать
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive focus:bg-destructive/10 focus:text-destructive"
                        onClick={() => setDeleteTarget(row)}
                      >
                        <Trash2 className="size-4" />
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
    [canEdit, pilots, pilotNameById, bookingSimOptions],
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
          blocked: (d) => blockedKeys.has(format(d, 'yyyy-MM-dd')),
        }}
        modifiersClassNames={{
          holiday: '[&_button]:text-destructive [&_button]:font-semibold',
          blocked: '[&_button]:line-through [&_button]:opacity-50',
        }}
      />

      <div className="flex flex-col gap-4 rounded-lg border bg-background p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 space-y-1">
            <p className="text-sm font-medium leading-tight text-foreground">
              {formatTableHeaderDate(headerDate)}
            </p>
            {dayFullyClosed ? (
              <p className="text-xs text-destructive">
                День закрыт (ТО / блокировка) — новые записи недоступны.
              </p>
            ) : null}
          </div>
          {canEdit ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9 w-full shrink-0 gap-2 sm:w-auto"
              disabled={dayFullyClosed}
              title={
                dayFullyClosed
                  ? 'День закрыт (ТО / блокировка)'
                  : undefined
              }
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
                    value={startTimeSlots.includes(form.startTime) ? form.startTime : ''}
                    onChange={(e) => {
                      const v = e.target.value
                      if (v) {
                        setFormError('')
                        setForm((f) => ({ ...f, startTime: v }))
                      }
                    }}
                  >
                    {!startTimeSlots.includes(form.startTime) ? (
                      <option value="" disabled>
                        Своё время
                      </option>
                    ) : null}
                    {startTimeSlots.map((t) => (
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
                    const status = e.target.value
                    setFormError('')
                    setForm((f) => ({ ...f, status }))
                    if (statusRequiresPilot(status) && !form.pilotUserId) {
                      // Спросить пилота сразу при переводе в «В процессе» / «Закончили»
                      queueMicrotask(() => openPilotAsk(false))
                    }
                  }}
                >
                  {BOOKING_STATUS_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              ) : (
                <select
                  className="mt-1 h-9 w-full rounded-md border bg-muted/40 px-2 text-sm text-muted-foreground disabled:cursor-not-allowed disabled:opacity-70"
                  value="WAITING"
                  disabled
                  title="Новые записи всегда создаются со статусом «Ожидаем»"
                >
                  <option value="WAITING">Ожидаем</option>
                </select>
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
                    durationMin: clampDurationForSimulator(
                      simulatorSlug,
                      f.durationMin,
                      optionLists?.duration,
                    ),
                  }))
                }}
              >
                {bookingSimOptions.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              <span className="text-muted-foreground">
                Пилот
                {statusRequiresPilot(form.status) ? ' *' : ''}
              </span>
              <select
                className="mt-1 h-9 w-full rounded-md border bg-background px-2 text-sm"
                value={form.pilotUserId}
                onChange={(e) => {
                  setFormError('')
                  setForm((f) => ({ ...f, pilotUserId: e.target.value }))
                }}
              >
                <option value="">
                  {statusRequiresPilot(form.status) ? 'Выберите пилота' : 'Не назначен'}
                </option>
                {orderedPilots.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.fullName}
                    {dayShifts.some(
                      (s) => s.userId === p.id && s.simulatorSlug === form.simulatorSlug,
                    )
                      ? ' · смена'
                      : dayShifts.some((s) => s.userId === p.id)
                        ? ' · на смене'
                        : ''}
                  </option>
                ))}
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
                {bookingDurationChoices.map((d) => (
                  <option key={d.value} value={d.value}>
                    {d.label}
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
                <Button type="button" onClick={requestSave}>
                  Сохранить
                </Button>
              ) : null}
              <Button type="button" variant="outline" onClick={requestCloseForm}>
                Закрыть
              </Button>
            </div>
          </div>
        </AdminFormModal>

        <Dialog.Root
          open={pilotAskOpen}
          onOpenChange={(v) => {
            if (!v) {
              setPilotAskOpen(false)
              setPilotAskContinueSave(false)
            }
          }}
        >
          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 z-[230] bg-black/45" />
            <Dialog.Content className="fixed left-1/2 top-1/2 z-[231] w-[min(calc(100vw-2rem),420px)] -translate-x-1/2 -translate-y-1/2 rounded-xl border border-border bg-background p-5 shadow-xl outline-none">
              <Dialog.Title className="text-base font-semibold text-foreground">
                Кто был пилотом?
              </Dialog.Title>
              <Dialog.Description className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Для статуса «
                {labelOf(BOOKING_STATUS_OPTIONS, form.status, form.status)}» нужно закрепить полёт
                за пилотом — иначе часы не попадут в хронометраж.
              </Dialog.Description>
              <label className="mt-4 block text-sm">
                <span className="text-muted-foreground">Пилот *</span>
                <select
                  className="mt-1 h-9 w-full rounded-md border bg-background px-2 text-sm"
                  value={pilotAskDraft}
                  onChange={(e) => setPilotAskDraft(e.target.value)}
                  autoFocus
                >
                  <option value="">Выберите пилота</option>
                  {orderedPilots.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.fullName}
                      {dayShifts.some(
                        (s) => s.userId === p.id && s.simulatorSlug === form.simulatorSlug,
                      )
                        ? ' · смена'
                        : dayShifts.some((s) => s.userId === p.id)
                          ? ' · на смене'
                          : ''}
                    </option>
                  ))}
                </select>
              </label>
              <div className="mt-5 flex flex-wrap justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setPilotAskOpen(false)
                    setPilotAskContinueSave(false)
                  }}
                >
                  Отмена
                </Button>
                <Button
                  type="button"
                  disabled={!pilotAskDraft}
                  onClick={confirmPilotAsk}
                >
                  Подтвердить
                </Button>
              </div>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>

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
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="size-8 shrink-0">
                                <MoreHorizontal className="size-4" />
                                <span className="sr-only">Ещё</span>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openEdit(row)}>
                                <img src={PENCIL} alt="" className="size-4" width={16} height={16} />
                                Редактировать
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-destructive focus:bg-destructive/10 focus:text-destructive"
                                onClick={() => setDeleteTarget(row)}
                              >
                                <Trash2 className="size-4" />
                                Удалить
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
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
