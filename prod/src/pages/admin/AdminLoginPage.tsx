import * as React from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { useAdminAuth } from '@/contexts/AdminAuthContext'
import type { UserRole } from '@/lib/api'

const ROLES: { role: UserRole; title: string; desc: string }[] = [
  { role: 'ADMIN', title: 'Администратор', desc: 'Полный доступ ко всем разделам' },
  { role: 'MANAGER', title: 'Менеджер', desc: 'Записи, сертификаты, цены, зал ожидания' },
  { role: 'PILOT', title: 'Пилот-инструктор', desc: 'Просмотр своего тренажёра и график' },
]

export default function AdminLoginPage() {
  const { enterAs, loading, session } = useAdminAuth()
  const navigate = useNavigate()
  const [pilotSim, setPilotSim] = React.useState<'boeing-737' | 'mi-2'>('boeing-737')
  const [busy, setBusy] = React.useState(false)
  const [error, setError] = React.useState('')

  React.useEffect(() => {
    if (session) navigate('/admin', { replace: true })
  }, [session, navigate])

  const pick = async (role: UserRole) => {
    setError('')
    setBusy(true)
    try {
      await enterAs(role, role === 'PILOT' ? pilotSim : undefined)
      navigate('/admin')
    } catch {
      setError('Не удалось войти. Проверьте, что сервер запущен.')
    } finally {
      setBusy(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-muted/30">
        <p className="text-sm text-muted-foreground">Загрузка…</p>
      </div>
    )
  }

  return (
    <div className="flex min-h-svh items-center justify-center bg-muted/30 p-4">
      <div className="w-full max-w-lg rounded-xl border bg-background p-6 shadow-sm">
        <h1 className="text-xl font-semibold">Вход в панель управления</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Выберите роль для работы с системой
        </p>

        <div className="mt-6 flex flex-col gap-3">
          {ROLES.map((r) => (
            <div key={r.role} className="rounded-lg border p-4">
              <p className="font-medium">{r.title}</p>
              <p className="mt-1 text-sm text-muted-foreground">{r.desc}</p>
              {r.role === 'PILOT' ? (
                <div className="mt-3 flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant={pilotSim === 'boeing-737' ? 'default' : 'outline'}
                    onClick={() => setPilotSim('boeing-737')}
                  >
                    Boeing 737
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={pilotSim === 'mi-2' ? 'default' : 'outline'}
                    onClick={() => setPilotSim('mi-2')}
                  >
                    Ми-2
                  </Button>
                </div>
              ) : null}
              <Button
                type="button"
                className="mt-3 w-full"
                disabled={busy}
                onClick={() => void pick(r.role)}
              >
                Войти как {r.title.toLowerCase()}
              </Button>
            </div>
          ))}
        </div>
        {error ? <p className="mt-4 text-sm text-destructive">{error}</p> : null}
      </div>
    </div>
  )
}
