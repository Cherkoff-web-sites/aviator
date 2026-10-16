import * as React from 'react'
import { Check, DatabaseZap, Loader2, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { useAdminAuth } from '@/contexts/AdminAuthContext'
import { apiFetch } from '@/lib/api'

type DemoResult = { bookings: number; certificates: number; staffShifts: number }

export default function DemoDataButton() {
  const { role } = useAdminAuth()
  const [open, setOpen] = React.useState(false)
  const [busy, setBusy] = React.useState(false)
  const [result, setResult] = React.useState<DemoResult | null>(null)
  const [error, setError] = React.useState<string | null>(null)

  if (role !== 'ADMIN') return null

  const run = async () => {
    setBusy(true)
    setError(null)
    try {
      const res = await apiFetch<DemoResult>('/api/admin/demo-data', { method: 'POST' })
      setResult(res)
      setOpen(false)
      window.setTimeout(() => setResult(null), 4000)
    } catch {
      setError('Не удалось заполнить данные')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end gap-2">
      {open ? (
        <div className="w-[300px] rounded-xl border border-border bg-background p-4 shadow-lg">
          <div className="mb-2 flex items-start justify-between gap-2">
            <p className="text-sm font-semibold text-foreground">Заполнить демо-данными?</p>
            <button
              type="button"
              className="text-muted-foreground hover:text-foreground"
              onClick={() => setOpen(false)}
              aria-label="Закрыть"
            >
              <X className="size-4" />
            </button>
          </div>
          <p className="mb-3 text-xs leading-relaxed text-muted-foreground">
            Все текущие данные админки будут заменены демо-набором от сегодняшнего дня: брони во всех статусах,
            сертификаты, смены, календарь, комната ожидания, аналитика. Цены и акции — как на странице «Цены».
            Предыдущая база сохранится в резервную копию на сервере.
          </p>
          {error ? <p className="mb-2 text-xs text-destructive">{error}</p> : null}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setOpen(false)} disabled={busy}>
              Отмена
            </Button>
            <Button type="button" size="sm" onClick={() => void run()} disabled={busy} className="gap-1.5">
              {busy ? <Loader2 className="size-4 animate-spin" /> : null}
              Заполнить
            </Button>
          </div>
        </div>
      ) : null}
      {result ? (
        <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-xs font-medium text-green-900 shadow-md dark:border-green-900 dark:bg-green-950/70 dark:text-green-100">
          <Check className="size-4 shrink-0" />
          Готово: {result.bookings} броней, {result.certificates} сертификатов, {result.staffShifts} смен
        </div>
      ) : null}
      <Button
        type="button"
        variant="secondary"
        className="h-11 gap-2 rounded-full border border-border px-4 shadow-lg"
        onClick={() => setOpen((v) => !v)}
      >
        <DatabaseZap className="size-4" />
        Заполнить демо-данными
      </Button>
    </div>
  )
}
