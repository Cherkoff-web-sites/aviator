import * as React from 'react'
import { addMonths, format, subMonths } from 'date-fns'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { ru } from 'date-fns/locale'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAdminAuth } from '@/contexts/AdminAuthContext'
import { useLiveData } from '@/hooks/useLiveData'
import { apiFetch, type AdminUser } from '@/lib/api'
import { canEditBookings } from '@/lib/admin-access'

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
        Учёт минут по пилотам и тренажёрам. Комментарий — например, переработка или замена смены.
      </p>

      <div className="overflow-x-auto rounded-lg border border-border bg-background">
        <table className="w-full min-w-[520px] text-sm">
          <thead>
            <tr className="border-b bg-muted/40 text-left text-xs text-muted-foreground">
              <th className="px-3 py-2 font-medium">Пилот</th>
              <th className="px-3 py-2 font-medium">Тренажёр</th>
              <th className="px-3 py-2 font-medium w-28">Минуты</th>
              <th className="px-3 py-2 font-medium">Комментарий</th>
            </tr>
          </thead>
          <tbody>
            {grid.map((row, i) => (
              <tr key={row.key} className="border-b border-border/70 last:border-0">
                <td className="px-3 py-2 font-medium">{row.pilotName}</td>
                <td className="px-3 py-2 text-muted-foreground">{row.simLabel}</td>
                <td className="px-3 py-2">
                  <Input
                    type="number"
                    min={0}
                    className="h-8"
                    disabled={!canEdit}
                    value={row.minutes}
                    onChange={(e) => {
                      const minutes = Math.max(0, Number(e.target.value) || 0)
                      setGrid((g) => {
                        const next = [...g]
                        next[i] = { ...next[i], minutes }
                        return next
                      })
                    }}
                  />
                </td>
                <td className="px-3 py-2">
                  <Input
                    className="h-8"
                    disabled={!canEdit}
                    value={row.comment}
                    placeholder="—"
                    onChange={(e) => {
                      const comment = e.target.value
                      setGrid((g) => {
                        const next = [...g]
                        next[i] = { ...next[i], comment }
                        return next
                      })
                    }}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
