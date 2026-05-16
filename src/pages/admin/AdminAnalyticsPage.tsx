import * as React from 'react'
import { Bar, BarChart, CartesianGrid, XAxis } from 'recharts'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'
import { cn } from '@/lib/utils'

type ChartPoint = { label: string; value: number }

const CHART_CONFIG = {
  value: {
    label: 'Количество',
    color: 'hsl(221 83% 53%)',
  },
} satisfies ChartConfig

const OVERVIEW_STATS = [
  { id: 'b737', label: 'Boeing 737', value: 24_828 },
  { id: 'mi2', label: 'Ми-2', value: 25_010 },
  { id: 'total', label: 'Общее', value: 50_010 },
] as const

type OverviewStatId = (typeof OVERVIEW_STATS)[number]['id']

const DURATION_FILTERS = ['30 минут', '60 минут', '90 минут', '120 минут'] as const

const FLIGHT_SIM_FILTERS = ['Boeing 737', 'Ми-2', 'Общее количество'] as const

const CERT_SIM_FILTERS = [
  'Boeing 737',
  'Ми-2',
  'Комбинированные',
  'Общее количество',
] as const

function makeSeries(seed: number): ChartPoint[] {
  const labels = [
    'Апр 9',
    'Апр 12',
    'Апр 15',
    'Апр 18',
    'Апр 21',
    'Апр 24',
    'Апр 27',
    'Апр 30',
    'Май 3',
    'Май 6',
    'Май 9',
    'Май 12',
    'Май 15',
    'Май 18',
    'Май 21',
    'Май 24',
    'Май 27',
    'Май 30',
  ]

  return labels.map((label, i) => ({
    label,
    value: Math.round(320 + ((seed + i * 7) % 11) * 28 + Math.sin(i * 0.65 + seed) * 55),
  }))
}

const SERIES_BY_OVERVIEW: Record<OverviewStatId, ChartPoint[]> = {
  b737: makeSeries(1),
  mi2: makeSeries(2),
  total: makeSeries(3),
}

function formatStat(value: number) {
  return value.toLocaleString('ru-RU')
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
      className="h-9 rounded-full px-4 font-medium"
      onClick={onClick}
    >
      {children}
    </Button>
  )
}

function AnalyticsBarChart({ data }: { data: ChartPoint[] }) {
  return (
    <ChartContainer config={CHART_CONFIG} className="aspect-[2.6/1] min-h-[200px] w-full">
      <BarChart data={data} margin={{ top: 8, right: 4, left: 4, bottom: 0 }}>
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis
          dataKey="label"
          tickLine={false}
          axisLine={false}
          tickMargin={10}
          minTickGap={24}
          tick={{ fontSize: 11 }}
        />
        <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
        <Bar dataKey="value" fill="var(--color-value)" radius={[2, 2, 0, 0]} maxBarSize={10} />
      </BarChart>
    </ChartContainer>
  )
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
        'flex min-w-[120px] flex-1 flex-col gap-1 rounded-lg px-4 py-3 text-left transition-colors',
        active ? 'bg-muted' : 'hover:bg-muted/60',
      )}
    >
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-xl font-semibold tabular-nums tracking-tight text-foreground sm:text-2xl">
        {formatStat(value)}
      </span>
    </button>
  )
}

function MetricHighlight({ label, value }: { label: string; value: number }) {
  return (
    <div className="inline-flex min-w-[140px] flex-col gap-1 rounded-lg bg-muted/70 px-4 py-3">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-2xl font-semibold tabular-nums tracking-tight text-foreground">
        {formatStat(value)}
      </span>
    </div>
  )
}

function FilterSection({
  title,
  durationOptions,
  simOptions,
  duration,
  sim,
  onDurationChange,
  onSimChange,
}: {
  title: string
  durationOptions: readonly string[]
  simOptions: readonly string[]
  duration: string
  sim: string
  onDurationChange: (value: string) => void
  onSimChange: (value: string) => void
}) {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-base font-semibold text-foreground">{title}</h2>
      <div className="flex flex-wrap gap-2">
        {durationOptions.map((option) => (
          <FilterChip
            key={option}
            active={duration === option}
            onClick={() => onDurationChange(option)}
          >
            {option}
          </FilterChip>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        {simOptions.map((option) => (
          <FilterChip key={option} active={sim === option} onClick={() => onSimChange(option)}>
            {option}
          </FilterChip>
        ))}
      </div>
    </section>
  )
}

export default function AdminAnalyticsPage() {
  const [overviewStat, setOverviewStat] = React.useState<OverviewStatId>('b737')

  const [flightDuration, setFlightDuration] = React.useState<string>(DURATION_FILTERS[0])
  const [flightSim, setFlightSim] = React.useState<string>(FLIGHT_SIM_FILTERS[0])

  const [certDuration, setCertDuration] = React.useState<string>(DURATION_FILTERS[0])
  const [certSim, setCertSim] = React.useState<string>(CERT_SIM_FILTERS[0])

  const overviewChartData = SERIES_BY_OVERVIEW[overviewStat]
  const flightChartData = React.useMemo(
    () => makeSeries(flightDuration.length + flightSim.length),
    [flightDuration, flightSim],
  )

  const certChartData = React.useMemo(
    () => makeSeries(certDuration.length + certSim.length + 20),
    [certDuration, certSim],
  )

  return (
    <div className="flex w-full min-w-0 flex-col gap-8">
      <section className="flex flex-col gap-3">
        <h2 className="text-base font-semibold text-foreground">Фильтры периода</h2>
        <Button type="button" variant="outline" size="sm" className="h-9 w-fit rounded-full px-5">
          Выбрать период
        </Button>
      </section>

      <Card className="border-border/80 shadow-sm">
        <CardHeader className="space-y-0 pb-2 pt-6">
          <CardTitle className="text-base font-semibold text-foreground">
            Общее кол-во полетов за текущий месяц
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 pb-6">
          <div className="flex flex-col gap-2 border-b border-border pb-4 sm:flex-row sm:flex-wrap">
            {OVERVIEW_STATS.map((stat) => (
              <StatTab
                key={stat.id}
                label={stat.label}
                value={stat.value}
                active={overviewStat === stat.id}
                onClick={() => setOverviewStat(stat.id)}
              />
            ))}
          </div>
          <AnalyticsBarChart data={overviewChartData} />
        </CardContent>
      </Card>

      <FilterSection
        title="Проданные полеты на авиатренажерах:"
        durationOptions={DURATION_FILTERS}
        simOptions={FLIGHT_SIM_FILTERS}
        duration={flightDuration}
        sim={flightSim}
        onDurationChange={setFlightDuration}
        onSimChange={setFlightSim}
      />

      <Card className="border-border/80 shadow-sm">
        <CardHeader className="space-y-0 pb-2 pt-6">
          <CardTitle className="text-base font-semibold leading-snug text-foreground">
            Кол-во {flightDuration.replace(' минут', '')} - минутных полетов на {flightSim}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 pb-6">
          <MetricHighlight label={flightSim} value={24_828} />
          <AnalyticsBarChart data={flightChartData} />
        </CardContent>
      </Card>

      <FilterSection
        title="Проданные сертификаты:"
        durationOptions={DURATION_FILTERS}
        simOptions={CERT_SIM_FILTERS}
        duration={certDuration}
        sim={certSim}
        onDurationChange={setCertDuration}
        onSimChange={setCertSim}
      />

      <Card className="border-border/80 shadow-sm">
        <CardHeader className="space-y-0 pb-2 pt-6">
          <CardTitle className="text-base font-semibold leading-snug text-foreground">
            Количество проданных {certDuration.replace(' минут', '')}-минутных сертификатов на{' '}
            {certSim}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 pb-6">
          <MetricHighlight label={certSim} value={24_828} />
          <AnalyticsBarChart data={certChartData} />
        </CardContent>
      </Card>
    </div>
  )
}
