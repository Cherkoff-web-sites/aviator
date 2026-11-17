import * as React from 'react'
import { Check, DatabaseZap, Eraser, Loader2, Plus } from 'lucide-react'

import AdminFormModal from '@/components/admin/AdminFormModal'
import { Button } from '@/components/ui/button'
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

export default function DemoDataButton() {
  const { role } = useAdminAuth()
  const [open, setOpen] = React.useState(false)
  const [busy, setBusy] = React.useState<'fill' | 'clear' | null>(null)
  const [toast, setToast] = React.useState<string | null>(null)
  const [error, setError] = React.useState<string | null>(null)

  if (role !== 'ADMIN') return null

  const showToast = (msg: string) => {
    setToast(msg)
    window.setTimeout(() => setToast(null), 4500)
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
        onClick={() => {
          setError(null)
          setOpen(true)
        }}
      >
        <DatabaseZap className="size-4" />
        Демо данные
      </Button>

      <AdminFormModal
        open={open}
        onClose={() => !busy && setOpen(false)}
        title="Демо данные"
        description="Добавление или очистка демонстрационных записей в админке."
        size="md"
      >
        <div className="flex flex-col gap-5">
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
