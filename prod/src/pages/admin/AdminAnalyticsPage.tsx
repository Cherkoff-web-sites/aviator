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
import { useLiveData } from '@/hooks/useLiveData'
import { apiFetch } from '@/lib/api'
import { cn } from '@/lib/utils'

type ChartPoint = { label: string; value: number }

const CHART_CONFIG = {
  value: {
    label: 'Количество',
    color: 'hsl(221 83% 53%)',
  },
} satisfies ChartConfig

const DURATION_FILTERS = ['30 минут', '60 минут', '90 минут', '120 минут'] as const
const FLIGHT_SIM_FILTERS = ['Boeing 737', 'Ми-2', 'Общее количество'] as const
const CERT_SIM_FILTERS = ['Boeing 737', 'Ми-2', 'Комбинированные', 'Общее количество'] as const

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

type Overview = { total: number; b737: number; mi2: number; certificates: number }

export default function AdminAnalyticsPage() {
  const [overviewStat, setOverviewStat] = React.useState<'b737' | 'mi2' | 'total'>('total')
  const [flightDuration, setFlightDuration] = React.useState<string>(DURATION_FILTERS[0])
  const [flightSim, setFlightSim] = React.useState<string>(FLIGHT_SIM_FILTERS[0])
  const [certDuration, setCertDuration] = React.useState<string>(DURATION_FILTERS[0])
  const [certSim, setCertSim] = React.useState<string>(CERT_SIM_FILTERS[0])

  const { data: overview } = useLiveData(() => apiFetch<Overview>('/api/admin/analytics/overview'), [])
  const { data: b737Series = [] } = useLiveData(
    () => apiFetch<ChartPoint[]>('/api/admin/analytics/series?simulator=boeing-737'),
    [],
  )
  const { data: mi2Series = [] } = useLiveData(
    () => apiFetch<ChartPoint[]>('/api/admin/analytics/series?simulator=mi-2'),
    [],
  )
  const { data: totalSeries = [] } = useLiveData(
    () => apiFetch<ChartPoint[]>('/api/admin/analytics/series'),
    [],
  )

  const overviewStats = [
    { id: 'b737' as const, label: 'Boeing 737', value: overview?.b737 ?? 0 },
    { id: 'mi2' as const, label: 'Ми-2', value: overview?.mi2 ?? 0 },
    { id: 'total' as const, label: 'Общее', value: overview?.total ?? 0 },
  ]

  const overviewChartData =
    (overviewStat === 'b737' ? b737Series : overviewStat === 'mi2' ? mi2Series : totalSeries) ?? []

  const flightHighlight =
    overviewStat === 'b737' ? overview?.b737 ?? 0 : overviewStat === 'mi2' ? overview?.mi2 ?? 0 : overview?.total ?? 0

  return (
    <div className="flex w-full min-w-0 flex-col gap-8">
      <Card className="border-border/80 shadow-sm">
        <CardHeader className="space-y-0 pb-2 pt-6">
          <CardTitle className="text-base font-semibold text-foreground">
            Общее кол-во полетов
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 pb-6">
          <div className="flex flex-col gap-2 border-b border-border pb-4 sm:flex-row sm:flex-wrap">
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
          <div className="inline-flex min-w-[140px] flex-col gap-1 rounded-lg bg-muted/70 px-4 py-3">
            <span className="text-xs text-muted-foreground">{flightSim}</span>
            <span className="text-2xl font-semibold tabular-nums tracking-tight text-foreground">
              {formatStat(flightHighlight)}
            </span>
          </div>
          <AnalyticsBarChart data={overviewChartData} />
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
            Количество проданных {certDuration.replace(' минут', '')}-минутных сертификатов на {certSim}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 pb-6">
          <div className="inline-flex min-w-[140px] flex-col gap-1 rounded-lg bg-muted/70 px-4 py-3">
            <span className="text-xs text-muted-foreground">{certSim}</span>
            <span className="text-2xl font-semibold tabular-nums tracking-tight text-foreground">
              {formatStat(overview?.certificates ?? 0)}
            </span>
          </div>
          <AnalyticsBarChart data={totalSeries ?? []} />
        </CardContent>
      </Card>
    </div>
  )
}
