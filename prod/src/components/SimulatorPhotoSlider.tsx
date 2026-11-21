import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useLayoutEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'

gsap.registerPlugin(ScrollTrigger)

const ARROW_RIGHT_SRC = '/assets/icons/arrow_right.svg'

/** Во сколько раз длиннее скролл страницы относительно сдвига ленты (>1 = больше крутить) */
const SCROLL_DISTANCE_FACTOR = 1.85
/** Scrub-лаг: анимация ленты догоняет скролл с задержкой */
const SCRUB_LAG = 0.85

export type SimulatorPhotoSliderProps = {
  title: string
  description: string
  images: readonly string[]
  galleryTo: string
}

/**
 * Горизонтальный слайдер на GSAP:
 * секция пинится, вертикальный скролл двигает ленту;
 * первый и последний слайды по центру экрана.
 */
function SimulatorPhotoSlider({ title, description, images, galleryTo }: SimulatorPhotoSliderProps) {
  const pinRef = useRef<HTMLDivElement>(null)
  const trackRef = useRef<HTMLDivElement>(null)
  const [atEnd, setAtEnd] = useState(false)

  useLayoutEffect(() => {
    const pinRoot = pinRef.current
    const track = trackRef.current
    if (!pinRoot || !track || images.length === 0) return

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setAtEnd(true)
      return
    }

    const getViewportWidth = () =>
      track.parentElement?.clientWidth || window.innerWidth
    const getTravel = () => Math.max(0, track.scrollWidth - getViewportWidth())

    const paintPinSpacer = (self: ScrollTrigger) => {
      const spacer = self.pin?.parentElement
      if (spacer?.classList.contains('pin-spacer')) {
        spacer.style.backgroundColor = '#002D62'
      }
    }

    const ctx = gsap.context(() => {
      gsap.to(track, {
        x: () => -getTravel(),
        ease: 'none',
        scrollTrigger: {
          trigger: pinRoot,
          start: 'top top',
          end: () => `+=${Math.max(getTravel() * SCROLL_DISTANCE_FACTOR, window.innerHeight)}`,
          pin: true,
          pinSpacing: true,
          scrub: SCRUB_LAG,
          anticipatePin: 1,
          invalidateOnRefresh: true,
          onUpdate: (self) => {
            setAtEnd(self.progress >= 0.92 || getTravel() < 8)
          },
          onRefresh: (self) => {
            paintPinSpacer(self)
            setAtEnd(self.progress >= 0.92 || getTravel() < 8)
          },
          onEnter: paintPinSpacer,
        },
      })
    }, pinRoot)

    const onImg = () => ScrollTrigger.refresh()
    const imgs = Array.from(track.querySelectorAll('img'))
    imgs.forEach((img) => {
      if (!img.complete) img.addEventListener('load', onImg)
    })

    const raf = requestAnimationFrame(() => ScrollTrigger.refresh())
    const t = window.setTimeout(() => ScrollTrigger.refresh(), 120)

    return () => {
      cancelAnimationFrame(raf)
      window.clearTimeout(t)
      imgs.forEach((img) => img.removeEventListener('load', onImg))
      ctx.revert()
      setAtEnd(false)
    }
  }, [images])

  return (
    <div ref={pinRef} className="relative z-20 overflow-x-clip bg-[#002D62]">
      <section
        data-sim-reveal="slider"
        className="bg-[#002D62] py-12 text-white min-[990px]:py-16"
      >
        <div className="container-app">
          <h2
            data-sim-reveal-item
            className="mb-4 max-w-[720px] text-[24px] font-bold leading-tight tracking-tight min-[990px]:text-[32px]"
          >
            {title}
          </h2>
          {description.trim() ? (
            <p
              data-sim-reveal-item
              className="mb-8 max-w-[720px] text-[16px] font-medium leading-relaxed text-white/95 min-[990px]:mb-10 min-[990px]:text-[18px]"
            >
              {description}
            </p>
          ) : (
            <div className="mb-8 min-[990px]:mb-10" />
          )}
        </div>

        {/*
          w-full (не 100vw): иначе на странице появляется горизонтальный скролл.
          Паддинги центрируют первый/последний слайд.
        */}
        <div className="w-full overflow-x-clip">
          <div
            ref={trackRef}
            className={[
              'flex w-max max-w-none will-change-transform gap-4 min-[990px]:gap-5',
              'pl-[max(0px,calc((100%-min(88vw,720px))/2))]',
              'pr-[max(0px,calc((100%-min(88vw,720px))/2))]',
              'min-[990px]:pl-[max(0px,calc((100%-min(72vw,800px))/2))]',
              'min-[990px]:pr-[max(0px,calc((100%-min(72vw,800px))/2))]',
            ].join(' ')}
          >
            {images.map((src, i) => (
              <div
                key={`${src}-${i}`}
                data-sim-slide
                className="w-[min(88vw,720px)] shrink-0 min-[990px]:w-[min(72vw,800px)]"
              >
                <img
                  src={src}
                  alt=""
                  className="aspect-[16/10] w-full rounded-[24px] object-cover"
                  loading={i === 0 ? 'eager' : 'lazy'}
                  draggable={false}
                />
              </div>
            ))}
          </div>
        </div>

        <div className="container-app">
          {/* Место под ссылку всегда зарезервировано — без скачка layout при появлении */}
          <div className="mt-8 flex min-h-[28px] justify-center min-[990px]:min-h-[30px]">
            <Link
              to={galleryTo}
              tabIndex={atEnd ? 0 : -1}
              aria-hidden={!atEnd}
              className={[
                'inline-flex items-center gap-2 text-[16px] font-medium text-white no-underline transition-opacity duration-500 ease-out min-[990px]:text-[18px]',
                atEnd ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0',
              ].join(' ')}
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
    </div>
  )
}

export default SimulatorPhotoSlider
