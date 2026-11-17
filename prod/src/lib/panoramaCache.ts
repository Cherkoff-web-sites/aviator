type ProgressListener = (pct: number) => void

type CacheEntry = {
  promise: Promise<Blob>
  blob: Blob | null
  progress: number
  error: Error | null
  listeners: Set<ProgressListener>
}

const cache = new Map<string, CacheEntry>()

function notify(entry: CacheEntry, pct: number) {
  entry.progress = pct
  entry.listeners.forEach((listener) => listener(pct))
}

async function downloadBlob(src: string, entry: CacheEntry): Promise<Blob> {
  const res = await fetch(src)
  if (!res.ok) {
    if (res.status === 404) {
      throw new Error('Файл панорамы не найден. Проверьте путь и имя файла.')
    }
    throw new Error(`Не удалось скачать панораму (код ${res.status}).`)
  }

  const total = Number(res.headers.get('content-length')) || 0
  if (!res.body) {
    const blob = await res.blob()
    notify(entry, 100)
    return blob
  }

  const reader = res.body.getReader()
  const chunks: BlobPart[] = []
  let received = 0

  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    if (!value) continue
    chunks.push(value)
    received += value.byteLength
    if (total > 0) {
      notify(entry, Math.min(99, Math.round((received / total) * 100)))
    } else {
      notify(entry, Math.min(95, Math.round(received / (512 * 1024))))
    }
  }

  notify(entry, 100)
  return new Blob(chunks, { type: 'image/jpeg' })
}

function ensureEntry(src: string): CacheEntry {
  const existing = cache.get(src)
  if (existing) return existing

  const entry: CacheEntry = {
    promise: null as unknown as Promise<Blob>,
    blob: null,
    progress: 0,
    error: null,
    listeners: new Set(),
  }

  entry.promise = downloadBlob(src, entry)
    .then((blob) => {
      entry.blob = blob
      entry.error = null
      notify(entry, 100)
      return blob
    })
    .catch((err: unknown) => {
      const error =
        err instanceof Error ? err : new Error('Не удалось загрузить панораму.')
      entry.error = error
      cache.delete(src)
      throw error
    })

  cache.set(src, entry)
  return entry
}

/** Фоновая загрузка (не блокирует UI). Повторный вызов переиспользует тот же запрос. */
export function preloadPanorama(src: string): Promise<Blob> {
  return ensureEntry(src).promise
}

/** По очереди: сначала верхняя панорама галереи, потом остальные. */
export async function preloadPanoramasSequential(srcs: string[]): Promise<void> {
  for (const src of srcs) {
    try {
      await preloadPanorama(src)
    } catch {
      /* следующую всё равно пробуем */
    }
  }
}

export function getPanoramaCacheProgress(src: string): number {
  return cache.get(src)?.progress ?? 0
}

export function isPanoramaCached(src: string): boolean {
  return Boolean(cache.get(src)?.blob)
}

/** Blob из кэша или тот же in-flight fetch + подписка на прогресс. */
export async function getPanoramaBlob(
  src: string,
  onProgress?: ProgressListener,
): Promise<Blob> {
  const entry = ensureEntry(src)
  if (onProgress) {
    entry.listeners.add(onProgress)
    onProgress(entry.progress)
  }
  try {
    return await entry.promise
  } finally {
    if (onProgress) entry.listeners.delete(onProgress)
  }
}
