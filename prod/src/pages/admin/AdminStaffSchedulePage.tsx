import * as React from 'react'
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isBefore,
  isSameMonth,
  isWeekend,
  parseISO,
  startOfMonth,
  startOfToday,
  startOfWeek,
  subMonths,
} from 'date-fns'
import { ru } from 'date-fns/locale'
import { ChevronDown, ChevronUp, ChevronRight, MoreHorizontal, Plus } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useLiveData } from '@/hooks/useLiveData'
import { apiFetch, type AdminUser, type ApiStaffShift } from '@/lib/api'
import { useAdminAuth } from '@/contexts/AdminAuthContext'
import { canEditStaffShift } from '@/lib/admin-access'
import { cn } from '@/lib/utils'

type Vehicle = 'plane' | 'helicopter'

type StaffShiftUi = {
  id: string
  name: string
  vehicles: Vehicle[]
  color: string
  userId: string
  canDelete: boolean
  onDelete: () => void
}

const WEEKDAY_LABELS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'] as const
const WEEKDAY_2_BY_GET_DAY = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'] as const

function weekdayTwoLetters(d: Date) {
  return WEEKDAY_2_BY_GET_DAY[d.getDay()]
}

function dateKey(d: Date) {
  return format(d, 'yyyy-MM-dd')
}

function slugToVehicles(slug: string): Vehicle[] {
  if (slug === 'mi-2') return ['helicopter']
  if (slug === 'boeing-737') return ['plane']
  return ['helicopter', 'plane']
}

function mapShift(row: ApiStaffShift): Omit<StaffShiftUi, 'canDelete' | 'onDelete'> {
  return {
    id: row.id,
    name: row.user?.fullName ?? 'Сотрудник',
    vehicles: slugToVehicles(row.simulatorSlug),
    color: row.user?.color ?? '#2563eb',
    userId: row.userId,
  }
}

function VehicleEmojis({ vehicles }: { vehicles: Vehicle[] }) {
  return (
    <span className="inline-flex shrink-0 items-center gap-0.5 text-[0.85rem] leading-none opacity-95">
      {vehicles.includes('helicopter') ? <span aria-hidden>🚁</span> : null}
      {vehicles.includes('plane') ? <span aria-hidden>✈️</span> : null}
    </span>
  )
}

function ShiftRecordMenu({
  shift,
  canDelete,
  onDelete,
}: {
  shift: StaffShiftUi
  canDelete: boolean
  onDelete: () => void
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          style={{ backgroundColor: shift.color }}
          className="flex min-h-8 w-full min-w-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-left text-xs font-medium text-white shadow-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
          aria-label={`${shift.name}, действия`}
        >
          <span className="min-w-0 flex-1 truncate">{shift.name}</span>
          <VehicleEmojis vehicles={shift.vehicles} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuItem disabled>Просмотр</DropdownMenuItem>
        {canDelete ? (
          <DropdownMenuItem
            className="text-destructive focus:bg-destructive/10 focus:text-destructive"
            onClick={onDelete}
          >
            Удалить
          </DropdownMenuItem>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function DayCell({
  day,
  displayMonth,
  shifts,
  expanded,
  onToggleExpand,
  onAddDay,
}: {
  day: Date
  displayMonth: Date
  shifts: StaffShiftUi[]
  expanded: boolean
  onToggleExpand: () => void
  onAddDay: () => void
}) {
  const inMonth = isSameMonth(day, displayMonth)
  const weekend = isWeekend(day)
  const count = shifts.length
  const dayNum = format(day, 'd', { locale: ru })
  const dowShort = weekdayTwoLetters(day)

  return (
    <div className={cn('flex min-h-[132px] flex-col bg-background p-2', !inMonth && 'bg-muted/30')}>
      <div className="mb-2 flex items-start justify-between gap-1">
        <div
          className={cn(
            'text-xs font-medium leading-tight tabular-nums',
            !inMonth && 'text-muted-foreground',
            inMonth && weekend && 'text-red-600',
            inMonth && !weekend && 'text-foreground',
          )}
        >
          {dayNum} <span>{dowShort}</span>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-7 shrink-0 text-muted-foreground hover:text-foreground"
          aria-label="Добавить запись"
          onClick={onAddDay}
        >
          <Plus className="size-4" />
        </Button>
      </div>

      <div className="flex flex-1 flex-col gap-1">
        {count === 0 ? (
          <button
            type="button"
            onClick={onAddDay}
            className="flex min-h-10 w-full items-center justify-center rounded-full border border-dashed border-muted-foreground/25 bg-muted/40 text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
          >
            <Plus className="size-4" />
            <span className="sr-only">Добавить смену</span>
          </button>
        ) : count === 1 ? (
          <ShiftRecordMenu shift={shifts[0]} canDelete={shifts[0].canDelete} onDelete={shifts[0].onDelete} />
        ) : expanded ? (
          <div className="flex flex-col gap-1">
            <div className="flex justify-end">
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="size-8 shrink-0"
                aria-label="Свернуть список записей"
                onClick={onToggleExpand}
              >
                <ChevronUp className="size-4" />
              </Button>
            </div>
            {shifts.map((s) => (
              <ShiftRecordMenu key={s.id} shift={s} canDelete={s.canDelete} onDelete={s.onDelete} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-1">
              <div className="min-w-0 flex-1">
                <ShiftRecordMenu shift={shifts[0]} canDelete={shifts[0].canDelete} onDelete={shifts[0].onDelete} />
              </div>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="size-8 shrink-0"
                aria-label="Развернуть список записей"
                onClick={onToggleExpand}
              >
                <ChevronDown className="size-4" />
              </Button>
            </div>
            <p className="px-1 text-[10px] text-muted-foreground">+{count - 1} ещё</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default function AdminStaffSchedulePage() {
  const { session } = useAdminAuth()
  const [viewMonth, setViewMonth] = React.useState(() => new Date())
  const [expandedByKey, setExpandedByKey] = React.useState<Record<string, boolean>>({})
  const [addForDate, setAddForDate] = React.useState<string | null>(null)
  const [simulatorSlug, setSimulatorSlug] = React.useState('boeing-737')
  const [pilotId, setPilotId] = React.useState('')

  const monthKey = format(viewMonth, 'yyyy-MM')
  const { data: apiShiftsData, reload } = useLiveData(
    () => apiFetch<ApiStaffShift[]>(`/api/admin/staff-shifts?month=${monthKey}`),
    [monthKey],
  )
  const apiShifts = apiShiftsData ?? []

  const isManager = session?.role === 'ADMIN' || session?.role === 'MANAGER'
  const { data: pilotsData } = useLiveData(
    () => (isManager ? apiFetch<AdminUser[]>('/api/admin/pilots') : Promise.resolve([])),
    [isManager],
  )
  const pilots = pilotsData ?? []

  const shiftsByDate = React.useMemo(() => {
    const map = new Map<string, StaffShiftUi[]>()
    for (const row of apiShifts) {
      const ui = mapShift(row)
      const canDelete = session
        ? canEditStaffShift(session.role, row.userId, session.userId)
        : false
      const enriched: StaffShiftUi = {
        ...ui,
        canDelete,
        onDelete: () => {
          void apiFetch(`/api/admin/staff-shifts/${row.id}`, { method: 'DELETE' }).then(() => reload())
        },
      }
      const list = map.get(row.date) ?? []
      list.push(enriched)
      map.set(row.date, list)
    }
    return map
  }, [apiShifts, session, reload])

  const monthStart = startOfMonth(viewMonth)
  const monthEnd = endOfMonth(viewMonth)
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 })
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd })

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
    await apiFetch('/api/admin/staff-shifts', {
      method: 'POST',
      body: JSON.stringify({
        date: addForDate,
        simulatorSlug,
        userId: isManager ? pilotId || pilots[0]?.id : session.userId,
      }),
    })
    setAddForDate(null)
    void reload()
  }

  return (
    <div className="flex w-full min-w-0 flex-col gap-4">
      {addForDate ? (
        <div className="flex flex-col gap-2 rounded-lg border bg-background p-4 sm:flex-row sm:items-end">
          <p className="text-sm font-medium">Смена на {addForDate}</p>
          {isManager ? (
            <select
              className="h-9 rounded-md border bg-background px-2 text-sm"
              value={pilotId || pilots[0]?.id || ''}
              onChange={(e) => setPilotId(e.target.value)}
            >
              {pilots.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.fullName}
                </option>
              ))}
            </select>
          ) : null}
          <select
            className="h-9 rounded-md border bg-background px-2 text-sm"
            value={simulatorSlug}
            onChange={(e) => setSimulatorSlug(e.target.value)}
          >
            <option value="boeing-737">Boeing 737</option>
            <option value="mi-2">Ми-2</option>
          </select>
          <Button type="button" onClick={() => void submitShift()}>
            Сохранить
          </Button>
          <Button type="button" variant="outline" onClick={() => setAddForDate(null)}>
            Отмена
          </Button>
        </div>
      ) : null}

      <div className="flex w-full min-w-0 items-center gap-2 sm:gap-6">
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="shrink-0"
          aria-label="Предыдущий месяц"
          onClick={() => canGoPrev && setViewMonth((d) => addMonths(d, -1))}
          disabled={!canGoPrev}
        >
          <ChevronRight className="size-4 rotate-180" />
        </Button>
        <h2 className="min-w-0 flex-1 truncate text-center text-base font-semibold capitalize leading-tight text-foreground sm:text-lg">
          {titleCased}
        </h2>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="shrink-0"
          aria-label="Следующий месяц"
          onClick={() => canGoNext && setViewMonth((d) => addMonths(d, 1))}
          disabled={!canGoNext}
        >
          <ChevronRight className="size-4" />
        </Button>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border bg-muted/40 p-px">
        <div className="min-w-[720px]">
          <div className="grid grid-cols-7 gap-px bg-border">
            {WEEKDAY_LABELS.map((w) => (
              <div
                key={w}
                className="bg-muted/50 px-2 py-2 text-center text-xs font-semibold text-muted-foreground"
              >
                {w}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-px bg-border">
            {days.map((day) => {
              const key = dateKey(day)
              const shifts = shiftsByDate.get(key) ?? []
              return (
                <DayCell
                  key={key}
                  day={day}
                  displayMonth={viewMonth}
                  shifts={shifts}
                  expanded={!!expandedByKey[key]}
                  onToggleExpand={() =>
                    setExpandedByKey((prev) => ({ ...prev, [key]: !prev[key] }))
                  }
                  onAddDay={() => tryAddDay(key)}
                />
              )
            })}
          </div>
        </div>
      </div>

      <p className="flex items-center gap-2 text-xs text-muted-foreground">
        <MoreHorizontal className="size-4 shrink-0 opacity-60" aria-hidden />
        Изменения сохраняются сразу и видны всем открытым сессиям.
      </p>
    </div>
  )
}
