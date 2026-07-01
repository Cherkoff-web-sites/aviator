import * as React from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { apiFetch } from '@/lib/api'
import { useAdminAuth } from '@/contexts/AdminAuthContext'
import { canEditBookings } from '@/lib/admin-access'

export default function AdminMaintenancePage() {
  const [notes, setNotes] = React.useState('')
  const [done, setDone] = React.useState(false)
  const { session } = useAdminAuth()
  const canEdit = session ? canEditBookings(session.role) : false

  const schedule = async () => {
    await apiFetch('/api/admin/maintenance', {
      method: 'POST',
      body: JSON.stringify({ notes }),
    })
    setDone(true)
    setNotes('')
  }

  return (
    <div className="flex min-h-[min(70vh,560px)] flex-1 flex-col items-center justify-center gap-8 px-4 py-12 text-center">
      <h2 className="max-w-xl text-2xl font-semibold leading-tight tracking-tight text-foreground sm:text-3xl">
        Запланировать техническое обслуживание?
      </h2>
      {canEdit ? (
        <div className="flex w-full max-w-md flex-col gap-3">
          <Input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Комментарий к обслуживанию"
            className="h-10"
          />
          <Button
            type="button"
            size="lg"
            className="h-11 min-w-[200px] rounded-lg px-10 text-base font-medium"
            onClick={() => void schedule()}
          >
            Запланировать
          </Button>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">Просмотр раздела доступен администраторам и менеджерам.</p>
      )}
      {done ? (
        <p className="text-sm font-medium text-green-700">Обслуживание запланировано и записано в журнал.</p>
      ) : null}
    </div>
  )
}
