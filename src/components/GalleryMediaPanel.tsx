import { useCallback, useRef, useState } from 'react'
import { FreeMode, Thumbs } from 'swiper/modules'
import { Swiper, SwiperSlide } from 'swiper/react'
import type { Swiper as SwiperType } from 'swiper'

import 'swiper/css'
import 'swiper/css/free-mode'
import 'swiper/css/thumbs'

export type GallerySlideItem = {
  src: string
  alt: string
  /** Бейдж 360° поверх миниатюры (как на макете — обычно первый слайд) */
  badge360OnThumb?: boolean
}

export type GalleryMediaPanelProps = {
  slides: GallerySlideItem[]
  /** Светлый блок (#e9e9e9) или тёмный градиент — меняются рамки миниатюр и точки пагинации */
  theme?: 'light' | 'dark'
  className?: string
}

function GalleryMediaPanel({ slides, theme = 'light', className = '' }: GalleryMediaPanelProps) {
  const [thumbsSwiper, setThumbsSwiper] = useState<SwiperType | null>(null)
  const mainRef = useRef<SwiperType | null>(null)
  const [activeIndex, setActiveIndex] = useState(0)

  const thumbsSwiperSafe = thumbsSwiper && !thumbsSwiper.destroyed ? thumbsSwiper : null

  const onMainSwiper = useCallback((swiper: SwiperType) => {
    mainRef.current = swiper
  }, [])

  if (slides.length === 0) {
    return null
  }

  return (
    <div
      className={`gallery-media-panel flex min-h-0 min-w-0 flex-1 flex-col gap-3 min-[990px]:min-h-[280px] min-[990px]:gap-4 ${className}`.trim()}
    >
      <Swiper
        modules={[Thumbs]}
        spaceBetween={0}
        slidesPerView={1}
        className="gallery-media-panel__main w-full"
        thumbs={{ swiper: thumbsSwiperSafe }}
        onSwiper={onMainSwiper}
        onSlideChange={(swiper) => setActiveIndex(swiper.activeIndex)}
      >
        {slides.map((slide, index) => (
          <SwiperSlide key={`${slide.src}-${index}`}>
            <div
              className={
                theme === 'dark'
                  ? 'overflow-hidden rounded-[20px] shadow-[0_16px_48px_rgba(0,0,0,0.35)] min-[990px]:rounded-[24px]'
                  : 'overflow-hidden rounded-[20px] shadow-[0_12px_40px_rgba(0,45,98,0.12)] min-[990px]:rounded-[24px]'
              }
            >
              <img
                src={slide.src}
                alt={slide.alt}
                className="aspect-[16/10] w-full object-cover min-[990px]:min-h-[300px] min-[990px]:max-h-[420px]"
              />
            </div>
          </SwiperSlide>
        ))}
      </Swiper>

      <Swiper
        modules={[FreeMode, Thumbs]}
        onSwiper={setThumbsSwiper}
        spaceBetween={8}
        slidesPerView={3.2}
        watchSlidesProgress
        freeMode
        breakpoints={{
          990: {
            slidesPerView: 5.5,
            spaceBetween: 10,
            freeMode: false,
          },
        }}
        className="gallery-media-panel__thumbs w-full !py-0.5"
      >
        {slides.map((slide, index) => (
          <SwiperSlide
            key={`thumb-${slide.src}-${index}`}
            className={
              theme === 'dark'
                ? '!h-auto cursor-pointer [&.swiper-slide-thumb-active>div]:border-white [&.swiper-slide-thumb-active>div]:shadow-[0_0_0_2px_rgba(255,255,255,0.45)]'
                : '!h-auto cursor-pointer [&.swiper-slide-thumb-active>div]:border-[#002D62] [&.swiper-slide-thumb-active>div]:shadow-[0_0_0_1px_rgba(0,45,98,0.25)]'
            }
          >
            <div
              className={
                theme === 'dark'
                  ? 'relative aspect-square w-full overflow-hidden rounded-xl border-2 border-white/35 bg-white/15 transition-[border-color,box-shadow] min-[990px]:rounded-2xl'
                  : 'relative aspect-square w-full overflow-hidden rounded-xl border-2 border-[#c5cad1] bg-[#d8dde4] transition-[border-color,box-shadow] min-[990px]:rounded-2xl'
              }
            >
              <img src={slide.src} alt="" className="h-full w-full object-cover" loading="lazy" />
              {slide.badge360OnThumb ? (
                <span
                  className="pointer-events-none absolute inset-0 flex items-center justify-center"
                  aria-hidden
                >
                  <span className="rounded-full border-2 border-white bg-black/40 px-2.5 py-1 text-[11px] font-bold uppercase leading-none tracking-wide text-white backdrop-blur-[2px] min-[990px]:px-3 min-[990px]:py-1.5 min-[990px]:text-xs">
                    360°
                  </span>
                </span>
              ) : null}
            </div>
          </SwiperSlide>
        ))}
      </Swiper>

      <div className="flex justify-center gap-2.5 pt-0.5" role="tablist" aria-label="Слайды галереи">
        {slides.map((_, i) => (
          <button
            key={i}
            type="button"
            role="tab"
            aria-selected={i === activeIndex}
            aria-label={`Показать слайд ${i + 1}`}
            className={
              theme === 'dark'
                ? `rounded-full transition-all min-[990px]:h-2.5 min-[990px]:w-2.5 ${i === activeIndex ? 'h-2.5 w-2.5 bg-white min-[990px]:h-3 min-[990px]:w-3' : 'h-2 w-2 bg-white/35 hover:bg-white/55'}`
                : `h-2 w-2 rounded-full transition-colors min-[990px]:h-2.5 min-[990px]:w-2.5 ${i === activeIndex ? 'bg-[#002D62]' : 'bg-[#c5cad1] hover:bg-[#9ca3af]'}`
            }
            onClick={() => mainRef.current?.slideTo(i)}
          />
        ))}
      </div>
    </div>
  )
}

export default GalleryMediaPanel
