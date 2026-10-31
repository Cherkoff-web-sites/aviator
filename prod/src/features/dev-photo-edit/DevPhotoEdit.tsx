/**
 * TEMP / удаляемая фича: локальная замена фото без сервера.
 * Хранение только в памяти вкладки — после обновления страницы всё сбрасывается.
 * Чтобы убрать: удалите этот файл и `<DevPhotoEdit />` из App.tsx.
 *
 * Клик идёт через свой оверлей (не capture на document): иначе браузер
 * блокирует программный input.click() / showPicker().
 */
import * as React from 'react'
import { ImagePlus, RotateCcw, X } from 'lucide-react'

type Override = { blobUrl: string }

type PhotoTarget = {
  kind: 'img' | 'bg'
  el: HTMLElement
  originalKey: string
}

function normalizeSrc(src: string) {
  try {
    return new URL(src, window.location.href).href
  } catch {
    return src
  }
}

function extractBgUrl(style: CSSStyleDeclaration | string): string | null {
  const raw = typeof style === 'string' ? style : style.backgroundImage
  if (!raw || raw === 'none') return null
  const m = raw.match(/url\(["']?([^"')]+)["']?\)/i)
  if (!m?.[1]) return null
  const url = m[1]
  if (url.startsWith('data:image/svg')) return null
  return normalizeSrc(url)
}

function isLargeEnough(el: Element, min = 64) {
  const r = el.getBoundingClientRect()
  return r.width >= min && r.height >= min
}

function pointInRect(x: number, y: number, el: Element) {
  const r = el.getBoundingClientRect()
  return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom
}

function targetFromImg(img: HTMLImageElement): PhotoTarget | null {
  if (!img.src) return null
  if (!isLargeEnough(img)) return null
  const originalKey = img.dataset.devPhotoOriginal || normalizeSrc(img.currentSrc || img.src)
  if (originalKey.startsWith('blob:') && !img.dataset.devPhotoOriginal) return null
  return { kind: 'img', el: img, originalKey }
}

function targetFromBg(el: HTMLElement): PhotoTarget | null {
  if (!isLargeEnough(el)) return null
  const key =
    el.dataset.devPhotoOriginal ||
    extractBgUrl(el.style) ||
    extractBgUrl(getComputedStyle(el))
  if (!key) return null
  if (key.startsWith('blob:') && !el.dataset.devPhotoOriginal) return null
  return { kind: 'bg', el, originalKey: key }
}

function collectPhotosIn(host: ParentNode, x: number, y: number, into: PhotoTarget[]) {
  host.querySelectorAll('img').forEach((node) => {
    if (!pointInRect(x, y, node)) return
    const t = targetFromImg(node as HTMLImageElement)
    if (t) into.push(t)
  })
  host.querySelectorAll('.bg-cover, [class*="bg-cover"]').forEach((node) => {
    if (!(node instanceof HTMLElement)) return
    if (!pointInRect(x, y, node)) return
    const t = targetFromBg(node)
    if (t) into.push(t)
  })
  host.querySelectorAll('[style*="background"]').forEach((node) => {
    if (!(node instanceof HTMLElement)) return
    if (!pointInRect(x, y, node)) return
    const t = targetFromBg(node)
    if (t) into.push(t)
  })
}

function dedupeTargets(list: PhotoTarget[]) {
  const seen = new Set<HTMLElement>()
  return list.filter((t) => {
    if (seen.has(t.el)) return false
    seen.add(t.el)
    return true
  })
}

function findPhotoAt(x: number, y: number): PhotoTarget | null {
  const stack = document.elementsFromPoint(x, y)
  const fromStack: PhotoTarget[] = []

  for (const node of stack) {
    if (!(node instanceof HTMLElement)) continue
    if (node.closest('[data-dev-photo-ui]')) continue

    if (node.tagName === 'IMG') {
      const t = targetFromImg(node as HTMLImageElement)
      if (t) fromStack.push(t)
      continue
    }

    const t = targetFromBg(node)
    if (t) fromStack.push(t)
  }

  const top = stack.find(
    (n) => n instanceof Element && !n.closest('[data-dev-photo-ui]'),
  ) as Element | undefined
  if (!top) return fromStack[0] ?? null

  const article = top.closest('article')
  const scoped: PhotoTarget[] = []
  if (article) collectPhotosIn(article, x, y, scoped)

  const section =
    top.closest('section, main, [class*="pricing"], [id*="hero"], [id*="price"]') ?? null
  const fromSection: PhotoTarget[] = []
  if (section) collectPhotosIn(section, x, y, fromSection)

  const candidates = dedupeTargets([
    ...fromStack,
    ...scoped,
    ...(scoped.length === 0 ? fromSection : fromSection.filter((t) => t.kind === 'bg')),
  ])

  if (candidates.length === 0 && section) {
    collectPhotosIn(section, x, y, candidates)
  }

  if (candidates.length === 0) return null

  candidates.sort((a, b) => {
    const aInArticle = article ? Number(article.contains(a.el)) : 0
    const bInArticle = article ? Number(article.contains(b.el)) : 0
    if (aInArticle !== bInArticle) return bInArticle - aInArticle

    const ra = a.el.getBoundingClientRect()
    const rb = b.el.getBoundingClientRect()
    const areaA = ra.width * ra.height
    const areaB = rb.width * rb.height
    if (article && Math.abs(areaA - areaB) < 1) {
      const ar = article.getBoundingClientRect()
      const acx = (ar.left + ar.right) / 2
      const aCenter = Math.abs((ra.left + ra.right) / 2 - acx)
      const bCenter = Math.abs((rb.left + rb.right) / 2 - acx)
      return aCenter - bCenter
    }
    return areaA - areaB
  })

  return candidates[0]
}

function clearHoverMarks() {
  document.querySelectorAll('[data-dev-photo-hover]').forEach((n) => {
    delete (n as HTMLElement).dataset.devPhotoHover
  })
}

function markHover(hit: PhotoTarget) {
  const paint =
    (hit.el.closest('article') as HTMLElement | null) ||
    (hit.el.closest('section') as HTMLElement | null) ||
    hit.el
  paint.dataset.devPhotoHover = '1'
}

function openFilePicker(input: HTMLInputElement) {
  if (typeof input.showPicker === 'function') {
    try {
      input.showPicker()
      return
    } catch {
      // fall through — showPicker может требовать жест; click() обычно ок из React onClick
    }
  }
  input.click()
}

export default function DevPhotoEdit() {
  const [open, setOpen] = React.useState(false)
  const [active, setActive] = React.useState(false)
  const [count, setCount] = React.useState(0)
  const overridesRef = React.useRef(new Map<string, Override>())
  const fileRef = React.useRef<HTMLInputElement>(null)
  const overlayRef = React.useRef<HTMLDivElement>(null)
  const pendingRef = React.useRef<PhotoTarget | null>(null)

  const bumpCount = React.useCallback(() => {
    setCount(overridesRef.current.size)
  }, [])

  /** Hit-test сквозь наш оверлей. */
  const hitThroughOverlay = React.useCallback((clientX: number, clientY: number) => {
    const overlay = overlayRef.current
    if (overlay) overlay.style.pointerEvents = 'none'
    const hit = findPhotoAt(clientX, clientY)
    if (overlay) overlay.style.pointerEvents = 'auto'
    return hit
  }, [])

  const applyOverrides = React.useCallback(() => {
    const map = overridesRef.current
    if (map.size === 0) return

    document.querySelectorAll('img[src]').forEach((node) => {
      const img = node as HTMLImageElement
      const key = img.dataset.devPhotoOriginal || normalizeSrc(img.currentSrc || img.src)
      const hit = map.get(key)
      if (hit && img.src !== hit.blobUrl) {
        img.dataset.devPhotoOriginal = key
        img.src = hit.blobUrl
      }
    })

    document.querySelectorAll('.bg-cover, [class*="bg-cover"], [style*="background"]').forEach((node) => {
      const el = node as HTMLElement
      const key =
        el.dataset.devPhotoOriginal ||
        extractBgUrl(el.style) ||
        extractBgUrl(getComputedStyle(el))
      if (!key) return
      const ov = map.get(key)
      if (ov) {
        el.dataset.devPhotoOriginal = key
        el.style.backgroundImage = `url("${ov.blobUrl}")`
        el.style.backgroundSize = el.style.backgroundSize || 'cover'
        el.style.backgroundPosition = el.style.backgroundPosition || 'center'
      }
    })
  }, [])

  const clearAll = React.useCallback(() => {
    for (const { blobUrl } of overridesRef.current.values()) {
      URL.revokeObjectURL(blobUrl)
    }
    overridesRef.current.clear()
    setCount(0)
    document.querySelectorAll('[data-dev-photo-original]').forEach((node) => {
      const el = node as HTMLElement
      const original = el.dataset.devPhotoOriginal
      if (!original) return
      if (el.tagName === 'IMG') {
        ;(el as HTMLImageElement).src = original
      } else {
        el.style.backgroundImage = `url("${original}")`
      }
      delete el.dataset.devPhotoOriginal
    })
    clearHoverMarks()
  }, [])

  React.useEffect(() => {
    if (!active && overridesRef.current.size === 0) return
    applyOverrides()
    const mo = new MutationObserver(() => applyOverrides())
    mo.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['src', 'style', 'class'],
    })
    return () => mo.disconnect()
  }, [active, applyOverrides, count])

  React.useEffect(() => {
    if (!active) clearHoverMarks()
    document.body.dataset.devPhotoActive = active ? '1' : '0'
    return () => {
      delete document.body.dataset.devPhotoActive
      clearHoverMarks()
    }
  }, [active])

  const onOverlayMove = (e: React.PointerEvent) => {
    const hit = hitThroughOverlay(e.clientX, e.clientY)
    clearHoverMarks()
    if (hit) markHover(hit)
  }

  const onOverlayClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const hit = hitThroughOverlay(e.clientX, e.clientY)
    if (!hit) return

    pendingRef.current = hit
    const input = fileRef.current
    if (!input) return
    openFilePicker(input)
  }

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    const pending = pendingRef.current
    pendingRef.current = null
    if (!file || !pending) return

    const blobUrl = URL.createObjectURL(file)
    const prev = overridesRef.current.get(pending.originalKey)
    if (prev) URL.revokeObjectURL(prev.blobUrl)
    overridesRef.current.set(pending.originalKey, { blobUrl })

    pending.el.dataset.devPhotoOriginal = pending.originalKey
    if (pending.kind === 'img') {
      ;(pending.el as HTMLImageElement).src = blobUrl
    } else {
      pending.el.style.backgroundImage = `url("${blobUrl}")`
      pending.el.style.backgroundSize = 'cover'
      pending.el.style.backgroundPosition = 'center'
    }
    bumpCount()
  }

  return (
    <>
      <style>{`
        [data-dev-photo-hover="1"] {
          outline: 3px solid #2563eb !important;
          outline-offset: 2px;
        }
        body[data-dev-photo-active="1"] {
          cursor: crosshair;
        }
      `}</style>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        tabIndex={-1}
        aria-hidden
        className="pointer-events-none fixed left-0 top-0 h-px w-px opacity-0"
        onChange={onFile}
      />

      {active ? (
        <div
          ref={overlayRef}
          data-dev-photo-ui
          className="fixed inset-0 z-[99998] cursor-copy"
          style={{ background: 'transparent' }}
          onPointerMove={onOverlayMove}
          onPointerLeave={() => clearHoverMarks()}
          onClick={onOverlayClick}
        />
      ) : null}

      {!open ? (
        <button
          type="button"
          data-dev-photo-ui
          onClick={() => setOpen(true)}
          className="fixed bottom-4 left-4 z-[99999] flex h-11 items-center gap-2 rounded-full border border-border bg-background px-3 text-xs font-semibold shadow-lg hover:bg-muted"
          title="Временная замена фото (только в этой вкладке)"
        >
          <ImagePlus className="size-4" />
          Фото
          {count > 0 ? (
            <span className="rounded-full bg-primary px-1.5 py-0.5 text-[10px] text-primary-foreground">
              {count}
            </span>
          ) : null}
        </button>
      ) : (
        <div
          data-dev-photo-ui
          className="fixed bottom-4 left-4 z-[99999] w-[min(100vw-2rem,300px)] rounded-xl border border-border bg-background p-3 shadow-xl"
        >
          <div className="mb-2 flex items-start justify-between gap-2">
            <div>
              <p className="text-sm font-semibold">Замена фото</p>
              <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
                Работает и для hero/фонов под оверлеями. На сервер не уходит. После F5 — сброс.
              </p>
            </div>
            <button
              type="button"
              className="rounded-md p-1 text-muted-foreground hover:bg-muted"
              aria-label="Свернуть"
              onClick={() => setOpen(false)}
            >
              <X className="size-4" />
            </button>
          </div>

          <label className="mb-2 flex cursor-pointer items-center gap-2 rounded-md border border-border px-2.5 py-2 text-sm">
            <input
              type="checkbox"
              checked={active}
              onChange={(e) => setActive(e.target.checked)}
            />
            Режим замены
          </label>

          {active ? (
            <p className="mb-2 text-[11px] text-muted-foreground">
              Наведите на фото — синяя рамка, клик → выбор файла.
            </p>
          ) : null}

          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-muted-foreground">Заменено: {count}</span>
            <button
              type="button"
              disabled={count === 0}
              onClick={clearAll}
              className="inline-flex h-8 items-center gap-1 rounded-md border border-border px-2 text-xs disabled:opacity-40"
            >
              <RotateCcw className="size-3.5" />
              Сбросить
            </button>
          </div>
        </div>
      )}
    </>
  )
}
