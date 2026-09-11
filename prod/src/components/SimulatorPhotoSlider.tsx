import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Swiper, SwiperSlide } from 'swiper/react'
import 'swiper/css'

const ARROW_RIGHT_SRC = '/assets/icons/arrow_right.svg'

/** Левый inset как у `.container-app` (max-w 1404px + px-3) */
const SLIDER_PL =
  'pl-[max(0.75rem,calc((100vw-1404px)/2+0.75rem))]'

export type SimulatorPhotoSliderProps = {
  title: string
  description: string
  images: readonly string[]
  galleryTo: string
}

function SimulatorPhotoSlider({ title, description, images, galleryTo }: SimulatorPhotoSliderProps) {
  const [atEnd, setAtEnd] = useState(false)

  const syncEnd = (swiper: { isEnd: boolean }) => {
    setAtEnd(swiper.isEnd)
  }

  return (
    <section
      data-sim-reveal="slider"
      className="overflow-x-clip bg-[#002D62] py-12 text-white min-[990px]:py-16"
    >
      <div className="container-app">
        <h2
          data-sim-reveal-item
          className="mb-4 max-w-[720px] text-[24px] font-bold leading-tight tracking-tight min-[990px]:text-[32px]"
        >
          {title}
        </h2>
        <p
          data-sim-reveal-item
          className="mb-8 max-w-[720px] text-[16px] font-medium leading-relaxed text-white/95 min-[990px]:mb-10 min-[990px]:text-[18px]"
        >
          {description}
        </p>
      </div>

      {/* Слева как контейнер, справа — до края экрана */}
      <div className={`w-screen max-w-[100vw] ${SLIDER_PL}`}>
        <Swiper
          centeredSlides
          slidesPerView="auto"
          spaceBetween={16}
          className="w-full"
          onAfterInit={syncEnd}
          onSlideChange={syncEnd}
          onResize={syncEnd}
        >
          {images.map((src) => (
            <SwiperSlide
              key={src}
              className="!w-[min(88vw,720px)] min-[990px]:!w-[min(72vw,800px)]"
            >
              <img
                src={src}
                alt=""
                className="aspect-[16/10] w-full rounded-[24px] object-cover"
                loading="lazy"
              />
            </SwiperSlide>
          ))}
        </Swiper>
      </div>

      <div className="container-app">
        <div
          className={[
            'mt-8 flex justify-center transition-all duration-300 ease-out',
            atEnd ? 'translate-y-0 opacity-100' : 'pointer-events-none -translate-y-1 opacity-0',
          ].join(' ')}
          aria-hidden={!atEnd}
        >
          <Link
            to={galleryTo}
            tabIndex={atEnd ? 0 : -1}
            className="inline-flex items-center gap-2 text-[16px] font-medium text-white no-underline min-[990px]:text-[18px]"
          >
            Посмотреть больше в Галерее
            <img
              src={ARROW_RIGHT_SRC}
              alt=""
              width={20}
              height={15}
              className="shrink-0 brightness-0 invert"
              aria-hidden="true"
            />
          </Link>
        </div>
      </div>
    </section>
  )
}

export default SimulatorPhotoSlider
