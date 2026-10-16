import * as React from 'react'
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isBefore,
  isSameMonth,
  isToday,
  isWeekend,
  parseISO,
  startOfMonth,
  startOfToday,
  startOfWeek,
  subMonths,
} from 'date-fns'
import { ru } from 'date-fns/locale'
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Plane, Plus } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'

import AdminFormModal from '@/components/admin/AdminFormModal'
import ConfirmDialog from '@/components/admin/ConfirmDialog'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useHighlightRow } from '@/hooks/useHighlightRow'
import { useLiveData } from '@/hooks/useLiveData'
import { apiFetch, type AdminUser, type ApiStaffShift } from '@/lib/api'
import { useAdminAuth } from '@/contexts/AdminAuthContext'
import { useAdminUndo } from '@/contexts/AdminUndoContext'
import { canEditStaffShift } from '@/lib/admin-access'
import { cn } from '@/lib/utils'

type Vehicle = 'plane' | 'helicopter'

type StaffShiftUi = {
  id: string
  name: string
  vehicles: Vehicle[]
  color: string
  userId: string
  simulatorSlug: string
  date: string
  canDelete: boolean
}

const WEEKDAY_LABELS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'] as const

function dateKey(d: Date) {
  return format(d, 'yyyy-MM-dd')
}

function slugToVehicles(slug: string): Vehicle[] {
  if (slug === 'mi-2') return ['helicopter']
  if (slug === 'boeing-737') return ['plane']
  return ['helicopter', 'plane']
}

function mapShift(row: ApiStaffShift): Omit<StaffShiftUi, 'canDelete'> {
  return {
    id: row.id,
    name: row.user?.fullName ?? 'Сотрудник',
    vehicles: slugToVehicles(row.simulatorSlug),
    color: row.user?.color ?? '#2563eb',
    userId: row.userId,
    simulatorSlug: row.simulatorSlug,
    date: row.date,
  }
}

function VehicleIcons({ vehicles, color }: { vehicles: Vehicle[]; color: string }) {
  return (
    <span className="inline-flex shrink-0 items-center gap-0.5">
      {vehicles.includes('helicopter') ? (
        <span
          className="inline-flex size-[18px] items-center justify-center rounded-full bg-white text-[10px] leading-none shadow-sm"
          style={{ boxShadow: `inset 0 0 0 1px ${color}` }}
          aria-hidden
        >
          🚁
        </span>
      ) : null}
      {vehicles.includes('plane') ? (
        <span
          className="inline-flex size-[18px] items-center justify-center rounded-full bg-white shadow-sm"
          style={{ boxShadow: `inset 0 0 0 1px ${color}`, color }}
          aria-hidden
        >
          <Plane className="size-2.5" strokeWidth={2.5} />
        </span>
      ) : null}
    </span>
  )
}

function ShiftChip({
  shift,
  onRequestDelete,
  highlighted,
}: {
  shift: StaffShiftUi
  onRequestDelete: () => void
  highlighted?: boolean
}) {
  return (
    <div
      data-highlight-id={shift.id}
      className={cn(
        'rounded-md',
        highlighted && 'bg-primary/10 ring-2 ring-inset ring-primary/50',
      )}
    >
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="flex min-h-8 w-full min-w-0 items-center gap-1.5 rounded-md border px-2 py-1 text-left text-xs font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring"
            style={{
              backgroundColor: `color-mix(in srgb, ${shift.color} 14%, white)`,
              borderColor: `color-mix(in srgb, ${shift.color} 38%, transparent)`,
              color: shift.color,
            }}
            aria-label={`${shift.name}, действия`}
          >
            <span className="min-w-0 flex-1 truncate">{shift.name}</span>
            <VehicleIcons vehicles={shift.vehicles} color={shift.color} />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          <DropdownMenuItem disabled>Просмотр</DropdownMenuItem>
          {shift.canDelete ? (
            <DropdownMenuItem
              className="text-destructive focus:bg-destructive/10 focus:text-destructive"
              onClick={onRequestDelete}
            >
              Удалить
            </DropdownMenuItem>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

function DayCard({
  day,
  displayMonth,
  shifts,
  expanded,
  onToggleExpand,
  onAddDay,
  onRequestDelete,
  highlightId,
}: {
  day: Date
  displayMonth: Date
  shifts: StaffShiftUi[]
  expanded: boolean
  onToggleExpand: () => void
  onAddDay: () => void
  onRequestDelete: (shift: StaffShiftUi) => void
  highlightId?: string | null
}) {
  const inMonth = isSameMonth(day, displayMonth)
  const weekend = isWeekend(day)
  const today = isToday(day)
  const count = shifts.length
  const dayNum = format(day, 'd', { locale: ru })
  const visible = expanded || count <= 2 ? shifts : shifts.slice(0, 2)
  const hiddenCount = expanded ? 0 : Math.max(0, count - 2)

  return (
    <div
      className={cn(
        'flex min-h-[148px] flex-col rounded-lg border bg-background p-2.5 transition-colors',
        !inMonth && 'border-transparent bg-muted/25 opacity-55',
        inMonth && 'border-border/70 shadow-[0_1px_0_hsl(var(--border)/0.6)]',
        today && inMonth && 'border-primary/40 bg-primary/[0.03] ring-1 ring-primary/20',
      )}
    >
      <div className="mb-2 flex items-center justify-between gap-1">
        <div className="flex items-baseline gap-1.5">
          <span
            className={cn(
              'text-sm font-semibold tabular-nums leading-none',
              !inMonth && 'text-muted-foreground',
              inMonth && weekend && 'text-destructive',
              inMonth && !weekend && 'text-foreground',
            )}
          >
            {dayNum}
          </span>
          <span className="text-[11px] text-muted-foreground">{WEEKDAY_LABELS[(day.getDay() + 6) % 7]}</span>
        </div>
        {inMonth ? (
          <button
            type="button"
            className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Добавить запись"
            onClick={onAddDay}
          >
            <Plus className="size-4" />
          </button>
        ) : (
          <span className="size-7" />
        )}
      </div>

      <div className="flex flex-1 flex-col gap-1.5">
        {count === 0 ? (
          inMonth ? (
            <button
              type="button"
              onClick={onAddDay}
              className="flex min-h-9 w-full items-center justify-center rounded-md border border-dashed border-border bg-muted/30 text-muted-foreground transition-colors hover:border-primary/30 hover:bg-primary/[0.04] hover:text-foreground"
            >
              <Plus className="size-3.5" />
              <span className="sr-only">Добавить смену</span>
            </button>
          ) : null
        ) : (
          <>
            {visible.map((s) => (
              <ShiftChip
                key={s.id}
                shift={s}
                highlighted={highlightId === s.id}
                onRequestDelete={() => onRequestDelete(s)}
              />
            ))}
            {hiddenCount > 0 ? (
              <button
                type="button"
                onClick={onToggleExpand}
                className="inline-flex items-center justify-center gap-1 rounded-md px-1.5 py-1 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                +{hiddenCount} ещё
                <ChevronDown className="size-3.5" />
              </button>
            ) : null}
            {expanded && count > 2 ? (
              <button
                type="button"
                onClick={onToggleExpand}
                className="inline-flex items-center justify-center gap-1 rounded-md px-1.5 py-1 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                Свернуть
                <ChevronUp className="size-3.5" />
              </button>
            ) : null}
          </>
        )}
      </div>
    </div>
  )
}

export default function AdminStaffSchedulePage() {
  const { session } = useAdminAuth()
  const { pushUndo } = useAdminUndo()
  const [searchParams] = useSearchParams()
  const dateFromUrl = searchParams.get('date')
  const [viewMonth, setViewMonth] = React.useState(() => {
    if (dateFromUrl) {
      const parsed = parseISO(dateFromUrl)
      if (!Number.isNaN(parsed.getTime())) return parsed
    }
    return new Date()
  })
  const [expandedByKey, setExpandedByKey] = React.useState<Record<string, boolean>>({})
  const [addForDate, setAddForDate] = React.useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = React.useState<StaffShiftUi | null>(null)
  const [actionBusy, setActionBusy] = React.useState(false)
  const [simulatorSlug, setSimulatorSlug] = React.useState('boeing-737')
  const [pilotId, setPilotId] = React.useState('')

  React.useEffect(() => {
    if (!dateFromUrl) return
    const parsed = parseISO(dateFromUrl)
    if (Number.isNaN(parsed.getTime())) return
    setViewMonth(parsed)
    setExpandedByKey((prev) => ({ ...prev, [dateFromUrl]: true }))
  }, [dateFromUrl])

  const monthKey = format(viewMonth, 'yyyy-MM')
  const { data: apiShiftsData, reload } = useLiveData(
    () => apiFetch<ApiStaffShift[]>(`/api/admin/staff-shifts?month=${monthKey}`),
    [monthKey],
  )
  const apiShifts = apiShiftsData ?? []
  const { highlightId } = useHighlightRow(apiShiftsData !== null)

  React.useEffect(() => {
    if (!highlightId) return
    const hit = apiShifts.find((s) => s.id === highlightId)
    if (!hit) return
    setExpandedByKey((prev) => ({ ...prev, [hit.date]: true }))
  }, [highlightId, apiShifts])

  const isManager = session?.role === 'ADMIN' || session?.role === 'MANAGER'
  const { data: pilotsData } = useLiveData(
    () => (isManager ? apiFetch<AdminUser[]>('/api/admin/pilots') : Promise.resolve([])),
    [isManager],
  )
  const pilots = pilotsData ?? []
  const selectedPilot = pilots.find((p) => p.id === (pilotId || pilots[0]?.id))
  const simulatorOptions = React.useMemo(
    () =>
      isManager
        ? selectedPilot?.pilotSimulators.length
          ? selectedPilot.pilotSimulators
          : ['boeing-737', 'mi-2']
        : session?.user.pilotSimulators.length
          ? session.user.pilotSimulators
          : ['boeing-737'],
    [isManager, selectedPilot, session?.user.pilotSimulators],
  )

  React.useEffect(() => {
    if (!simulatorOptions.includes(simulatorSlug)) {
      setSimulatorSlug(simulatorOptions[0] ?? 'boeing-737')
    }
  }, [simulatorOptions, simulatorSlug])

  const shiftsByDate = React.useMemo(() => {
    const map = new Map<string, StaffShiftUi[]>()
    for (const row of apiShifts) {
      const ui = mapShift(row)
      const canDelete = session
        ? canEditStaffShift(session.role, row.userId, session.userId)
        : false
      const list = map.get(row.date) ?? []
      list.push({ ...ui, canDelete })
      map.set(row.date, list)
    }
    return map
  }, [apiShifts, session])

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

  const title = format(viewMonth, 'LLLL yyyy', { locale: ru })
  const titleCased = title.replace(/^(.)/, (c) => c.toUpperCase())

  const anchorMonth = startOfMonth(new Date())
  const minMonth = subMonths(anchorMonth, 4)
  const maxMonth = addMonths(anchorMonth, 2)
  const canGoPrev = startOfMonth(viewMonth) > minMonth
  const canGoNext = startOfMonth(viewMonth) < maxMonth

  const tryAddDay = (key: string) => {
    if (session?.role !== 'ADMIN' && isBefore(parseISO(key), startOfToday())) return
    setAddForDate(key)
  }

  const submitShift = async () => {
    if (!addForDate || !session) return
    setActionBusy(true)
    try {
      const created = await apiFetch<ApiStaffShift>('/api/admin/staff-shifts', {
        method: 'POST',
        body: JSON.stringify({
          date: addForDate,
          simulatorSlug,
          userId: isManager ? pilotId || pilots[0]?.id : session.userId,
        }),
      })
      pushUndo({
        label: 'Отменить добавление смены',
        run: async () => {
          await apiFetch(`/api/admin/staff-shifts/${created.id}`, { method: 'DELETE' })
          void reload()
        },
      })
      setAddForDate(null)
      void reload()
    } finally {
      setActionBusy(false)
    }
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    setActionBusy(true)
    try {
      const snapshot = deleteTarget
      await apiFetch(`/api/admin/staff-shifts/${snapshot.id}`, { method: 'DELETE' })
      pushUndo({
        label: `Отменить удаление смены «${snapshot.name}»`,
        run: async () => {
          await apiFetch('/api/admin/staff-shifts', {
            method: 'POST',
            body: JSON.stringify({
              id: snapshot.id,
              date: snapshot.date,
              simulatorSlug: snapshot.simulatorSlug,
              userId: snapshot.userId,
            }),
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
    <div className="flex w-full min-w-0 flex-col gap-5">
      <AdminFormModal
        open={!!addForDate}
        title="Новая смена"
        description={addForDate ? `Дата: ${addForDate}` : undefined}
        size="md"
        onClose={() => setAddForDate(null)}
      >
        <div className="flex flex-col gap-3">
          {isManager ? (
            <label className="text-sm">
              <span className="text-muted-foreground">Сотрудник</span>
              <select
                className="mt-1 flex h-9 w-full rounded-md border bg-background px-2 text-sm"
                value={pilotId || pilots[0]?.id || ''}
                onChange={(e) => setPilotId(e.target.value)}
              >
                {pilots.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.fullName}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          <label className="text-sm">
            <span className="text-muted-foreground">Тренажёр</span>
            <select
              className="mt-1 flex h-9 w-full rounded-md border bg-background px-2 text-sm"
              value={simulatorSlug}
              onChange={(e) => setSimulatorSlug(e.target.value)}
            >
              {simulatorOptions.map((slug) => (
                <option key={slug} value={slug}>
                  {slug === 'boeing-737' ? 'Boeing 737' : slug === 'mi-2' ? 'Ми-2' : slug}
                </option>
              ))}
            </select>
          </label>
          <div className="flex gap-2 pt-1">
            <Button type="button" onClick={() => void submitShift()} disabled={actionBusy}>
              Сохранить
            </Button>
            <Button type="button" variant="outline" onClick={() => setAddForDate(null)} disabled={actionBusy}>
              Отмена
            </Button>
          </div>
        </div>
      </AdminFormModal>

      <div className="flex w-full min-w-0 items-center gap-2 sm:gap-4">
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="size-9 shrink-0 rounded-md"
          aria-label="Предыдущий месяц"
          onClick={() => canGoPrev && setViewMonth((d) => addMonths(d, -1))}
          disabled={!canGoPrev}
        >
          <ChevronLeft className="size-4" />
        </Button>
        <h2 className="min-w-0 flex-1 text-center text-base font-semibold leading-tight text-foreground sm:text-lg">
          {titleCased}
        </h2>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="size-9 shrink-0 rounded-md"
          aria-label="Следующий месяц"
          onClick={() => canGoNext && setViewMonth((d) => addMonths(d, 1))}
          disabled={!canGoNext}
        >
          <ChevronRight className="size-4" />
        </Button>
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[760px] space-y-3">
          <div className="grid grid-cols-7 gap-2 px-0.5">
            {WEEKDAY_LABELS.map((w) => (
              <div
                key={w}
                className="px-1 text-center text-[11px] font-medium uppercase tracking-wide text-muted-foreground"
              >
                {w}
              </div>
            ))}
          </div>

          {weeks.map((week) => (
            <div key={dateKey(week[0])} className="grid grid-cols-7 gap-2">
              {week.map((day) => {
                const key = dateKey(day)
                const shifts = shiftsByDate.get(key) ?? []
                return (
                  <DayCard
                    key={key}
                    day={day}
                    displayMonth={viewMonth}
                    shifts={shifts}
                    expanded={!!expandedByKey[key]}
                    onToggleExpand={() =>
                      setExpandedByKey((prev) => ({ ...prev, [key]: !prev[key] }))
                    }
                    onAddDay={() => tryAddDay(key)}
                    onRequestDelete={setDeleteTarget}
                    highlightId={highlightId}
                  />
                )
              })}
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm bg-primary/25 ring-1 ring-primary/35" />
          Сегодня
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span
            className="inline-flex size-[18px] items-center justify-center rounded-full bg-white"
            style={{ boxShadow: 'inset 0 0 0 1px #0891b2', color: '#0891b2' }}
          >
            <Plane className="size-2.5" strokeWidth={2.5} />
          </span>
          Boeing 737
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span
            className="inline-flex size-[18px] items-center justify-center rounded-full bg-white text-[10px]"
            style={{ boxShadow: 'inset 0 0 0 1px #ea580c' }}
          >
            🚁
          </span>
          Ми-2
        </span>
      </div>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Удалить смену?"
        description={
          deleteTarget
            ? `Смена «${deleteTarget.name}» на ${deleteTarget.date} будет удалена. Действие можно отменить вверху страницы.`
            : undefined
        }
        confirmLabel="Удалить"
        destructive
        busy={actionBusy}
        onConfirm={() => void confirmDelete()}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}
