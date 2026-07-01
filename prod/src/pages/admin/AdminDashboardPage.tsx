import * as React from 'react'
import { format } from 'date-fns'
import { Check, Clock, Info, Loader2, MoreHorizontal, Plus } from 'lucide-react'
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useIsMobile } from '@/hooks/use-mobile'
import { useLiveData } from '@/hooks/useLiveData'
import { useAdminAuth } from '@/contexts/AdminAuthContext'
import { apiFetch, type ApiBooking } from '@/lib/api'
import { canEditBookings } from '@/lib/admin-access'
import { cn } from '@/lib/utils'

const SIM_PLANE = '✈️'
const SIM_HELI = '🚁'
const PAY_OK = '✅'
const PAY_BAD = '❌'
const METHOD_ONLINE = '🌐'
const METHOD_OFFLINE = '👤'

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
type MethodKind = 'online' | 'offline'

type BookingRow = {
  id: string
  name: string
  phone: string
  simulator: SimulatorType
  status: BookingStatus
  paid: boolean
  time: string
  method: MethodKind
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
    method: row.paymentMethod === 'ONLINE' ? 'online' : 'offline',
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
    muted: row.status === 'CANCELLED' || row.status === 'EXPIRED',
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
        <span className="inline-flex items-center gap-1.5 rounded-full bg-green-100 px-2.5 py-1 text-xs font-medium text-green-900 dark:bg-green-950/60 dark:text-green-100">
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
        <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-foreground">
          <Info className="size-3.5 shrink-0 text-muted-foreground" />
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

function MethodIcon({ method }: { method: MethodKind }) {
  if (method === 'online') {
    return <EmojiCell emoji={METHOD_ONLINE} label="Онлайн" className="text-[1.05rem]" />
  }
  return <EmojiCell emoji={METHOD_OFFLINE} label="Офлайн" className="text-[1.05rem]" />
}

export default function AdminDashboardPage() {
  const [date, setDate] = React.useState<Date | undefined>(new Date())
  const [formOpen, setFormOpen] = React.useState(false)
  const [editId, setEditId] = React.useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = React.useState<BookingRow | null>(null)
  const [form, setForm] = React.useState(EMPTY_FORM)
  const [initialForm, setInitialForm] = React.useState(EMPTY_FORM)
  const { session } = useAdminAuth()
  const isMobile = useIsMobile()
  const headerDate = date ?? new Date()
  const canEdit = session ? canEditBookings(session.role) : false

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
      durationMin: row.raw.durationMin,
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
    if (editId) {
      const endH = Math.floor((Number(form.startTime.split(':')[0]) * 60 + Number(form.startTime.split(':')[1]) + form.durationMin) / 60)
      const endM = (Number(form.startTime.split(':')[0]) * 60 + Number(form.startTime.split(':')[1]) + form.durationMin) % 60
      const endTime = `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`
      await apiFetch(`/api/admin/bookings/${editId}`, {
        method: 'PATCH',
        body: JSON.stringify({ ...form, endTime }),
      })
    } else {
      await apiFetch('/api/admin/bookings', {
        method: 'POST',
        body: JSON.stringify({ ...form, date: dateKey }),
      })
    }
    setFormOpen(false)
    void reload()
  }

  const deleteBooking = async () => {
    if (!canEdit || !deleteTarget) return
    await apiFetch(`/api/admin/bookings/${deleteTarget.id}`, { method: 'DELETE' })
    setDeleteTarget(null)
    void reload()
  }

  return (
    <div className="flex w-full min-w-0 flex-col gap-6">
      <Calendar
        mode="single"
        numberOfMonths={isMobile ? 1 : 3}
        selected={date}
        onSelect={setDate}
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

        {formOpen && canEdit ? (
          <div className="grid gap-2 rounded-lg border bg-muted/30 p-4 sm:grid-cols-2">
            {(
              [
                ['name', 'Имя'],
                ['phone', 'Телефон'],
                ['email', 'Email'],
                ['startTime', 'Время начала'],
                ['simulatorSlug', 'Тренажёр'],
                ['comment', 'Комментарий'],
                ['status', 'Статус'],
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
              <span className="text-muted-foreground">Минуты</span>
              <Input
                type="number"
                className="mt-1 h-9"
                value={form.durationMin}
                onChange={(e) => setForm((f) => ({ ...f, durationMin: Number(e.target.value) }))}
              />
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
                <option value="OFFLINE">При посещении</option>
                <option value="ONLINE">Онлайн</option>
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
                <Button type="button" onClick={() => void save()}>
                  Сохранить
                </Button>
              ) : null}
              <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>
                Закрыть
              </Button>
            </div>
          </div>
        ) : null}

        {deleteTarget ? (
          <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4">
            <p className="text-sm font-medium text-destructive">
              Удалить запись {deleteTarget.name}, {deleteTarget.time}?
            </p>
            <div className="mt-3 flex gap-2">
              <Button type="button" variant="destructive" size="sm" onClick={() => void deleteBooking()}>
                Удалить
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => setDeleteTarget(null)}>
                Отмена
              </Button>
            </div>
          </div>
        ) : null}

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
                  <TableRow key={row.id} className={cn(row.muted && 'text-muted-foreground')}>
                    <TableCell className={cn('whitespace-nowrap', !row.muted && 'font-semibold text-foreground')}>
                      {row.name}
                    </TableCell>
                    <TableCell className="whitespace-nowrap font-mono text-[13px]">{row.phone}</TableCell>
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
                      <MethodIcon method={row.method} />
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
