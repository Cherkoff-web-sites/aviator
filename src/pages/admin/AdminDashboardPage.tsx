import * as React from 'react'
import { format } from 'date-fns'
import { Check, Clock, Info, Loader2, MoreHorizontal, Plus } from 'lucide-react'
import { ru } from 'date-fns/locale'
import { Calendar } from '@/components/ui/calendar'
import { Button } from '@/components/ui/button'
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
import { cn } from '@/lib/utils'

/** UTF-8 в репозитории, JSON и Vercel; для MySQL в БД — utf8mb4. */
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
}

const BOOKING_ROWS: BookingRow[] = [
  {
    id: '1',
    name: 'Арсений',
    phone: '+375 (12) 1234567',
    simulator: 'plane',
    status: 'in_progress',
    paid: true,
    time: '12.00 - 12.30',
    method: 'online',
    comment: 'Будем с ребенком',
    muted: false,
  },
  {
    id: '2',
    name: 'Никита',
    phone: '+375 (12) 1234567',
    simulator: 'helicopter',
    status: 'done',
    paid: false,
    time: '13.00 - 13.45',
    method: 'offline',
    comment: 'Будем с ребенком и...',
    muted: true,
  },
  {
    id: '3',
    name: 'Владимир',
    phone: '+375 (12) 1234567',
    simulator: 'both',
    status: 'waiting',
    paid: false,
    time: '14.00 - 14.25',
    method: 'online',
    comment: 'Могут опоздать',
    muted: false,
  },
  {
    id: '4',
    name: 'Никита',
    phone: '+375 (12) 1234567',
    simulator: 'helicopter',
    status: 'canceled',
    paid: true,
    time: '14.40 - 14.55',
    method: 'offline',
    comment: '',
    muted: true,
  },
]

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
    return (
      <EmojiCell emoji={METHOD_ONLINE} label="Онлайн" className="text-[1.05rem]" />
    )
  }
  return (
    <EmojiCell emoji={METHOD_OFFLINE} label="Офлайн" className="text-[1.05rem]" />
  )
}

export default function AdminDashboardPage() {
  const [date, setDate] = React.useState<Date | undefined>(new Date())
  const isMobile = useIsMobile()
  const headerDate = date ?? new Date()

  return (
    <div className="flex w-full min-w-0 flex-col gap-6">
      <Calendar
        mode="single"
        numberOfMonths={isMobile ? 1 : 3}
        selected={date}
        onSelect={setDate}
        locale={ru}
        className="w-fit max-w-full rounded-lg border"
      />

      <div className="flex flex-col gap-4 rounded-lg border bg-background p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-medium leading-tight text-foreground">
            {formatTableHeaderDate(headerDate)}
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-9 w-full shrink-0 gap-2 sm:w-auto"
          >
            <Plus className="size-4 shrink-0" />
            Добавить новую запись
          </Button>
        </div>

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
                <TableHead className="w-[52px] text-right pr-2" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {BOOKING_ROWS.map((row) => (
                <TableRow
                  key={row.id}
                  className={cn(row.muted && 'text-muted-foreground')}
                >
                  <TableCell
                    className={cn(
                      'whitespace-nowrap',
                      !row.muted && 'font-semibold text-foreground',
                    )}
                  >
                    {row.name}
                  </TableCell>
                  <TableCell className="whitespace-nowrap font-mono text-[13px]">
                    {row.phone}
                  </TableCell>
                  <TableCell className="px-2 text-center">
                    <SimulatorIcons type={row.simulator} />
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={row.status} />
                  </TableCell>
                  <TableCell className="text-center">
                    <PayCell paid={row.paid} />
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-[13px]">
                    {row.time}
                  </TableCell>
                  <TableCell className="text-center">
                    <MethodIcon method={row.method} />
                  </TableCell>
                  <TableCell className="max-w-[220px] text-sm leading-snug">
                    {row.comment}
                  </TableCell>
                  <TableCell className="pr-2 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="size-8">
                          <MoreHorizontal className="size-4" />
                          <span className="sr-only">Действия</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>Редактировать</DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive focus:bg-destructive/10 focus:text-destructive"
                        >
                          Удалить
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  )
}
