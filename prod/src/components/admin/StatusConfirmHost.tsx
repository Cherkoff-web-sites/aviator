import * as React from 'react'
import { format } from 'date-fns'

import AdminFormModal from '@/components/admin/AdminFormModal'
import { Button } from '@/components/ui/button'
import { useAdminAuth } from '@/contexts/AdminAuthContext'
import { useLiveData } from '@/hooks/useLiveData'
import { apiFetch, type AdminUser, type ApiBooking } from '@/lib/api'
import { canEditBookings } from '@/lib/admin-access'

function timeToMins(t: string) {
  const [h, m] = t.split(':').map(Number)
  return (h ?? 0) * 60 + (m ?? 0)
}

function needsConfirm(row: ApiBooking, todayKey: string, nowMins: number) {
  if (row.status !== 'WAITING') return false
  if (row.date !== todayKey) return false
  return timeToMins(row.startTime) <= nowMins
}

export default function StatusConfirmHost() {
  const { session } = useAdminAuth()
  const canEdit = session ? canEditBookings(session.role) : false
  const todayKey = format(new Date(), 'yyyy-MM-dd')

  const { data: rows, reload } = useLiveData(
    () => apiFetch<ApiBooking[]>(`/api/admin/bookings?date=${todayKey}`),
    [todayKey],
  )

  React.useEffect(() => {
    const t = window.setInterval(() => void reload(), 30_000)
    return () => window.clearInterval(t)
  }, [reload])

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
            .then((rows) => rows.filter((s) => s.date === todayKey))
            .catch(() => [])
        : Promise.resolve([]),
    [canEdit, todayKey, monthKey],
  )

  const queue = React.useMemo(() => {
    const nowMins = timeToMins(format(new Date(), 'HH:mm'))
    return (rows ?? []).filter((r) => needsConfirm(r, todayKey, nowMins))
  }, [rows, todayKey])

  const [index, setIndex] = React.useState(0)
  const current = queue[index]
  const [status, setStatus] = React.useState<'IN_PROGRESS' | 'CANCELLED'>('IN_PROGRESS')
  const [pilotUserId, setPilotUserId] = React.useState('')
  const [busy, setBusy] = React.useState(false)

  const orderedPilots = React.useMemo(() => {
    const list = [...(pilots ?? [])]
    const onShift = new Set((shifts ?? []).map((s) => s.userId))
    list.sort((a, b) => {
      const as = onShift.has(a.id) ? 0 : 1
      const bs = onShift.has(b.id) ? 0 : 1
      if (as !== bs) return as - bs
      return a.fullName.localeCompare(b.fullName, 'ru')
    })
    return list
  }, [pilots, shifts])

  React.useEffect(() => {
    if (!current) return
    setStatus('IN_PROGRESS')
    const preferred =
      current.pilotUserId ||
      (shifts ?? []).find((s) => s.simulatorSlug === current.simulatorSlug)?.userId ||
      orderedPilots[0]?.id ||
      ''
    setPilotUserId(preferred)
  }, [current?.id, orderedPilots, shifts])

  React.useEffect(() => {
    if (index >= queue.length) setIndex(0)
  }, [index, queue.length])

  const confirm = async () => {
    if (!current || !canEdit) return
    if (status === 'IN_PROGRESS' && !pilotUserId) return
    setBusy(true)
    try {
      await apiFetch(`/api/admin/bookings/${current.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          status,
          pilotUserId: status === 'IN_PROGRESS' ? pilotUserId : undefined,
        }),
      })
      void reload()
      setIndex(0)
    } finally {
      setBusy(false)
    }
  }

  if (!canEdit || !current) return null

  const simLabel = current.simulatorSlug === 'mi-2' ? 'Ми-2' : 'Boeing 737'
  const pilotDisabled = status === 'CANCELLED'
  const canSave = status === 'CANCELLED' || Boolean(pilotUserId)

  return (
    <AdminFormModal
      open
      title="Подтвердите статус записи"
      description={`${current.name} · ${current.startTime}–${current.endTime} · ${simLabel}. Окно нельзя закрыть без действия (${queue.length} в очереди).`}
      onClose={() => {}}
      blocking
      size="md"
    >
      <div className="flex flex-col gap-4">
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
            className="mt-1 flex h-9 w-full rounded-md border bg-background px-2 text-sm disabled:opacity-50"
            value={pilotUserId}
            disabled={pilotDisabled}
            onChange={(e) => setPilotUserId(e.target.value)}
          >
            <option value="">Выберите пилота</option>
            {orderedPilots.map((p) => (
              <option key={p.id} value={p.id}>
                {p.fullName}
              </option>
            ))}
          </select>
        </label>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" disabled={busy || !canSave} onClick={() => void confirm()}>
            Сохранить и продолжить
          </Button>
        </div>
      </div>
    </AdminFormModal>
  )
}
