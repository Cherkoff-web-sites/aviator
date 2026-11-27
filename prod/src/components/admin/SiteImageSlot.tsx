import * as React from 'react'
import { flushSync } from 'react-dom'
import { Upload } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { resolveMediaUrl } from '@/data/siteImages'
import { apiFetch } from '@/lib/api'

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error('Не удалось прочитать файл'))
    reader.readAsDataURL(file)
  })
}

/** Ждём, пока nginx/Node реально начнут отдавать файл (иначе img ловит 404 и «залипает»). */
function waitUntilImageReady(url: string, attempts = 10): Promise<boolean> {
  const base = resolveMediaUrl(url)
  if (!base || base.startsWith('data:')) return Promise.resolve(true)

  return new Promise((resolve) => {
    let i = 0
    const tryOnce = () => {
      const img = new Image()
      const probe = `${base}${base.includes('?') ? '&' : '?'}probe=${Date.now()}-${i}`
      img.onload = () => resolve(true)
      img.onerror = () => {
        i += 1
        if (i >= attempts) {
          resolve(false)
          return
        }
        window.setTimeout(tryOnce, 120 + i * 80)
      }
      img.src = probe
    }
    tryOnce()
  })
}

export function SiteImageSlot({
  label,
  hint,
  value,
  baseline,
  onChange,
  onSave,
  saving = false,
  aspect = 'video',
}: {
  label: string
  hint?: string
  value: string
  /** Значение с сервера — если отличается, показываем «Сохранить медиа» рядом */
  baseline?: string
  onChange: (url: string) => void
  onSave?: () => void
  saving?: boolean
  aspect?: 'video' | 'square'
}) {
  const inputRef = React.useRef<HTMLInputElement>(null)
  const [busy, setBusy] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  /** Локальный data URL — сразу после выбора файла, пока /uploads ещё «прогревается». */
  const [localPreview, setLocalPreview] = React.useState<string | null>(null)
  const [imgTick, setImgTick] = React.useState(0)

  const remotePreview = resolveMediaUrl(value)
  const preview = localPreview || remotePreview
  const dirty = baseline !== undefined && value.trim() !== baseline.trim()

  const upload = async (file: File | undefined) => {
    if (!file) return
    setBusy(true)
    setError(null)
    try {
      const dataUrl = await readFileAsDataUrl(file)
      // Сразу показываем выбранный файл — без ожидания сети.
      setLocalPreview(dataUrl)

      const saved = await apiFetch<{ url: string }>('/api/admin/uploads', {
        method: 'POST',
        body: JSON.stringify({ dataUrl }),
      })

      const ready = await waitUntilImageReady(saved.url)
      if (!ready) {
        // Файл записан, но отдача ещё нестабильна — всё равно сохраняем URL,
        // локальный превью остаётся до обновления страницы / следующего value.
        setError('Файл загружен, превью с сервера подождёт пару секунд')
      }

      // flushSync — чтобы onSave увидел новый URL в draftRef родителя.
      flushSync(() => {
        onChange(saved.url)
      })
      setImgTick((t) => t + 1)
      // Публикуем на сайт только после проверки (или исчерпания попыток).
      onSave?.()
      if (ready) setLocalPreview(null)
    } catch (e) {
      setLocalPreview(null)
      setError(e instanceof Error ? e.message : 'Ошибка загрузки')
    } finally {
      setBusy(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return (
    <div className="flex min-w-0 flex-col gap-2">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-sm font-medium text-foreground">{label}</p>
        {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
      </div>
      <div
        className={[
          'relative overflow-hidden rounded-md border border-border/80 bg-muted',
          aspect === 'square' ? 'aspect-square' : 'aspect-video',
          dirty ? 'ring-2 ring-[#0075FF]/45' : '',
        ].join(' ')}
      >
        {preview ? (
          <img
            key={`${preview}-${imgTick}`}
            src={preview}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
            onError={(e) => {
              // Один повтор с cache-bust — если первый GET поймал пустой/старый ответ.
              const el = e.currentTarget
              if (el.dataset.retried === '1') return
              if (!remotePreview || remotePreview.startsWith('data:')) return
              el.dataset.retried = '1'
              el.src = `${remotePreview}${remotePreview.includes('?') ? '&' : '?'}t=${Date.now()}`
            }}
          />
        ) : null}
      </div>
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="/assets/... или /uploads/..."
        className="h-9 font-mono text-xs"
      />
      <div className="flex flex-wrap items-center gap-2">
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="hidden"
          onChange={(e) => void upload(e.target.files?.[0])}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 gap-1.5"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
        >
          <Upload className="size-3.5" />
          {busy ? 'Загрузка…' : 'Загрузить'}
        </Button>
        {dirty && onSave ? (
          <Button
            type="button"
            size="sm"
            className="h-8"
            disabled={saving || busy}
            onClick={() => onSave()}
          >
            {saving ? 'Сохранение…' : 'Сохранить медиа'}
          </Button>
        ) : null}
        {error ? <span className="text-xs text-destructive">{error}</span> : null}
      </div>
    </div>
  )
}
