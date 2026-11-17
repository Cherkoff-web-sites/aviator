import * as React from 'react'
import { addMonths, format, subMonths } from 'date-fns'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { ru } from 'date-fns/locale'

import {
  AdminDataTableToolbar,
  AdminSortableHead,
  useAdminDataTable,
  type AdminColumnDef,
} from '@/components/admin/AdminDataTable'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useAdminAuth } from '@/contexts/AdminAuthContext'
import { useLiveData } from '@/hooks/useLiveData'
import { apiFetch, type AdminUser } from '@/lib/api'
import { canEditBookings } from '@/lib/admin-access'
import { SIMULATOR_OPTIONS } from '@/lib/admin-labels'
import { cn } from '@/lib/utils'

type PilotHourRow = {
  id: string
  month: string
  userId: string
  simulatorSlug: 'boeing-737' | 'mi-2'
  minutes: number
  comment: string
}

type GridRow = {
  key: string
  userId: string
  pilotName: string
  simulatorSlug: 'boeing-737' | 'mi-2'
  simLabel: string
  minutes: number
  comment: string
  serverId?: string
}

export default function AdminPilotHoursPage() {
  const { session, user } = useAdminAuth()
  const canEdit = session ? canEditBookings(session.role) : false
  const [month, setMonth] = React.useState(() => format(new Date(), 'yyyy-MM'))
  const monthKey = month

  const { data: pilotsData } = useLiveData(
    () => {
      if (canEdit) return apiFetch<AdminUser[]>('/api/admin/pilots')
      if (session?.role === 'PILOT') {
        return apiFetch<AdminUser>('/api/auth/me').then((u) => [u])
      }
      return Promise.resolve([])
    },
    [canEdit, user?.id, session?.role],
  )
  const pilots = pilotsData ?? []

  const { data: saved, reload } = useLiveData(
    () => apiFetch<PilotHourRow[]>(`/api/admin/pilot-hours?month=${monthKey}`),
    [monthKey],
  )

  const [grid, setGrid] = React.useState<GridRow[]>([])
  const [busy, setBusy] = React.useState(false)

  React.useEffect(() => {
    const byKey = new Map<string, PilotHourRow>()
    for (const r of saved ?? []) {
      byKey.set(`${r.userId}:${r.simulatorSlug}`, r)
    }
    const next: GridRow[] = []
    for (const p of pilots) {
      for (const sim of [
        { slug: 'boeing-737' as const, label: 'Boeing 737' },
        { slug: 'mi-2' as const, label: 'Ми-2' },
      ]) {
        const hit = byKey.get(`${p.id}:${sim.slug}`)
        next.push({
          key: `${p.id}-${sim.slug}`,
          userId: p.id,
          pilotName: p.fullName,
          simulatorSlug: sim.slug,
          simLabel: sim.label,
          minutes: hit?.minutes ?? 0,
          comment: hit?.comment ?? '',
          serverId: hit?.id,
        })
      }
    }
    setGrid(next)
  }, [pilots, saved])

  const columns: AdminColumnDef<GridRow>[] = React.useMemo(
    () => [
      {
        id: 'pilotName',
        header: 'Пилот',
        accessor: 'pilotName',
        className: 'font-medium',
      },
      {
        id: 'simulator',
        header: 'Тренажёр',
        accessor: 'simulatorSlug',
        filterType: 'enum',
        enumOptions: [...SIMULATOR_OPTIONS],
        filterValue: (r) => r.simLabel,
        cell: (row) => <span className="text-muted-foreground">{row.simLabel}</span>,
      },
      {
        id: 'minutes',
        header: 'Факт (мин)',
        accessor: 'minutes',
        filterType: 'number',
        headerClassName: 'w-36',
        cell: (row) => {
          const h = Math.floor(row.minutes / 60)
          const m = row.minutes % 60
          return (
            <span className="font-mono text-sm tabular-nums" title="Считается из подтверждённых полётов">
              {row.minutes}
              <span className="ml-1 text-muted-foreground">
                ({h}:{String(m).padStart(2, '0')})
              </span>
            </span>
          )
        },
      },
      {
        id: 'comment',
        header: 'Комментарий',
        accessor: 'comment',
        cell: (row) => (
          <Input
            className="h-8"
            disabled={!canEdit}
            value={row.comment}
            placeholder="—"
            onChange={(e) => {
              const comment = e.target.value
              setGrid((g) =>
                g.map((item) => (item.key === row.key ? { ...item, comment } : item)),
              )
            }}
          />
        ),
      },
    ],
    [canEdit],
  )

  const table = useAdminDataTable(grid, columns)

  const save = async () => {
    if (!canEdit) return
    setBusy(true)
    try {
      await apiFetch('/api/admin/pilot-hours', {
        method: 'PUT',
        body: JSON.stringify({
          month: monthKey,
          rows: grid.map((g) => ({
            id: g.serverId,
            userId: g.userId,
            simulatorSlug: g.simulatorSlug,
            minutes: g.minutes,
            comment: g.comment,
          })),
        }),
      })
      void reload()
    } finally {
      setBusy(false)
    }
  }

  const monthLabel = format(new Date(`${monthKey}-01`), 'LLLL yyyy', { locale: ru })

  return (
    <div className="flex w-full min-w-0 flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="size-9"
            onClick={() => setMonth(format(subMonths(new Date(`${monthKey}-01`), 1), 'yyyy-MM'))}
          >
            <ChevronLeft className="size-4" />
          </Button>
          <p className="min-w-[10rem] text-center text-sm font-semibold capitalize">{monthLabel}</p>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="size-9"
            onClick={() => setMonth(format(addMonths(new Date(`${monthKey}-01`), 1), 'yyyy-MM'))}
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
        {canEdit ? (
          <Button type="button" size="sm" disabled={busy} onClick={() => void save()}>
            Сохранить месяц
          </Button>
        ) : null}
      </div>

      <p className="text-sm text-muted-foreground">
        Фактические минуты считаются из записей со статусом «В процессе» / «Закончили» и назначенным
        пилотом (подтверждение в начале слота). Комментарий можно править и сохранить отдельно.
      </p>

      <AdminDataTableToolbar
        table={table}
        columns={columns}
        searchPlaceholder="Поиск по пилотам"
      />

      <div className="overflow-x-auto rounded-lg border border-border bg-background">
        <Table className="min-w-[520px]">
          <TableHeader>
            <TableRow className="bg-muted/40 text-xs text-muted-foreground">
              {columns.map((column) => (
                <AdminSortableHead
                  key={column.id}
                  column={column}
                  sort={table.sort}
                  onToggle={table.toggleSort}
                  className="px-3 py-2"
                />
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {table.processedRows.map((row) => (
              <TableRow key={row.key} className="border-border/70">
                {columns.map((column) => (
                  <TableCell key={column.id} className={cn('px-3 py-2', column.className)}>
                    {column.cell
                      ? column.cell(row)
                      : column.accessor == null
                        ? null
                        : (() => {
                            const value =
                              typeof column.accessor === 'function'
                                ? column.accessor(row)
                                : row[column.accessor]
                            if (value == null || value === '') return '—'
                            return String(value)
                          })()}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}