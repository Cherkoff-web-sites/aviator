import * as React from 'react'
import { differenceInCalendarDays, format, parseISO, subDays } from 'date-fns'
import { ru } from 'date-fns/locale'
import { useNavigate } from 'react-router-dom'
import { Bar, BarChart, CartesianGrid, XAxis } from 'recharts'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ChartContainer, ChartTooltip, type ChartConfig } from '@/components/ui/chart'
import { Input } from '@/components/ui/input'
import { useLiveData } from '@/hooks/useLiveData'
import { apiFetch } from '@/lib/api'
import { cn } from '@/lib/utils'

type ChartPoint = { label: string; value: number; date: string; summary: string }
type AnalyticsSlice = { total: number; series: ChartPoint[] }

const CHART_CONFIG = {
  value: {
    label: 'Количество',
    color: 'hsl(221 83% 53%)',
  },
} satisfies ChartConfig

const BOEING_DURATIONS = [
  { value: 30, label: '30 минут' },
  { value: 60, label: '60 минут' },
  { value: 90, label: '90 минут' },
  { value: 120, label: '120 минут' },
] as const

const MI2_DURATIONS = [
  { value: 30, label: '30 минут' },
  { value: 60, label: '60 минут' },
] as const

const COMBO_DURATIONS = [{ value: 60, label: '60 минут' }] as const

const FLIGHT_SIM_FILTERS = [
  { value: 'boeing-737', label: 'Boeing 737' },
  { value: 'mi-2', label: 'Ми-2' },
  { value: 'all', label: 'Общее количество' },
] as const

const CERT_SIM_FILTERS = [
  { value: 'boeing-737', label: 'Boeing 737' },
  { value: 'mi-2', label: 'Ми-2' },
  { value: 'combo', label: 'Комбинированные' },
  { value: 'all', label: 'Общее количество' },
] as const

type PeriodPreset = '7d' | '30d' | '90d' | '365d' | 'all' | 'custom'

const PERIOD_PRESETS: { id: PeriodPreset; label: string; days: number | null }[] = [
  { id: '7d', label: 'Неделя', days: 7 },
  { id: '30d', label: 'Месяц', days: 30 },
  { id: '90d', label: '3 месяца', days: 90 },
  { id: '365d', label: 'Год', days: 365 },
  { id: 'all', label: 'Всё время', days: null },
  { id: 'custom', label: 'Свой период', days: null },
]

function todayKey() {
  return format(new Date(), 'yyyy-MM-dd')
}

function rangeForPreset(preset: PeriodPreset, customFrom: string, customTo: string) {
  if (preset === 'all') return { from: '', to: '' }
  if (preset === 'custom') {
    return { from: customFrom, to: customTo || todayKey() }
  }
  const days = PERIOD_PRESETS.find((p) => p.id === preset)?.days ?? 30
  const to = todayKey()
  const from = format(subDays(new Date(), days - 1), 'yyyy-MM-dd')
  return { from, to }
}

function periodQuery(from: string, to: string) {
  const q = new URLSearchParams()
  if (from) q.set('from', from)
  if (to) q.set('to', to)
  const s = q.toString()
  return s ? `&${s}` : ''
}

function durationsForSim(sim: string): readonly { value: number; label: string }[] {
  if (sim === 'mi-2') return MI2_DURATIONS
  if (sim === 'combo') return COMBO_DURATIONS
  return BOEING_DURATIONS
}

function clampDuration(sim: string, duration: number) {
  const allowed = durationsForSim(sim)
  return allowed.some((d) => d.value === duration) ? duration : allowed[0].value
}

function formatStat(value: number) {
  return value.toLocaleString('ru-RU')
}

function simQuery(value: string) {
  return value === 'all' ? '' : `&simulator=${encodeURIComponent(value)}`
}

function FilterChip({
  active,
  children,
  onClick,
}: {
  active: boolean
  children: React.ReactNode
  onClick: () => void
}) {
  return (
    <Button
      type="button"
      variant={active ? 'secondary' : 'outline'}
      size="sm"
      className="h-8 rounded-full px-3 text-xs font-medium"
      onClick={onClick}
    >
      {children}
    </Button>
  )
}

function formatDayTitle(dateKey: string) {
  try {
    const raw = format(parseISO(dateKey), "d MMMM yyyy 'г.'", { locale: ru })
    return raw.replace(/^(\d+\s+)([а-яё]+)/i, (_, n: string, m: string) => {
      return `${n}${m.charAt(0).toUpperCase()}${m.slice(1)}`
    })
  } catch {
    return dateKey
  }
}

function AnalyticsBarChart({
  data,
  linkKind = 'bookings',
}: {
  data: ChartPoint[]
  linkKind?: 'bookings' | 'certificates'
}) {
  const navigate = useNavigate()
  const dense = data.length > 45
  /** Ширина полотна графика — на мобилке скроллится внутри обёртки. */
  const chartMinWidth = Math.max(data.length * 16, 280)

  return (
    <div className="w-full min-w-0 overflow-x-auto overscroll-x-contain touch-pan-x [-webkit-overflow-scrolling:touch]">
      <div className="h-[220px]" style={{ minWidth: chartMinWidth, width: '100%' }}>
        <ChartContainer config={CHART_CONFIG} className="aspect-auto h-full w-full min-w-0">
          <BarChart data={data} margin={{ top: 12, right: 2, left: 2, bottom: 4 }}>
            <CartesianGrid vertical={false} strokeDasharray="3 3" />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={dense ? 36 : 20}
              tick={{ fontSize: 10 }}
            />
            <ChartTooltip
              cursor={{ fill: 'hsl(var(--muted))', opacity: 0.45 }}
              isAnimationActive
              animationDuration={200}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null
                const point = payload[0]?.payload as ChartPoint | undefined
                if (!point) return null
                return (
                  <div className="grid min-w-[10rem] gap-1 rounded-lg border border-border/50 bg-background px-2.5 py-1.5 text-xs shadow-xl">
                    <p className="font-medium text-foreground">{formatDayTitle(point.date)}</p>
                    {point.summary ? (
                      <p className="max-w-[220px] whitespace-normal leading-snug text-muted-foreground">
                        {point.summary}
                      </p>
                    ) : null}
                    <p className="tabular-nums text-foreground">
                      Всего: <span className="font-semibold">{point.value}</span>
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {linkKind === 'certificates'
                        ? 'Нажмите на колонку — открыть сертификаты'
                        : 'Нажмите на колонку — открыть записи за день'}
                    </p>
                  </div>
                )
              }}
            />
            <Bar
              dataKey="value"
              fill="var(--color-value)"
              radius={[2, 2, 0, 0]}
              maxBarSize={dense ? 8 : 12}
              className="cursor-pointer"
              onClick={(item) => {
                const raw = item as { date?: string; payload?: ChartPoint } & Partial<ChartPoint>
                const point = (raw.payload ?? raw) as ChartPoint
                if (!point?.date) return
                if (linkKind === 'certificates') {
                  navigate('/admin/certificates')
                  return
                }
                navigate(`/admin?date=${encodeURIComponent(point.date)}`)
              }}
            />
          </BarChart>
        </ChartContainer>
      </div>
    </div>
  )
}

function periodDayCount(from: string, to: string, preset: PeriodPreset) {
  if (preset === 'all') return Number.POSITIVE_INFINITY
  if (!from || !to) return Number.POSITIVE_INFINITY
  try {
    return differenceInCalendarDays(parseISO(to), parseISO(from)) + 1
  } catch {
    return Number.POSITIVE_INFINITY
  }
}

function StatTab({
  label,
  value,
  active,
  onClick,
}: {
  label: string
  value: number
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex min-w-0 flex-1 flex-col gap-0.5 rounded-md px-2.5 py-2 text-left transition-colors',
        active ? 'bg-muted' : 'hover:bg-muted/60',
      )}
    >
      <span className="truncate text-[11px] text-muted-foreground">{label}</span>
      <span className="text-lg font-semibold tabular-nums tracking-tight text-foreground">
        {formatStat(value)}
      </span>
    </button>
  )
}

type Overview = { total: number; b737: number; mi2: number; certificates: number }

export default function AdminAnalyticsPage() {
  const [period, setPeriod] = React.useState<PeriodPreset>('30d')
  const [customFrom, setCustomFrom] = React.useState(() =>
    format(subDays(new Date(), 29), 'yyyy-MM-dd'),
  )
  const [customTo, setCustomTo] = React.useState(todayKey)

  const { from, to } = React.useMemo(
    () => rangeForPreset(period, customFrom, customTo),
    [period, customFrom, customTo],
  )
  const pq = periodQuery(from, to)

  const [overviewStat, setOverviewStat] = React.useState<'b737' | 'mi2' | 'total'>('total')
  const [flightDuration, setFlightDuration] = React.useState(30)
  const [flightSim, setFlightSim] = React.useState<string>('boeing-737')
  const [certDuration, setCertDuration] = React.useState(30)
  const [certSim, setCertSim] = React.useState<string>('boeing-737')

  const flightDurations = durationsForSim(flightSim)
  const certDurations = durationsForSim(certSim)

  React.useEffect(() => {
    setFlightDuration((d) => clampDuration(flightSim, d))
  }, [flightSim])

  React.useEffect(() => {
    setCertDuration((d) => clampDuration(certSim, d))
  }, [certSim])

  const { data: overview } = useLiveData(
    () =>
      apiFetch<Overview>(
        pq ? `/api/admin/analytics/overview?${pq.slice(1)}` : '/api/admin/analytics/overview',
      ),
    [pq],
  )

  const overviewSim =
    overviewStat === 'b737' ? 'boeing-737' : overviewStat === 'mi2' ? 'mi-2' : 'all'
  const { data: overviewSlice } = useLiveData(
    () =>
      apiFetch<AnalyticsSlice>(
        `/api/admin/analytics/flights?simulator=${encodeURIComponent(overviewSim)}${pq}`,
      ),
    [overviewSim, pq],
  )

  const { data: flightSlice } = useLiveData(
    () =>
      apiFetch<AnalyticsSlice>(
        `/api/admin/analytics/flights?durationMin=${flightDuration}${simQuery(flightSim)}${pq}`,
      ),
    [flightDuration, flightSim, pq],
  )

  const { data: certSlice } = useLiveData(
    () =>
      apiFetch<AnalyticsSlice>(
        `/api/admin/analytics/certificates?durationMin=${certDuration}${simQuery(certSim)}${pq}`,
      ),
    [certDuration, certSim, pq],
  )

  const overviewStats = [
    { id: 'b737' as const, label: 'Boeing 737', value: overview?.b737 ?? 0 },
    { id: 'mi2' as const, label: 'Ми-2', value: overview?.mi2 ?? 0 },
    { id: 'total' as const, label: 'Общее', value: overview?.total ?? 0 },
  ]

  const flightSimLabel =
    FLIGHT_SIM_FILTERS.find((o) => o.value === flightSim)?.label ?? flightSim
  const certSimLabel = CERT_SIM_FILTERS.find((o) => o.value === certSim)?.label ?? certSim

  const periodHint =
    period === 'all'
      ? 'За всё время'
      : from && to
        ? `${format(parseISO(from), 'dd.MM.yyyy')} — ${format(parseISO(to), 'dd.MM.yyyy')}`
        : ''

  /** Больше месяца — только столбиком, иначе графики не влезают. */
  const longPeriod = periodDayCount(from, to, period) > 30
  const chartsGridClass = longPeriod
    ? 'grid grid-cols-1 gap-4'
    : 'grid grid-cols-1 gap-4 min-[1440px]:grid-cols-2 min-[1600px]:grid-cols-3'

  return (
    <div className="flex w-full min-w-0 flex-col gap-5">
      <div className="flex flex-col gap-3 rounded-lg border bg-background p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-foreground">Период</h2>
          {periodHint ? (
            <span className="text-xs text-muted-foreground">{periodHint}</span>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          {PERIOD_PRESETS.map((p) => (
            <FilterChip key={p.id} active={period === p.id} onClick={() => setPeriod(p.id)}>
              {p.label}
            </FilterChip>
          ))}
        </div>
        {period === 'custom' ? (
          <div className="flex flex-wrap items-end gap-3">
            <label className="text-sm">
              <span className="text-muted-foreground">С</span>
              <Input
                type="date"
                className="mt-1 h-9 w-[160px]"
                value={customFrom}
                max={customTo || todayKey()}
                onChange={(e) => setCustomFrom(e.target.value)}
              />
            </label>
            <label className="text-sm">
              <span className="text-muted-foreground">По</span>
              <Input
                type="date"
                className="mt-1 h-9 w-[160px]"
                value={customTo}
                min={customFrom}
                max={todayKey()}
                onChange={(e) => setCustomTo(e.target.value)}
              />
            </label>
          </div>
        ) : null}
      </div>

      <div className={chartsGridClass}>
        <Card className="min-w-0 border-border/80 shadow-sm">
          <CardHeader className="space-y-0 pb-2 pt-5">
            <CardTitle className="text-sm font-semibold text-foreground">
              Общее кол-во полетов
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 pb-5">
            <div className="flex gap-1 border-b border-border pb-3">
              {overviewStats.map((stat) => (
                <StatTab
                  key={stat.id}
                  label={stat.label}
                  value={stat.value}
                  active={overviewStat === stat.id}
                  onClick={() => setOverviewStat(stat.id)}
                />
              ))}
            </div>
            <AnalyticsBarChart data={overviewSlice?.series ?? []} />
          </CardContent>
        </Card>

        <Card className="min-w-0 border-border/80 shadow-sm">
          <CardHeader className="space-y-2 pb-2 pt-5">
            <CardTitle className="text-sm font-semibold leading-snug text-foreground">
              Проданные полеты
            </CardTitle>
            <div className="flex flex-wrap gap-1.5">
              {FLIGHT_SIM_FILTERS.map((option) => (
                <FilterChip
                  key={option.value}
                  active={flightSim === option.value}
                  onClick={() => setFlightSim(option.value)}
                >
                  {option.label}
                </FilterChip>
              ))}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {flightDurations.map((option) => (
                <FilterChip
                  key={option.value}
                  active={flightDuration === option.value}
                  onClick={() => setFlightDuration(option.value)}
                >
                  {option.label}
                </FilterChip>
              ))}
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 pb-5">
            <div className="inline-flex min-w-[120px] flex-col gap-0.5 rounded-md bg-muted/70 px-3 py-2">
              <span className="truncate text-[11px] text-muted-foreground">
                {flightDuration} мин · {flightSimLabel}
              </span>
              <span className="text-xl font-semibold tabular-nums tracking-tight text-foreground">
                {formatStat(flightSlice?.total ?? 0)}
              </span>
            </div>
            <AnalyticsBarChart data={flightSlice?.series ?? []} />
          </CardContent>
        </Card>

        <Card
          className={cn(
            'min-w-0 border-border/80 shadow-sm',
            !longPeriod && 'min-[1440px]:max-[1599px]:col-span-2 min-[1600px]:col-span-1',
          )}
        >
          <CardHeader className="space-y-2 pb-2 pt-5">
            <CardTitle className="text-sm font-semibold leading-snug text-foreground">
              Проданные сертификаты
            </CardTitle>
            <div className="flex flex-wrap gap-1.5">
              {CERT_SIM_FILTERS.map((option) => (
                <FilterChip
                  key={option.value}
                  active={certSim === option.value}
                  onClick={() => setCertSim(option.value)}
                >
                  {option.label}
                </FilterChip>
              ))}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {certDurations.map((option) => (
                <FilterChip
                  key={option.value}
                  active={certDuration === option.value}
                  onClick={() => setCertDuration(option.value)}
                >
                  {option.label}
                </FilterChip>
              ))}
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 pb-5">
            <div className="inline-flex min-w-[120px] flex-col gap-0.5 rounded-md bg-muted/70 px-3 py-2">
              <span className="truncate text-[11px] text-muted-foreground">
                {certDuration} мин · {certSimLabel}
              </span>
              <span className="text-xl font-semibold tabular-nums tracking-tight text-foreground">
                {formatStat(certSlice?.total ?? 0)}
              </span>
            </div>
            <AnalyticsBarChart data={certSlice?.series ?? []} linkKind="certificates" />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
