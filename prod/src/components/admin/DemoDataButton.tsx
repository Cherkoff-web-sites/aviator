import * as React from 'react'
import { Check, Clock, DatabaseZap, Eraser, Loader2, Plus } from 'lucide-react'

import AdminFormModal from '@/components/admin/AdminFormModal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAdminAuth } from '@/contexts/AdminAuthContext'
import { apiFetch } from '@/lib/api'

type FillResult = {
  bookings: number
  certificates: number
  staffShifts: number
  bookingGapMin?: number
}

type ClearResult = {
  removed: { bookings: number; certificates: number; staffShifts: number; other: number }
}

type DemoClock = {
  realNowIso: string
  demoNowIso: string | null
  effectiveNowIso: string
  active: boolean
}

/** datetime-local value from ISO (local wall clock). */
function isoToLocalInput(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function localInputToIso(value: string): string | null {
  const t = value.trim()
  if (!t) return null
  const d = new Date(t)
  if (Number.isNaN(d.getTime())) return null
  return d.toISOString()
}

function formatClockLabel(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function DemoDataButton() {
  const { role } = useAdminAuth()
  const [open, setOpen] = React.useState(false)
  const [busy, setBusy] = React.useState<'fill' | 'clear' | 'clock' | null>(null)
  const [toast, setToast] = React.useState<string | null>(null)
  const [error, setError] = React.useState<string | null>(null)
  const [clock, setClock] = React.useState<DemoClock | null>(null)
  const [clockInput, setClockInput] = React.useState('')

  if (role !== 'ADMIN') return null

  const showToast = (msg: string) => {
    setToast(msg)
    window.setTimeout(() => setToast(null), 4500)
  }

  const loadClock = async () => {
    const res = await apiFetch<DemoClock>('/api/admin/demo-clock')
    setClock(res)
    setClockInput(isoToLocalInput(res.demoNowIso || res.realNowIso))
  }

  const openModal = () => {
    setError(null)
    setOpen(true)
    void loadClock().catch(() => setError('Не удалось загрузить время сервера'))
  }

  const fill = async () => {
    setBusy('fill')
    setError(null)
    try {
      const res = await apiFetch<FillResult>('/api/admin/demo-data', { method: 'POST' })
      setOpen(false)
      showToast(
        `Демо добавлено: ${res.bookings} броней, ${res.certificates} сертификатов, ${res.staffShifts} смен` +
          (res.bookingGapMin != null ? ` (пауза ${res.bookingGapMin} мин)` : ''),
      )
    } catch {
      setError('Не удалось добавить демо-данные')
    } finally {
      setBusy(null)
    }
  }

  const clear = async () => {
    setBusy('clear')
    setError(null)
    try {
      const res = await apiFetch<ClearResult>('/api/admin/demo-data', { method: 'DELETE' })
      setOpen(false)
      const r = res.removed
      showToast(
        `Демо удалено: ${r.bookings} броней, ${r.certificates} сертификатов, ${r.staffShifts} смен` +
          (r.other ? `, ещё ${r.other}` : ''),
      )
    } catch {
      setError('Не удалось очистить демо-данные')
    } finally {
      setBusy(null)
    }
  }

  const applyClock = async () => {
    const iso = localInputToIso(clockInput)
    if (!iso) {
      setError('Укажите корректную дату и время')
      return
    }
    setBusy('clock')
    setError(null)
    try {
      const res = await apiFetch<DemoClock>('/api/admin/demo-clock', {
        method: 'PUT',
        body: JSON.stringify({ demoNowIso: iso }),
      })
      setClock(res)
      setClockInput(isoToLocalInput(res.demoNowIso || res.effectiveNowIso))
      showToast(`Демо-время: ${formatClockLabel(res.effectiveNowIso)}`)
    } catch {
      setError('Не удалось сохранить время')
    } finally {
      setBusy(null)
    }
  }

  const resetClock = async () => {
    setBusy('clock')
    setError(null)
    try {
      const res = await apiFetch<DemoClock>('/api/admin/demo-clock', {
        method: 'PUT',
        body: JSON.stringify({ demoNowIso: null }),
      })
      setClock(res)
      setClockInput(isoToLocalInput(res.realNowIso))
      showToast('Время сброшено на реальное серверное')
    } catch {
      setError('Не удалось сбросить время')
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end gap-2">
      {toast ? (
        <div className="flex max-w-[320px] items-start gap-2 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-xs font-medium text-green-900 shadow-md dark:border-green-900 dark:bg-green-950/70 dark:text-green-100">
          <Check className="mt-0.5 size-4 shrink-0" />
          <span>{toast}</span>
        </div>
      ) : null}

      <Button
        type="button"
        variant="secondary"
        className="h-11 gap-2 rounded-full border border-border px-4 shadow-lg"
        onClick={openModal}
      >
        <DatabaseZap className="size-4" />
        Демо данные
      </Button>

      <AdminFormModal
        open={open}
        onClose={() => !busy && setOpen(false)}
        title="Демо данные"
        description="Демо-записи и подмена «текущего времени» для проверки статусов и подтверждений."
        size="md"
      >
        <div className="flex flex-col gap-5">
          <section className="rounded-lg border border-border/80 p-4">
            <div className="mb-2 flex items-center gap-2">
              <Clock className="size-4 text-[#0075FF]" />
              <h3 className="text-sm font-semibold text-foreground">Время сервера</h3>
            </div>
            <p className="mb-3 text-xs leading-relaxed text-muted-foreground">
              Админка и автозавершение полётов смотрят на это время вместо реальных часов. Удобно
              проверять окна подтверждения «Ожидаем» и переход «В процессе» → «Закончили».
            </p>
            <label className="mb-2 block text-xs font-medium text-muted-foreground">
              Текущее время (демо)
              <Input
                type="datetime-local"
                className="mt-1 h-9"
                value={clockInput}
                onChange={(e) => setClockInput(e.target.value)}
                disabled={!!busy}
              />
            </label>
            <p className="mb-3 text-[11px] text-muted-foreground">
              Реальное:{' '}
              <span className="font-medium text-foreground">
                {clock ? formatClockLabel(clock.realNowIso) : '…'}
              </span>
              {clock?.active ? (
                <>
                  {' '}
                  · активно:{' '}
                  <span className="font-medium text-amber-700 dark:text-amber-300">
                    {formatClockLabel(clock.effectiveNowIso)}
                  </span>
                </>
              ) : (
                <span> · override выключен</span>
              )}
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                className="gap-1.5"
                disabled={!!busy || !clockInput}
                onClick={() => void applyClock()}
              >
                {busy === 'clock' ? <Loader2 className="size-4 animate-spin" /> : <Clock className="size-4" />}
                Применить время
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={!!busy || !clock?.active}
                onClick={() => void resetClock()}
              >
                Сбросить на реальное
              </Button>
            </div>
          </section>

          <section className="rounded-lg border border-border/80 p-4">
            <div className="mb-2 flex items-center gap-2">
              <Plus className="size-4 text-[#0075FF]" />
              <h3 className="text-sm font-semibold text-foreground">Добавление</h3>
            </div>
            <p className="mb-3 text-xs leading-relaxed text-muted-foreground">
              Создаёт демо-брони, сертификаты, смены, календарь и связанные записи. Между полётами на
              одном тренажёре соблюдается пауза из настроек («Пауза между полётами»). Настройки, цены,
              контакты и медиа не затираются. Перед записью делается резервная копия базы.
            </p>
            <Button
              type="button"
              size="sm"
              className="gap-1.5"
              disabled={!!busy}
              onClick={() => void fill()}
            >
              {busy === 'fill' ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
              Добавить демо данные
            </Button>
          </section>

          <section className="rounded-lg border border-border/80 p-4">
            <div className="mb-2 flex items-center gap-2">
              <Eraser className="size-4 text-destructive" />
              <h3 className="text-sm font-semibold text-foreground">Очистка</h3>
            </div>
            <p className="mb-3 text-xs leading-relaxed text-muted-foreground">
              Удаляет только демо-записи (id с префиксом demo-), чтобы не смешивать их с новыми
              данными. Можно очистить и снова нажать «Добавить». Реальные брони и настройки остаются.
              Демо-время при очистке не сбрасывается.
            </p>
            <Button
              type="button"
              size="sm"
              variant="destructive"
              className="gap-1.5"
              disabled={!!busy}
              onClick={() => void clear()}
            >
              {busy === 'clear' ? <Loader2 className="size-4 animate-spin" /> : <Eraser className="size-4" />}
              Очистить демо данные
            </Button>
          </section>

          {error ? <p className="text-xs text-destructive">{error}</p> : null}
        </div>
      </AdminFormModal>
    </div>
  )
}
