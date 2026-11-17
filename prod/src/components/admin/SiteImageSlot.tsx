import * as React from 'react'
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
  const preview = resolveMediaUrl(value)
  const dirty = baseline !== undefined && value.trim() !== baseline.trim()

  const upload = async (file: File | undefined) => {
    if (!file) return
    setBusy(true)
    setError(null)
    try {
      const dataUrl = await readFileAsDataUrl(file)
      const saved = await apiFetch<{ url: string }>('/api/admin/uploads', {
        method: 'POST',
        body: JSON.stringify({ dataUrl }),
      })
      onChange(saved.url)
    } catch (e) {
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
          <img src={preview} alt="" className="absolute inset-0 h-full w-full object-cover" />
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
