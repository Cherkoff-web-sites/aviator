import * as Dialog from '@radix-ui/react-dialog'
import { useCallback, useEffect, useRef } from 'react'

import type { GallerySlideItem } from './GalleryMediaPanel'

type GalleryLightboxProps = {
  open: boolean
  slides: GallerySlideItem[]
  index: number
  onIndexChange: (index: number) => void
  onClose: () => void
}

function GalleryLightbox({ open, slides, index, onIndexChange, onClose }: GalleryLightboxProps) {
  const touchStartX = useRef<number | null>(null)
  const count = slides.length
  const slide = slides[index]

  const goPrev = useCallback(() => {
    if (count < 2) return
    onIndexChange((index - 1 + count) % count)
  }, [count, index, onIndexChange])

  const goNext = useCallback(() => {
    if (count < 2) return
    onIndexChange((index + 1) % count)
  }, [count, index, onIndexChange])

  useEffect(() => {
    if (!open) return

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        e.preventDefault()
        goPrev()
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        goNext()
      }
    }

    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [goNext, goPrev, open])

  if (!slide) return null

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose()
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[120] bg-black/88 backdrop-blur-xl data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content
          className="fixed inset-0 z-[121] flex flex-col outline-none focus:outline-none"
          aria-describedby={undefined}
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <Dialog.Title className="sr-only">
            Просмотр фото: {slide.alt || `Слайд ${index + 1}`}
          </Dialog.Title>

          <div className="flex shrink-0 items-center justify-between gap-3 px-4 py-3 min-[990px]:px-6 min-[990px]:py-4">
            <p className="text-[14px] font-medium text-white/80 min-[990px]:text-[15px]">
              {index + 1} / {count}
            </p>
            <Dialog.Close
              type="button"
              className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
              aria-label="Закрыть"
            >
              <span className="text-2xl leading-none" aria-hidden>
                ×
              </span>
            </Dialog.Close>
          </div>

          <div className="relative flex min-h-0 flex-1 items-center justify-center px-3 pb-4 min-[990px]:px-16 min-[990px]:pb-8">
            {count > 1 ? (
              <>
                <button
                  type="button"
                  onClick={goPrev}
                  aria-label="Предыдущее фото"
                  className="absolute left-2 z-10 inline-flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 min-[990px]:left-4 min-[990px]:h-12 min-[990px]:w-12"
                >
                  <span className="text-xl leading-none" aria-hidden>
                    ←
                  </span>
                </button>
                <button
                  type="button"
                  onClick={goNext}
                  aria-label="Следующее фото"
                  className="absolute right-2 z-10 inline-flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 min-[990px]:right-4 min-[990px]:h-12 min-[990px]:w-12"
                >
                  <span className="text-xl leading-none" aria-hidden>
                    →
                  </span>
                </button>
              </>
            ) : null}

            <div
              className="flex max-h-full max-w-full items-center justify-center"
              onTouchStart={(e) => {
                touchStartX.current = e.changedTouches[0]?.clientX ?? null
              }}
              onTouchEnd={(e) => {
                const start = touchStartX.current
                const end = e.changedTouches[0]?.clientX
                touchStartX.current = null
                if (start == null || end == null || count < 2) return
                const delta = end - start
                if (Math.abs(delta) < 48) return
                if (delta > 0) goPrev()
                else goNext()
              }}
            >
              <img
                key={slide.src}
                src={slide.src}
                alt={slide.alt}
                className="max-h-[min(78dvh,900px)] max-w-full rounded-lg object-contain shadow-[0_20px_60px_rgba(0,0,0,0.45)] min-[990px]:rounded-xl"
                draggable={false}
              />
            </div>
          </div>

          {slide.alt ? (
            <p className="shrink-0 px-4 pb-5 text-center text-[13px] font-medium text-white/65 min-[990px]:pb-6 min-[990px]:text-[14px]">
              {slide.alt}
            </p>
          ) : null}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

export default GalleryLightbox
