import * as React from 'react'
import { format } from 'date-fns'

import { Button } from '@/components/ui/button'
import { useAdminAuth } from '@/contexts/AdminAuthContext'
import { useLiveData } from '@/hooks/useLiveData'
import { apiFetch, type AdminUser, type ApiBooking } from '@/lib/api'
import { canEditBookings } from '@/lib/admin-access'
import { cn } from '@/lib/utils'

function timeToMins(t: string) {
  const [h, m] = t.split(':').map(Number)
  return (h ?? 0) * 60 + (m ?? 0)
}

function needsConfirm(row: ApiBooking, todayKey: string, nowMins: number) {
  if (row.status !== 'WAITING') return false
  if (row.date !== todayKey) return false
  return timeToMins(row.startTime) <= nowMins
}

function StatusConfirmCard({
  booking,
  pilots,
  shifts,
  stackIndex,
  onDone,
}: {
  booking: ApiBooking
  pilots: AdminUser[]
  shifts: { userId: string; simulatorSlug: string; date: string }[]
  stackIndex: number
  onDone: () => void
}) {
  const [status, setStatus] = React.useState<'IN_PROGRESS' | 'CANCELLED'>('IN_PROGRESS')
  const [pilotUserId, setPilotUserId] = React.useState('')
  const [busy, setBusy] = React.useState(false)

  const orderedPilots = React.useMemo(() => {
    const list = [...pilots]
    const onShift = new Set(shifts.map((s) => s.userId))
    const onThisSim = new Set(
      shifts.filter((s) => s.simulatorSlug === booking.simulatorSlug).map((s) => s.userId),
    )
    list.sort((a, b) => {
      const aSim = onThisSim.has(a.id) ? 0 : onShift.has(a.id) ? 1 : 2
      const bSim = onThisSim.has(b.id) ? 0 : onShift.has(b.id) ? 1 : 2
      if (aSim !== bSim) return aSim - bSim
      return a.fullName.localeCompare(b.fullName, 'ru')
    })
    return list
  }, [pilots, shifts, booking.simulatorSlug])

  React.useEffect(() => {
    setStatus('IN_PROGRESS')
    const preferred =
      booking.pilotUserId ||
      shifts.find((s) => s.simulatorSlug === booking.simulatorSlug)?.userId ||
      orderedPilots[0]?.id ||
      ''
    setPilotUserId(preferred)
  }, [booking.id, booking.pilotUserId, booking.simulatorSlug, orderedPilots, shifts])

  const confirm = async () => {
    if (status === 'IN_PROGRESS' && !pilotUserId) return
    setBusy(true)
    try {
      await apiFetch(`/api/admin/bookings/${booking.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          status,
          pilotUserId: status === 'IN_PROGRESS' ? pilotUserId : null,
        }),
      })
      onDone()
    } finally {
      setBusy(false)
    }
  }

  const simLabel = booking.simulatorSlug === 'mi-2' ? 'Ми-2' : 'Boeing 737'
  const pilotDisabled = status === 'CANCELLED'
  const canSave = status === 'CANCELLED' || Boolean(pilotUserId)

  return (
    <div
      className={cn(
        'pointer-events-auto w-[min(100vw-2rem,360px)] rounded-xl border border-border bg-background p-4 shadow-2xl',
      )}
      style={{
        transform: `translate(${stackIndex * 12}px, ${stackIndex * 12}px)`,
        zIndex: 220 - stackIndex,
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby={`status-confirm-${booking.id}`}
    >
      <h3 id={`status-confirm-${booking.id}`} className="text-sm font-semibold text-foreground">
        Подтвердите статус записи
      </h3>
      <p className="mt-1 text-xs leading-snug text-muted-foreground">
        {booking.name} · {booking.startTime}–{booking.endTime} · {simLabel}
        <br />
        Окно нельзя закрыть без действия.
      </p>
      <div className="mt-3 flex flex-col gap-3">
        <label className="text-sm">
          <span className="text-muted-foreground">Новый статус *</span>
          <select
            className="mt-1 flex h-9 w-full rounded-md border bg-background px-2 text-sm"
            value={status}
            onChange={(e) => setStatus(e.target.value as 'IN_PROGRESS' | 'CANCELLED')}
          >
            <option value="IN_PROGRESS">В процессе (клиент пришёл)</option>
            <option value="CANCELLED">Отменен (не пришёл)</option>
          </select>
        </label>
        <label className="text-sm">
          <span className="text-muted-foreground">
            Пилот *{pilotDisabled ? ' (недоступно при отмене)' : ''}
          </span>
          <select
            className="mt-1 flex h-9 w-full rounded-md border bg-background px-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
            value={pilotDisabled ? '' : pilotUserId}
            disabled={pilotDisabled}
            onChange={(e) => setPilotUserId(e.target.value)}
          >
            <option value="">Выберите пилота</option>
            {orderedPilots.map((p) => (
              <option key={p.id} value={p.id}>
                {p.fullName}
                {shifts.some((s) => s.userId === p.id && s.simulatorSlug === booking.simulatorSlug)
                  ? ' · смена'
                  : shifts.some((s) => s.userId === p.id)
                    ? ' · на смене'
                    : ''}
              </option>
            ))}
          </select>
        </label>
        <Button
          type="button"
          className="w-full"
          disabled={busy || !canSave}
          onClick={() => void confirm()}
        >
          Сохранить
        </Button>
      </div>
    </div>
  )
}

type DemoClock = {
  effectiveNowIso: string
  demoNowIso: string | null
  active: boolean
}

export default function StatusConfirmHost() {
  const { session } = useAdminAuth()
  const canEdit = session ? canEditBookings(session.role) : false

  const { data: clock, reload: reloadClock } = useLiveData(
    () =>
      canEdit
        ? apiFetch<DemoClock>('/api/admin/demo-clock')
        : Promise.resolve({
            effectiveNowIso: new Date().toISOString(),
            demoNowIso: null,
            active: false,
          }),
    [canEdit],
  )

  const effectiveNow = React.useMemo(
    () => new Date(clock?.effectiveNowIso ?? Date.now()),
    [clock?.effectiveNowIso],
  )
  const todayKey = format(effectiveNow, 'yyyy-MM-dd')

  const { data: rows, reload } = useLiveData(
    () => apiFetch<ApiBooking[]>(`/api/admin/bookings?date=${todayKey}`),
    [todayKey],
  )

  React.useEffect(() => {
    const t = window.setInterval(() => {
      void reload()
      void reloadClock()
    }, 15_000)
    return () => window.clearInterval(t)
  }, [reload, reloadClock])

  const { data: pilots } = useLiveData(
    () => (canEdit ? apiFetch<AdminUser[]>('/api/admin/pilots') : Promise.resolve([])),
    [canEdit],
  )

  const monthKey = todayKey.slice(0, 7)
  const { data: shifts } = useLiveData(
    () =>
      canEdit
        ? apiFetch<{ userId: string; simulatorSlug: string; date: string }[]>(
            `/api/admin/staff-shifts?month=${monthKey}`,
          )
            .then((list) => list.filter((s) => s.date === todayKey))
            .catch(() => [])
        : Promise.resolve([]),
    [canEdit, todayKey, monthKey],
  )

  const [, setTick] = React.useState(0)
  React.useEffect(() => {
    const t = window.setInterval(() => setTick((n) => n + 1), 30_000)
    return () => window.clearInterval(t)
  }, [])

  const queue = React.useMemo(() => {
    const nowMins = timeToMins(format(effectiveNow, 'HH:mm'))
    return (rows ?? [])
      .filter((r) => needsConfirm(r, todayKey, nowMins))
      .sort((a, b) => a.startTime.localeCompare(b.startTime))
  }, [rows, todayKey, effectiveNow])

  if (!canEdit || queue.length === 0) return null

  return (
    <div className="pointer-events-none fixed inset-0 z-[210] overflow-hidden">
      {queue.map((booking, i) => (
        <div
          key={booking.id}
          className="pointer-events-none absolute right-4 top-4"
          style={{ zIndex: 220 + i }}
        >
          <StatusConfirmCard
            booking={booking}
            pilots={pilots ?? []}
            shifts={shifts ?? []}
            stackIndex={i}
            onDone={() => void reload()}
          />
        </div>
      ))}
    </div>
  )
}
