import * as React from 'react'
import { Link } from 'react-router-dom'
import { io } from 'socket.io-client'
import { BellOff, Volume2, VolumeX, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { useAdminAuth } from '@/contexts/AdminAuthContext'
import { getApiBase, type UserRole } from '@/lib/api'
import { cn } from '@/lib/utils'

type ToastItem = {
  id: string
  kind: string
  title: string
  body: string
  href: string
  audienceRoles?: UserRole[]
  targetUserId?: string
}

const MUTE_KEY = 'admin-toast-muted'
/** Кладёте файл сюда: `site/prod/public/sounds/notification.mp3` → URL `/sounds/notification.mp3` */
const SOUND_URL = '/sounds/notification.mp3'

let sharedAudio: HTMLAudioElement | null = null
let sharedCtx: AudioContext | null = null
let audioUnlocked = false

function ensureAudioElements() {
  if (!sharedAudio) {
    sharedAudio = new Audio(SOUND_URL)
    sharedAudio.preload = 'auto'
    sharedAudio.volume = 0.7
  }
  if (!sharedCtx) {
    try {
      sharedCtx = new AudioContext()
    } catch {
      sharedCtx = null
    }
  }
}

/** Браузер блокирует звук без жеста пользователя — разблокируем по первому клику в админке. */
function unlockNotificationAudio() {
  ensureAudioElements()
  if (audioUnlocked) {
    if (sharedCtx?.state === 'suspended') void sharedCtx.resume()
    return
  }
  audioUnlocked = true
  if (sharedCtx?.state === 'suspended') void sharedCtx.resume()
  if (sharedAudio) {
    const a = sharedAudio
    a.volume = 0.001
    void a
      .play()
      .then(() => {
        a.pause()
        a.currentTime = 0
        a.volume = 0.7
      })
      .catch(() => {
        a.volume = 0.7
      })
  }
}

function playBeepFallback() {
  try {
    ensureAudioElements()
    const ctx = sharedCtx ?? new AudioContext()
    sharedCtx = ctx
    void ctx.resume()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.frequency.value = 880
    gain.gain.value = 0.08
    osc.start()
    osc.stop(ctx.currentTime + 0.12)
  } catch {
    /* ignore */
  }
}

function playNotificationSound() {
  ensureAudioElements()
  if (sharedCtx?.state === 'suspended') void sharedCtx.resume()
  const a = sharedAudio
  if (!a) {
    playBeepFallback()
    return
  }
  try {
    a.pause()
    a.currentTime = 0
    a.volume = 0.7
    const p = a.play()
    if (p && typeof p.catch === 'function') {
      void p.catch(() => playBeepFallback())
    }
  } catch {
    playBeepFallback()
  }
}

/** Тост: личные — только адресату; остальное — по ролям (админ видит все неличные). */
function canShowToast(
  n: Pick<ToastItem, 'audienceRoles' | 'targetUserId'>,
  role: UserRole | undefined,
  userId: string | undefined,
): boolean {
  if (!role || !userId) return false
  if (n.targetUserId) return n.targetUserId === userId
  if (role === 'ADMIN') return true
  return Boolean(n.audienceRoles?.includes(role))
}

export default function AdminToastHost() {
  const { session } = useAdminAuth()
  const role = session?.role
  const userId = session?.userId
  const [toasts, setToasts] = React.useState<ToastItem[]>([])
  const [muted, setMuted] = React.useState(() => sessionStorage.getItem(MUTE_KEY) === '1')
  const mutedRef = React.useRef(muted)
  mutedRef.current = muted

  const dismiss = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const pushToast = React.useCallback((item: ToastItem) => {
    setToasts((prev) => {
      if (prev.some((t) => t.id === item.id)) return prev
      return [item, ...prev].slice(0, 5)
    })
    if (!mutedRef.current) playNotificationSound()
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== item.id))
    }, 12_000)
  }, [])

  React.useEffect(() => {
    sessionStorage.setItem(MUTE_KEY, muted ? '1' : '0')
  }, [muted])

  // Разрешение автоплея после любого клика/клавиши в админке
  React.useEffect(() => {
    const unlock = () => unlockNotificationAudio()
    window.addEventListener('pointerdown', unlock, { passive: true })
    window.addEventListener('keydown', unlock)
    return () => {
      window.removeEventListener('pointerdown', unlock)
      window.removeEventListener('keydown', unlock)
    }
  }, [])

  React.useEffect(() => {
    if (!role || !userId) return
    const base = getApiBase() || window.location.origin
    const socket = io(base, { transports: ['websocket', 'polling'] })

    const join = () => {
      socket.emit('admin:join')
    }
    join()
    socket.on('connect', join)

    const onNotification = (payload: ToastItem) => {
      if (!payload?.id || !payload?.title) return
      if (!canShowToast(payload, role, userId)) return
      pushToast({
        id: payload.id,
        kind: payload.kind ?? 'system',
        title: payload.title,
        body: payload.body ?? '',
        href: payload.href || '/admin/notifications',
        audienceRoles: payload.audienceRoles,
        targetUserId: payload.targetUserId,
      })
    }

    socket.on('notification:created', onNotification)

    return () => {
      socket.off('connect', join)
      socket.off('notification:created', onNotification)
      socket.disconnect()
    }
  }, [pushToast, role, userId])

  if (toasts.length === 0 && !muted) {
    return (
      <div className="pointer-events-none fixed right-4 top-4 z-[60] flex flex-col items-end gap-2">
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="pointer-events-auto size-9 bg-background/95 shadow-md"
          aria-label="Звук уведомлений включён"
          onClick={() => {
            unlockNotificationAudio()
            setMuted(true)
          }}
        >
          <Volume2 className="size-4" />
        </Button>
      </div>
    )
  }

  if (toasts.length === 0 && muted) {
    return (
      <div className="pointer-events-none fixed right-4 top-4 z-[60] flex flex-col items-end gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="pointer-events-auto h-8 gap-1.5 bg-background/95 text-xs shadow-md"
          onClick={() => {
            unlockNotificationAudio()
            setMuted(false)
          }}
        >
          <VolumeX className="size-3.5" />
          Без звука
        </Button>
      </div>
    )
  }

  return (
    <div className="pointer-events-none fixed right-4 top-4 z-[60] flex w-[min(100vw-2rem,360px)] flex-col items-end gap-2">
      <div className="pointer-events-auto flex gap-1">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 gap-1.5 bg-background/95 text-xs shadow-md"
          onClick={() => {
            unlockNotificationAudio()
            setMuted((m) => !m)
          }}
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
            <Link
              to={t.href}
              className="min-w-0 flex-1 rounded-md outline-none hover:opacity-90 focus-visible:ring-2 focus-visible:ring-ring"
              onClick={() => dismiss(t.id)}
            >
              <p className="text-sm font-semibold text-foreground">{t.title}</p>
              <p className="mt-0.5 text-xs leading-snug text-muted-foreground">{t.body}</p>
              <span className="mt-1 inline-block text-xs font-medium text-primary underline-offset-2 hover:underline">
                Открыть
              </span>
            </Link>
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
