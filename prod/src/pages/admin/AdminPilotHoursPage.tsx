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

type PilotTimesheetRow = {
  userId: string
  pilotName: string
  boeingMin: number
  mi2Min: number
  totalMin: number
  comment: string
}

const WEEKDAY_LABELS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'] as const

function minsLabel(minutes: number) {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (minutes <= 0) return '0 мин'
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

  const entries = data?.entries ?? []
  const shifts = data?.shifts ?? []
  const totals = data?.totals ?? []

  const timesheet = React.useMemo(() => {
    const byPilot = new Map<string, PilotTimesheetRow>()
    for (const row of totals) {
      const prev = byPilot.get(row.userId) ?? {
        userId: row.userId,
        pilotName: row.pilotName ?? pilotName(row.userId),
        boeingMin: 0,
        mi2Min: 0,
        totalMin: 0,
        comment: '',
      }
      if (row.simulatorSlug === 'mi-2') prev.mi2Min += row.minutes || 0
      else prev.boeingMin += row.minutes || 0
      prev.totalMin = prev.boeingMin + prev.mi2Min
      if (!prev.comment && row.comment?.trim()) prev.comment = row.comment
      if (row.pilotName) prev.pilotName = row.pilotName
      byPilot.set(row.userId, prev)
    }
    return [...byPilot.values()]
      .filter((r) => r.totalMin > 0)
      .sort((a, b) => a.pilotName.localeCompare(b.pilotName, 'ru'))
  }, [totals, pilotName])

  React.useEffect(() => {
    const next: Record<string, string> = {}
    for (const row of timesheet) {
      next[row.userId] = row.comment ?? ''
    }
    setComments(next)
  }, [timesheet])

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
    () => timesheet.reduce((sum, row) => sum + row.totalMin, 0),
    [timesheet],
  )

  const save = async () => {
    if (!canEdit) return
    setBusy(true)
    try {
      // Комментарий на пилота; минуты по-прежнему из полётов
      await apiFetch('/api/admin/pilot-hours', {
        method: 'PUT',
        body: JSON.stringify({
          month: monthKey,
          rows: timesheet.flatMap((g) => {
            const comment = comments[g.userId] ?? ''
            return [
              {
                userId: g.userId,
                simulatorSlug: 'boeing-737',
                minutes: g.boeingMin,
                comment,
              },
              {
                userId: g.userId,
                simulatorSlug: 'mi-2',
                minutes: g.mi2Min,
                comment: '',
              },
            ]
          }),
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
          ? 'Календарь — ваши полёты по дням. Ниже табель: время по тренажёрам и итог за месяц.'
          : 'Календарь — факт по дням. Табель — пилоты, кто летал в выбранном месяце, время по тренажёрам и итог.'}
      </p>

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
            <div key={wi} className="grid grid-cols-7 border-b border-border last:border-b-0">
              {week.map((day) => {
                const key = format(day, 'yyyy-MM-dd')
                const inMonth = isSameMonth(day, viewMonth)
                const dayEntries = inMonth ? (entriesByDate.get(key) ?? []) : []
                const dayShifts = inMonth ? (shiftsByDate.get(key) ?? []) : []
                const dayMins = dayEntries.reduce((s, e) => s + e.durationMin, 0)
                const flownSims = new Set(
                  dayEntries.map((e) => `${e.pilotUserId}:${e.simulatorSlug}`),
                )
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

      <section className="rounded-lg border border-border bg-background">
        <div className="border-b border-border px-4 py-3">
          <h2 className="text-sm font-semibold">Табель рабочего времени</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Пилоты, у кого были полёты в {monthLabel}. Детализация по дням — в календаре выше.
          </p>
        </div>
        <div className="overflow-x-auto">
          <Table className="min-w-[720px]">
            <TableHeader>
              <TableRow className="bg-muted/40 text-xs text-muted-foreground">
                <TableHead className="px-3 py-2">Пилот</TableHead>
                <TableHead className="px-3 py-2">Boeing 737</TableHead>
                <TableHead className="px-3 py-2">Ми-2</TableHead>
                <TableHead className="px-3 py-2">Итого за месяц</TableHead>
                <TableHead className="px-3 py-2">Комментарий</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {timesheet.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-16 text-center text-sm text-muted-foreground">
                    За этот месяц нет полётов с назначенным пилотом.
                  </TableCell>
                </TableRow>
              ) : (
                timesheet.map((row) => (
                  <TableRow key={row.userId} className="border-border/70">
                    <TableCell className="px-3 py-2 font-medium whitespace-nowrap">
                      <span className="inline-flex items-center gap-2">
                        <span
                          className="size-2.5 shrink-0 rounded-full"
                          style={{ backgroundColor: pilotColor(row.userId) }}
                          aria-hidden
                        />
                        {row.pilotName}
                      </span>
                    </TableCell>
                    <TableCell className="px-3 py-2 font-mono text-sm tabular-nums whitespace-nowrap">
                      {minsLabel(row.boeingMin)}
                    </TableCell>
                    <TableCell className="px-3 py-2 font-mono text-sm tabular-nums whitespace-nowrap">
                      {minsLabel(row.mi2Min)}
                    </TableCell>
                    <TableCell className="px-3 py-2 font-mono text-sm font-semibold tabular-nums whitespace-nowrap">
                      {minsLabel(row.totalMin)}
                    </TableCell>
                    <TableCell className="px-3 py-2 min-w-[220px]">
                      <Input
                        className="h-8"
                        disabled={!canEdit}
                        value={comments[row.userId] ?? ''}
                        placeholder="Комментарий по пилоту"
                        onChange={(e) => {
                          const comment = e.target.value
                          setComments((c) => ({ ...c, [row.userId]: comment }))
                        }}
                      />
                    </TableCell>
                  </TableRow>
                ))
              )}
              {timesheet.length > 0 ? (
                <TableRow className="bg-muted/30 font-semibold">
                  <TableCell className="px-3 py-3">Всего по залу</TableCell>
                  <TableCell className="px-3 py-3 font-mono text-sm tabular-nums" colSpan={3}>
                    {minsLabel(totalMinutes)}
                  </TableCell>
                  <TableCell className="px-3 py-3" />
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </div>
      </section>
    </div>
  )
}
