import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Swiper, SwiperSlide } from 'swiper/react'
import 'swiper/css'

const PHOTO_SLIDES = [
  '/assets/simulator/photo_sm_1.webp',
  '/assets/simulator/photo_sm_2.webp',
  '/assets/simulator/photo_sm_3.webp',
] as const

const ARROW_RIGHT_SRC = '/assets/icons/arrow_right.svg'

export type SimulatorPhotoSliderProps = {
  title: string
  description: string
  galleryTo: string
}

function SimulatorPhotoSlider({ title, description, galleryTo }: SimulatorPhotoSliderProps) {
  const [atEnd, setAtEnd] = useState(false)

  const syncEnd = (swiper: { isEnd: boolean }) => {
    setAtEnd(swiper.isEnd)
  }

  return (
    <section className="bg-[#002D62] py-12 text-white min-[990px]:py-16">
      <div className="container-app">
        <h2 className="mb-4 max-w-[720px] text-[24px] font-bold leading-tight tracking-tight min-[990px]:text-[32px]">
          {title}
        </h2>
        <p className="mb-8 max-w-[720px] text-[16px] font-medium leading-relaxed text-white/95 min-[990px]:mb-10 min-[990px]:text-[18px]">
          {description}
        </p>

        <Swiper
          centeredSlides
          slidesPerView="auto"
          spaceBetween={16}
          className="w-full"
          onAfterInit={syncEnd}
          onSlideChange={syncEnd}
          onResize={syncEnd}
        >
          {PHOTO_SLIDES.map((src) => (
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
