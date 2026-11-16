import { useEffect, useRef, useState } from 'react'
import { Viewer } from '@photo-sphere-viewer/core'

import '@photo-sphere-viewer/core/index.css'

type GalleryPanoramaViewerProps = {
  src: string
  className?: string
}

type Phase = 'download' | 'prepare' | 'done' | 'error'

const DOWNLOAD_TIMEOUT_MS = 120_000
const PREPARE_TIMEOUT_MS = 45_000

async function fetchPanoramaBlob(
  src: string,
  signal: AbortSignal,
  onProgress: (pct: number) => void,
): Promise<Blob> {
  const res = await fetch(src, { signal })
  if (!res.ok) {
    if (res.status === 404) {
      throw new Error('Файл панорамы не найден. Проверьте путь и имя файла.')
    }
    throw new Error(`Не удалось скачать панораму (код ${res.status}).`)
  }

  const total = Number(res.headers.get('content-length')) || 0
  if (!res.body) {
    const blob = await res.blob()
    onProgress(95)
    return blob
  }

  const reader = res.body.getReader()
  const chunks: BlobPart[] = []
  let received = 0

  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    if (value) {
      chunks.push(value)
      received += value.byteLength
      if (total > 0) {
        onProgress(Math.min(95, Math.round((received / total) * 95)))
      } else {
        onProgress(Math.min(90, Math.round(received / (512 * 1024))))
      }
    }
  }

  onProgress(95)
  return new Blob(chunks, { type: 'image/jpeg' })
}

function GalleryPanoramaViewer({ src, className = '' }: GalleryPanoramaViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [phase, setPhase] = useState<Phase>('download')
  const [progress, setProgress] = useState(0)
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    let cancelled = false
    let objectUrl: string | null = null
    let viewer: Viewer | null = null
    let prepareTimer: number | null = null
    const abort = new AbortController()

    setPhase('download')
    setProgress(0)
    setErrorMsg('')

    const fail = (message: string) => {
      if (cancelled) return
      setPhase('error')
      setErrorMsg(message)
    }

    const downloadTimer = window.setTimeout(() => {
      abort.abort()
      fail('Превышено время ожидания загрузки. Файл очень большой или сеть нестабильна.')
    }, DOWNLOAD_TIMEOUT_MS)

    void (async () => {
      try {
        const blob = await fetchPanoramaBlob(src, abort.signal, (pct) => {
          if (!cancelled) setProgress(pct)
        })
        if (cancelled) return

        window.clearTimeout(downloadTimer)
        objectUrl = URL.createObjectURL(blob)
        setPhase('prepare')
        setProgress(97)

        prepareTimer = window.setTimeout(() => {
          fail('Панорама скачалась, но не открылась. Возможно, файл слишком тяжёлый для браузера.')
        }, PREPARE_TIMEOUT_MS)

        viewer = new Viewer({
          container: el,
          panorama: objectUrl,
          navbar: ['zoom', 'fullscreen'],
          defaultZoomLvl: 50,
          mousewheel: true,
          mousemove: true,
          touchmoveTwoFingers: false,
          loadingTxt: '',
          lang: {
            zoom: 'Масштаб',
            zoomOut: 'Отдалить',
            zoomIn: 'Приблизить',
            moveUp: 'Вверх',
            moveDown: 'Вниз',
            moveLeft: 'Влево',
            moveRight: 'Вправо',
            fullscreen: 'На весь экран',
            loadError: 'Не удалось открыть панораму',
          },
        })

        const onReady = () => {
          if (prepareTimer != null) window.clearTimeout(prepareTimer)
          if (cancelled) return
          setProgress(100)
          setPhase('done')
        }
        const onError = () => {
          if (prepareTimer != null) window.clearTimeout(prepareTimer)
          fail('Не удалось открыть панораму. Нужен equirectangular JPEG 360°.')
        }
        const onLoadProgress = (e: Event & { progress?: number }) => {
          if (cancelled) return
          const p = typeof e.progress === 'number' ? e.progress : 0
          setProgress(97 + Math.round(Math.min(1, Math.max(0, p)) * 3))
        }

        viewer.addEventListener('ready', onReady)
        viewer.addEventListener('panorama-error', onError)
        viewer.addEventListener('load-progress', onLoadProgress)
      } catch (err) {
        window.clearTimeout(downloadTimer)
        if (cancelled) return
        if (err instanceof DOMException && err.name === 'AbortError') return
        const message =
          err instanceof Error && err.message
            ? err.message
            : 'Не удалось загрузить панораму.'
        fail(message)
      }
    })()

    return () => {
      cancelled = true
      abort.abort()
      window.clearTimeout(downloadTimer)
      if (prepareTimer != null) window.clearTimeout(prepareTimer)
      viewer?.destroy()
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [src])

  const loading = phase === 'download' || phase === 'prepare'

  return (
    <div
      className={`relative h-full w-full min-h-0 overflow-hidden rounded-lg bg-black min-[990px]:rounded-xl ${className}`.trim()}
    >
      <div ref={containerRef} className="absolute inset-0 h-full w-full" />

      {loading ? (
        <div className="pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-black/55 px-6">
          <p className="text-[14px] font-medium text-white/90">
            {phase === 'download' ? 'Загрузка 360°…' : 'Подготовка панорамы…'}
          </p>
          <div className="h-1.5 w-full max-w-[240px] overflow-hidden rounded-full bg-white/15">
            <div
              className="h-full rounded-full bg-white transition-[width] duration-200 ease-out"
              style={{ width: `${Math.max(2, progress)}%` }}
            />
          </div>
          <p className="text-[13px] font-semibold tabular-nums text-white/75">{progress}%</p>
        </div>
      ) : null}

      {phase === 'error' ? (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-black/85 px-6 text-center">
          <p className="text-[15px] font-semibold text-white">Не удалось открыть 360°</p>
          <p className="max-w-md text-[13px] leading-relaxed text-white/70">{errorMsg}</p>
        </div>
      ) : null}
    </div>
  )
}

export default GalleryPanoramaViewer
