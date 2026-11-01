import * as React from 'react'
import { Link } from 'react-router-dom'
import { io } from 'socket.io-client'
import { BellOff, Volume2, VolumeX, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { getApiBase } from '@/lib/api'
import { cn } from '@/lib/utils'

type ToastItem = {
  id: string
  title: string
  body: string
  href?: string
}

const MUTE_KEY = 'admin-toast-muted'

function playBeep() {
  try {
    const ctx = new AudioContext()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.frequency.value = 880
    gain.gain.value = 0.08
    osc.start()
    osc.stop(ctx.currentTime + 0.12)
    void ctx.close()
  } catch {
    /* ignore */
  }
}

export default function AdminToastHost() {
  const [toasts, setToasts] = React.useState<ToastItem[]>([])
  const [muted, setMuted] = React.useState(() => sessionStorage.getItem(MUTE_KEY) === '1')

  const pushToast = React.useCallback(
    (title: string, body: string, href?: string) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
      setToasts((prev) => [{ id, title, body, href }, ...prev].slice(0, 5))
      if (!muted) playBeep()
    },
    [muted],
  )

  React.useEffect(() => {
    sessionStorage.setItem(MUTE_KEY, muted ? '1' : '0')
  }, [muted])

  React.useEffect(() => {
    const base = getApiBase() || window.location.origin
    const socket = io(base, { transports: ['websocket', 'polling'] })
    socket.emit('admin:join')

    const onBooking = (payload: { id?: string }) => {
      pushToast('Новая или изменённая запись', `ID: ${payload?.id ?? '—'}`, '/admin')
    }
    const onFeedback = (payload: { name?: string; phone?: string }) => {
      pushToast(
        'Обратная связь',
        `${payload?.name ?? 'Клиент'}, ${payload?.phone ?? ''}`,
        '/admin/feedback',
      )
    }
    const onStore = () => {
      pushToast('Данные обновлены', 'Синхронизация с сервером')
    }

    socket.on('booking:created', onBooking)
    socket.on('booking:updated', onBooking)
    socket.on('feedback:created', onFeedback)
    socket.on('store:updated', onStore)

    return () => {
      socket.off('booking:created', onBooking)
      socket.off('booking:updated', onBooking)
      socket.off('feedback:created', onFeedback)
      socket.off('store:updated', onStore)
      socket.disconnect()
    }
  }, [pushToast])

  const dismiss = (id: string) => setToasts((prev) => prev.filter((t) => t.id !== id))

  if (toasts.length === 0 && !muted) {
    return (
      <div className="pointer-events-none fixed bottom-4 right-4 z-[60] flex flex-col items-end gap-2">
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="pointer-events-auto size-9 bg-background/95 shadow-md"
          aria-label="Звук уведомлений включён"
          onClick={() => setMuted(true)}
        >
          <Volume2 className="size-4" />
        </Button>
      </div>
    )
  }

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[60] flex w-[min(100vw-2rem,360px)] flex-col items-end gap-2">
      <div className="pointer-events-auto flex gap-1">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 gap-1.5 bg-background/95 text-xs shadow-md"
          onClick={() => setMuted((m) => !m)}
        >
          {muted ? <VolumeX className="size-3.5" /> : <Volume2 className="size-3.5" />}
          {muted ? 'Без звука' : 'Звук вкл.'}
        </Button>
        {muted ? (
          <span className="inline-flex h-8 items-center rounded-md border bg-muted/80 px-2 text-[11px] text-muted-foreground">
            <BellOff className="mr-1 size-3.5" />
            Сессия без звука
          </span>
        ) : null}
      </div>
      {toasts.map((t) => (
        <div
          key={t.id}
          className={cn(
            'pointer-events-auto w-full rounded-lg border border-border bg-background/98 p-3 shadow-lg backdrop-blur',
          )}
          role="status"
        >
          <div className="flex items-start gap-2">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-foreground">{t.title}</p>
              <p className="mt-0.5 text-xs leading-snug text-muted-foreground">{t.body}</p>
              {t.href ? (
                <Link to={t.href} className="mt-1 inline-block text-xs font-medium text-primary underline-offset-2 hover:underline">
                  Открыть
                </Link>
              ) : null}
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-7 shrink-0"
              aria-label="Закрыть"
              onClick={() => dismiss(t.id)}
            >
              <X className="size-4" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  )
}
