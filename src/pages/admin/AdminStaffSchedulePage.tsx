import * as React from 'react'
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  isWeekend,
  startOfMonth,
  startOfWeek,
} from 'date-fns'
import { ru } from 'date-fns/locale'
import {
  ChevronDown,
  ChevronUp,
  ChevronRight,
  MoreHorizontal,
  Plus,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'

type Vehicle = 'plane' | 'helicopter'

export type StaffShift = {
  id: string
  name: string
  vehicles: Vehicle[]
  /** Tailwind classes для фона и текста плашки */
  tone: string
}

const WEEKDAY_LABELS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'] as const

/** Два символа по getDay(): 0 = Вс … 6 = Сб */
const WEEKDAY_2_BY_GET_DAY = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'] as const

function weekdayTwoLetters(d: Date) {
  return WEEKDAY_2_BY_GET_DAY[d.getDay()]
}

function dateKey(d: Date) {
  return format(d, 'yyyy-MM-dd')
}

/** Демо-данные под макет (сентябрь 2025); при переключении месяца ячейки без ключей — пустые */
const DEMO_SHIFTS: Record<string, StaffShift[]> = {
  '2025-09-01': [
    {
      id: 'a',
      name: 'Николай',
      vehicles: ['helicopter'],
      tone: 'bg-cyan-600 text-white hover:bg-cyan-600/90',
    },
  ],
  '2025-09-02': [
    {
      id: 'b',
      name: 'Валентин',
      vehicles: ['plane', 'helicopter'],
      tone: 'bg-orange-500 text-white hover:bg-orange-500/90',
    },
  ],
  '2025-09-03': [
    {
      id: 'c',
      name: 'Вячеслав',
      vehicles: ['plane'],
      tone: 'bg-violet-600 text-white hover:bg-violet-600/90',
    },
  ],
  '2025-09-04': [
    {
      id: 'd',
      name: 'Константин',
      vehicles: ['helicopter'],
      tone: 'bg-emerald-600 text-white hover:bg-emerald-600/90',
    },
  ],
  '2025-09-05': [
    {
      id: 'e',
      name: 'Алексей',
      vehicles: ['plane'],
      tone: 'bg-blue-600 text-white hover:bg-blue-600/90',
    },
  ],
  '2025-09-18': [
    {
      id: 'f1',
      name: 'Николай',
      vehicles: ['helicopter'],
      tone: 'bg-cyan-600 text-white',
    },
    {
      id: 'f2',
      name: 'Валентин',
      vehicles: ['plane'],
      tone: 'bg-orange-500 text-white',
    },
    {
      id: 'f3',
      name: 'Алексей',
      vehicles: ['helicopter', 'plane'],
      tone: 'bg-blue-600 text-white',
    },
    {
      id: 'f4',
      name: 'Константин',
      vehicles: ['plane'],
      tone: 'bg-emerald-600 text-white',
    },
  ],
  '2025-09-24': [
    {
      id: 'g',
      name: 'Олег',
      vehicles: ['plane'],
      tone: 'bg-amber-700 text-white hover:bg-amber-700/90',
    },
  ],
}

function VehicleEmojis({ vehicles }: { vehicles: Vehicle[] }) {
  const showPlane = vehicles.includes('plane')
  const showHeli = vehicles.includes('helicopter')
  return (
    <span className="inline-flex shrink-0 items-center gap-0.5 text-[0.85rem] leading-none opacity-95">
      {showHeli ? <span aria-hidden>🚁</span> : null}
      {showPlane ? <span aria-hidden>✈️</span> : null}
    </span>
  )
}

function ShiftRecordMenu({ shift }: { shift: StaffShift }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn(
            'flex min-h-8 w-full min-w-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-left text-xs font-medium shadow-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring',
            shift.tone,
          )}
          aria-label={`${shift.name}, действия`}
        >
          <span className="min-w-0 flex-1 truncate">{shift.name}</span>
          <VehicleEmojis vehicles={shift.vehicles} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuItem>Редактировать</DropdownMenuItem>
        <DropdownMenuItem className="text-destructive focus:bg-destructive/10 focus:text-destructive">
          Удалить
        </DropdownMenuItem>
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
  shifts: StaffShift[]
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
    <div
      className={cn(
        'flex min-h-[132px] flex-col bg-background p-2',
        !inMonth && 'bg-muted/30',
      )}
    >
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
          onClick={() => onAddDay()}
        >
          <Plus className="size-4" />
        </Button>
      </div>

      <div className="flex flex-1 flex-col gap-1">
        {count === 0 ? (
          <button
            type="button"
            onClick={() => onAddDay()}
            className="flex min-h-10 w-full items-center justify-center rounded-full border border-dashed border-muted-foreground/25 bg-muted/40 text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
          >
            <Plus className="size-4" />
            <span className="sr-only">Добавить смену</span>
          </button>
        ) : count === 1 ? (
          <ShiftRecordMenu shift={shifts[0]} />
        ) : expanded ? (
          <div className="flex flex-col gap-1">
            <div className="flex justify-end">
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="size-8 shrink-0"
                aria-label="Свернуть список записей"
                onClick={() => onToggleExpand()}
              >
                <ChevronUp className="size-4" />
              </Button>
            </div>
            {shifts.map((s) => (
              <ShiftRecordMenu key={s.id} shift={s} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-1">
              <div className="min-w-0 flex-1">
                <ShiftRecordMenu shift={shifts[0]} />
              </div>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="size-8 shrink-0"
                aria-label="Развернуть список записей"
                onClick={() => onToggleExpand()}
              >
                <ChevronDown className="size-4" />
              </Button>
            </div>
            <p className="px-1 text-[10px] text-muted-foreground">
              +{count - 1} ещё
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

export default function AdminStaffSchedulePage() {
  const [viewMonth, setViewMonth] = React.useState(() => new Date(2025, 8, 1))
  const [expandedByKey, setExpandedByKey] = React.useState<Record<string, boolean>>(
    {},
  )

  const monthStart = startOfMonth(viewMonth)
  const monthEnd = endOfMonth(viewMonth)
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 })
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd })

  const title = format(viewMonth, 'LLLL yyyy', { locale: ru })
  const titleCased = title.replace(/^(.)/, (c) => c.toUpperCase())

  const toggleExpand = (key: string) => {
    setExpandedByKey((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  return (
    <div className="flex w-full min-w-0 flex-col gap-4">
      <div className="flex w-full min-w-0 items-center gap-2 sm:gap-6">
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="shrink-0"
          aria-label="Предыдущий месяц"
          onClick={() => setViewMonth((d) => addMonths(d, -1))}
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
          onClick={() => setViewMonth((d) => addMonths(d, 1))}
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
              const shifts = DEMO_SHIFTS[key] ?? []
              return (
                <DayCell
                  key={key}
                  day={day}
                  displayMonth={viewMonth}
                  shifts={shifts}
                  expanded={!!expandedByKey[key]}
                  onToggleExpand={() => toggleExpand(key)}
                  onAddDay={() => {
                    // заглушка под будущий функционал
                  }}
                />
              )
            })}
          </div>
        </div>
      </div>

      <p className="flex items-center gap-2 text-xs text-muted-foreground">
        <MoreHorizontal className="size-4 shrink-0 opacity-60" aria-hidden />
        Демо-заполнение для сентября 2025. В других месяцах ячейки пустые — данные
        придут с API.
      </p>
    </div>
  )
}
