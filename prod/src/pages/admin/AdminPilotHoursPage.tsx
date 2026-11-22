import * as React from 'react'
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
  subMonths,
} from 'date-fns'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { ru } from 'date-fns/locale'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useAdminAuth } from '@/contexts/AdminAuthContext'
import { useLiveData } from '@/hooks/useLiveData'
import { formatAdminDate } from '@/lib/admin-date'
import { apiFetch, type AdminUser } from '@/lib/api'
import { canEditBookings } from '@/lib/admin-access'
import { labelOf, SIMULATOR_OPTIONS } from '@/lib/admin-labels'
import { cn } from '@/lib/utils'

type TotalsRow = {
  id: string
  month: string
  userId: string
  pilotName?: string
  simulatorSlug: 'boeing-737' | 'mi-2'
  minutes: number
  comment: string
}

type FlightEntry = {
  id: string
  date: string
  startTime: string
  endTime: string
  durationMin: number
  simulatorSlug: string
  status: string
  pilotUserId: string
  clientName: string
}

type ShiftEntry = {
  id: string
  date: string
  userId: string
  simulatorSlug: string
}

type PilotHoursPayload = {
  month: string
  totals: TotalsRow[]
  entries: FlightEntry[]
  shifts: ShiftEntry[]
}

const WEEKDAY_LABELS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'] as const

function minsLabel(minutes: number) {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return `${minutes} мин (${h}:${String(m).padStart(2, '0')})`
}

function simShort(slug: string) {
  return slug === 'mi-2' ? 'Ми-2' : 'B737'
}

export default function AdminPilotHoursPage() {
  const { session, user } = useAdminAuth()
  const canEdit = session ? canEditBookings(session.role) : false
  const isPilot = session?.role === 'PILOT'
  const [viewMonth, setViewMonth] = React.useState(() => new Date())
  const monthKey = format(viewMonth, 'yyyy-MM')

  const { data: pilotsData } = useLiveData(
    () => {
      if (canEdit) return apiFetch<AdminUser[]>('/api/admin/pilots')
      if (isPilot) {
        return apiFetch<AdminUser>('/api/auth/me').then((u) => [u])
      }
      return Promise.resolve([])
    },
    [canEdit, user?.id, isPilot],
  )
  const pilots = pilotsData ?? []
  const pilotName = React.useCallback(
    (id: string) => pilots.find((p) => p.id === id)?.fullName ?? id,
    [pilots],
  )
  const pilotColor = React.useCallback(
    (id: string) => pilots.find((p) => p.id === id)?.color ?? '#64748b',
    [pilots],
  )

  const { data, reload } = useLiveData(
    () => apiFetch<PilotHoursPayload>(`/api/admin/pilot-hours?month=${monthKey}`),
    [monthKey],
  )

  const [comments, setComments] = React.useState<Record<string, string>>({})
  const [busy, setBusy] = React.useState(false)

  React.useEffect(() => {
    const next: Record<string, string> = {}
    for (const row of data?.totals ?? []) {
      next[`${row.userId}:${row.simulatorSlug}`] = row.comment ?? ''
    }
    setComments(next)
  }, [data])

  const entries = data?.entries ?? []
  const shifts = data?.shifts ?? []
  const totals = data?.totals ?? []

  const entriesByDate = React.useMemo(() => {
    const map = new Map<string, FlightEntry[]>()
    for (const e of entries) {
      const list = map.get(e.date) ?? []
      list.push(e)
      map.set(e.date, list)
    }
    return map
  }, [entries])

  const shiftsByDate = React.useMemo(() => {
    const map = new Map<string, ShiftEntry[]>()
    for (const s of shifts) {
      const list = map.get(s.date) ?? []
      list.push(s)
      map.set(s.date, list)
    }
    return map
  }, [shifts])

  const totalMinutes = React.useMemo(
    () => totals.reduce((sum, row) => sum + (row.minutes || 0), 0),
    [totals],
  )

  const save = async () => {
    if (!canEdit) return
    setBusy(true)
    try {
      await apiFetch('/api/admin/pilot-hours', {
        method: 'PUT',
        body: JSON.stringify({
          month: monthKey,
          rows: totals.map((g) => ({
            id: g.id,
            userId: g.userId,
            simulatorSlug: g.simulatorSlug,
            minutes: g.minutes,
            comment: comments[`${g.userId}:${g.simulatorSlug}`] ?? '',
          })),
        }),
      })
      void reload()
    } finally {
      setBusy(false)
    }
  }

  const monthStart = startOfMonth(viewMonth)
  const monthEnd = endOfMonth(viewMonth)
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 })
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd })
  const weeks = React.useMemo(() => {
    const chunks: Date[][] = []
    for (let i = 0; i < days.length; i += 7) chunks.push(days.slice(i, i + 7))
    return chunks
  }, [days])

  const monthLabel = format(viewMonth, 'LLLL yyyy', { locale: ru })
  const todayKey = format(new Date(), 'yyyy-MM-dd')

  return (
    <div className="flex w-full min-w-0 flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="size-9"
            onClick={() => setViewMonth((d) => subMonths(d, 1))}
          >
            <ChevronLeft className="size-4" />
          </Button>
          <p className="min-w-[10rem] text-center text-sm font-semibold capitalize">{monthLabel}</p>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="size-9"
            onClick={() => setViewMonth((d) => addMonths(d, 1))}
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
        {canEdit ? (
          <Button type="button" size="sm" disabled={busy} onClick={() => void save()}>
            Сохранить комментарии
          </Button>
        ) : null}
      </div>

      <p className="text-sm text-muted-foreground">
        {isPilot
          ? 'Ваши полёты («В процессе» / «Закончили»), где вас назначили пилотом, и ваши смены из графика. При подтверждении полёта смена в графике создаётся автоматически.'
          : 'Факт по минутам — только полёты «В процессе» / «Закончили» с назначенным пилотом. При подтверждении полёта смена пилота в графике создаётся сама.'}
      </p>

      {/* Календарь факта — копия логики графика персонала */}
      <section className="overflow-hidden rounded-lg border border-border bg-background">
        <div className="border-b border-border px-4 py-3">
          <h2 className="text-sm font-semibold">Факт по дням</h2>
        </div>
        <div className="grid grid-cols-7 border-b border-border bg-muted/30 text-center text-[11px] font-medium text-muted-foreground">
          {WEEKDAY_LABELS.map((d) => (
            <div key={d} className="px-1 py-2">
              {d}
            </div>
          ))}
        </div>
        <div className="flex flex-col">
          {weeks.map((week, wi) => (
            <div
              key={wi}
              className="grid grid-cols-7 border-b border-border last:border-b-0"
            >
              {week.map((day) => {
                const key = format(day, 'yyyy-MM-dd')
                const inMonth = isSameMonth(day, viewMonth)
                const dayEntries = inMonth ? (entriesByDate.get(key) ?? []) : []
                const dayShifts = inMonth ? (shiftsByDate.get(key) ?? []) : []
                const dayMins = dayEntries.reduce((s, e) => s + e.durationMin, 0)
                const flownSims = new Set(dayEntries.map((e) => `${e.pilotUserId}:${e.simulatorSlug}`))
                return (
                  <div
                    key={key}
                    className={cn(
                      'min-h-[7.5rem] border-r border-border p-1.5 last:border-r-0',
                      !inMonth && 'bg-muted/20 text-muted-foreground/60',
                      isToday(day) && inMonth && 'bg-primary/[0.04]',
                    )}
                  >
                    <div className="mb-1 flex items-center justify-between gap-1">
                      <span
                        className={cn(
                          'text-xs font-medium',
                          isToday(day) && inMonth && 'text-primary',
                        )}
                      >
                        {format(day, 'd')}
                      </span>
                      {dayMins > 0 ? (
                        <span className="font-mono text-[10px] tabular-nums text-muted-foreground">
                          {dayMins}′
                        </span>
                      ) : null}
                    </div>
                    <div className="flex flex-col gap-1">
                      {dayShifts.map((s) => {
                        const hasFlight = flownSims.has(`${s.userId}:${s.simulatorSlug}`)
                        return (
                          <div
                            key={s.id}
                            className={cn(
                              'rounded px-1.5 py-0.5 text-[10px] leading-tight',
                              hasFlight
                                ? 'border border-white/30 bg-black/10 text-foreground'
                                : 'border border-dashed border-border bg-muted/40 text-muted-foreground',
                            )}
                            title={`Смена · ${pilotName(s.userId)} · ${labelOf(SIMULATOR_OPTIONS, s.simulatorSlug)}`}
                          >
                            Смена · {simShort(s.simulatorSlug)}
                            {!isPilot ? ` · ${pilotName(s.userId)}` : ''}
                          </div>
                        )
                      })}
                      {dayEntries.map((e) => (
                        <div
                          key={e.id}
                          className="rounded px-1.5 py-1 text-[10px] leading-tight text-white"
                          style={{ backgroundColor: pilotColor(e.pilotUserId) }}
                          title={`${pilotName(e.pilotUserId)} · ${e.startTime}–${e.endTime} · ${labelOf(SIMULATOR_OPTIONS, e.simulatorSlug)} · ${e.clientName}`}
                        >
                          <div className="truncate font-medium">
                            {isPilot ? e.clientName : pilotName(e.pilotUserId)}
                          </div>
                          <div className="truncate opacity-90">
                            {e.startTime} · {simShort(e.simulatorSlug)} · {e.durationMin}′
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </section>

      {/* Смены в графике */}
      <section className="rounded-lg border border-border bg-background">
        <div className="border-b border-border px-4 py-3">
          <h2 className="text-sm font-semibold">Смены в графике (план)</h2>
        </div>
        <div className="overflow-x-auto">
          <Table className="min-w-[480px]">
            <TableHeader>
              <TableRow className="bg-muted/40 text-xs text-muted-foreground">
                <TableHead className="px-3 py-2">Дата</TableHead>
                <TableHead className="px-3 py-2">Пилот</TableHead>
                <TableHead className="px-3 py-2">Тренажёр</TableHead>
                <TableHead className="px-3 py-2">Статус дня</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {shifts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-16 text-center text-sm text-muted-foreground">
                    Смен в графике на этот месяц нет.
                  </TableCell>
                </TableRow>
              ) : (
                shifts.map((s) => {
                  const past = s.date < todayKey
                  const today = s.date === todayKey
                  return (
                    <TableRow key={s.id} className="border-border/70">
                      <TableCell className="px-3 py-2 whitespace-nowrap">
                        {formatAdminDate(s.date)}
                      </TableCell>
                      <TableCell className="px-3 py-2 whitespace-nowrap">
                        {pilotName(s.userId)}
                      </TableCell>
                      <TableCell className="px-3 py-2 text-muted-foreground">
                        {labelOf(SIMULATOR_OPTIONS, s.simulatorSlug)}
                      </TableCell>
                      <TableCell className="px-3 py-2 text-sm">
                        <span
                          className={cn(
                            today && 'font-medium text-foreground',
                            past && 'text-muted-foreground',
                            !past && !today && 'text-emerald-700 dark:text-emerald-400',
                          )}
                        >
                          {today ? 'Сегодня' : past ? 'Прошла' : 'Предстоит'}
                        </span>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>
      </section>

      {/* Хронометраж списком */}
      <section className="rounded-lg border border-border bg-background">
        <div className="border-b border-border px-4 py-3">
          <h2 className="text-sm font-semibold">Хронометраж полётов</h2>
        </div>
        <div className="overflow-x-auto">
          <Table className="min-w-[640px]">
            <TableHeader>
              <TableRow className="bg-muted/40 text-xs text-muted-foreground">
                <TableHead className="px-3 py-2">Дата</TableHead>
                <TableHead className="px-3 py-2">Время</TableHead>
                <TableHead className="px-3 py-2">Пилот</TableHead>
                <TableHead className="px-3 py-2">Тренажёр</TableHead>
                <TableHead className="px-3 py-2">Клиент</TableHead>
                <TableHead className="px-3 py-2 text-right">Мин</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-16 text-center text-sm text-muted-foreground">
                    Нет подтверждённых полётов с назначенным пилотом за этот месяц.
                  </TableCell>
                </TableRow>
              ) : (
                entries.map((e) => (
                  <TableRow key={e.id} className="border-border/70">
                    <TableCell className="px-3 py-2 whitespace-nowrap">
                      {formatAdminDate(e.date)}
                    </TableCell>
                    <TableCell className="px-3 py-2 font-mono text-sm tabular-nums whitespace-nowrap">
                      {e.startTime}–{e.endTime}
                    </TableCell>
                    <TableCell className="px-3 py-2 whitespace-nowrap">
                      {pilotName(e.pilotUserId)}
                    </TableCell>
                    <TableCell className="px-3 py-2 text-muted-foreground">
                      {labelOf(SIMULATOR_OPTIONS, e.simulatorSlug)}
                    </TableCell>
                    <TableCell className="px-3 py-2">{e.clientName}</TableCell>
                    <TableCell className="px-3 py-2 text-right font-mono tabular-nums">
                      {e.durationMin}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </section>

      {/* Итоги + комментарии */}
      <section className="rounded-lg border border-border bg-background">
        <div className="border-b border-border px-4 py-3">
          <h2 className="text-sm font-semibold">Итоги / комментарии</h2>
        </div>
        <div className="overflow-x-auto">
          <Table className="min-w-[560px]">
            <TableHeader>
              <TableRow className="bg-muted/40 text-xs text-muted-foreground">
                <TableHead className="px-3 py-2">Пилот</TableHead>
                <TableHead className="px-3 py-2">Тренажёр</TableHead>
                <TableHead className="px-3 py-2">Факт</TableHead>
                <TableHead className="px-3 py-2">Комментарий</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {totals.map((row) => {
                const key = `${row.userId}:${row.simulatorSlug}`
                return (
                  <TableRow key={key} className="border-border/70">
                    <TableCell className="px-3 py-2 font-medium whitespace-nowrap">
                      {row.pilotName ?? pilotName(row.userId)}
                    </TableCell>
                    <TableCell className="px-3 py-2 text-muted-foreground">
                      {labelOf(SIMULATOR_OPTIONS, row.simulatorSlug)}
                    </TableCell>
                    <TableCell className="px-3 py-2 font-mono text-sm tabular-nums whitespace-nowrap">
                      {minsLabel(row.minutes)}
                    </TableCell>
                    <TableCell className="px-3 py-2">
                      <Input
                        className="h-8"
                        disabled={!canEdit}
                        value={comments[key] ?? ''}
                        placeholder="—"
                        onChange={(e) => {
                          const comment = e.target.value
                          setComments((c) => ({ ...c, [key]: comment }))
                        }}
                      />
                    </TableCell>
                  </TableRow>
                )
              })}
              <TableRow className="bg-muted/30 font-semibold">
                <TableCell className="px-3 py-3" colSpan={2}>
                  Всего отработано за месяц
                </TableCell>
                <TableCell className="px-3 py-3 font-mono text-sm tabular-nums" colSpan={2}>
                  {minsLabel(totalMinutes)}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </section>
    </div>
  )
}
