import { useEffect, useState, type CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import { useBookingModal, type BookingSimulatorSlug } from '../contexts/BookingModalContext'
import { simulators } from '../data/simulators'

/** Авиашколу временно скрываем — на главной только две колонки */
const slides = simulators.filter((s) => s.slug !== 'avia-school')

/** Фоны колонок первой секции на главной — из `public/assets/hero/` */
const HOME_HERO_SLIDE_IMAGES: Record<string, string> = {
  'mi-2': '/assets/hero/mi_2.webp',
  'boeing-737': '/assets/hero/boeing_737.webp',
  'avia-school': '/assets/hero/avia_school.webp',
}

/**
 * Кадрирование фото (object-position).
 * В DevTools на <article> крути --hero-pos-x / --hero-pos-y
 * (например 40% 55%, left center, 20% 50%).
 */
const HOME_HERO_OBJECT_POS: Record<string, { x: string; y: string }> = {
  'mi-2': { x: '90%', y: '50%' },
  'boeing-737': { x: '87%', y: '50%' },
  'avia-school': { x: '50%', y: '50%' },
}

const SLANT_VW = 22.2603
/** Покой: две колонки поровну (с учётом косого overlap) */
const REST_W_VW = (100 + SLANT_VW) / 2
/** Hover: активная шире, вторая забирает остаток под тот же slant — без дыр во flex */
const ACTIVE_W_VW = 75
const INACTIVE_W_VW = 100 + SLANT_VW - ACTIVE_W_VW
const DESKTOP_MIN = 990

function columnWidths(activeId: string | null): [number, number] {
  if (activeId === null) return [REST_W_VW, REST_W_VW]
  return slides.map((s) => (s.slug === activeId ? ACTIVE_W_VW : INACTIVE_W_VW)) as [
    number,
    number,
  ]
}

function HomeHero() {
  const { openBooking } = useBookingModal()
  const [activeId, setActiveId] = useState<string | null>(null)
  const [isDesktop, setIsDesktop] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth >= DESKTOP_MIN : true
  )

  useEffect(() => {
    const onResize = () => setIsDesktop(window.innerWidth >= DESKTOP_MIN)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const widths = columnWidths(activeId)
  const slantVw = widths[0] + widths[1] - 100

  return (
    <section
      id="simulators-hero"
      onMouseLeave={() => {
        if (!isDesktop) return
        setActiveId(null)
      }}
      className="relative w-full overflow-hidden bg-[#202020] min-[990px]:h-[min(61.6438vw,100vh)]"
    >
      <div className="flex w-full flex-col min-[990px]:h-full min-[990px]:flex-row min-[990px]:gap-0 min-[990px]:p-0">
        {slides.map((slide, idx) => {
          const isActive = activeId === slide.slug
          const isDimmed = activeId !== null && activeId !== slide.slug
          const isFirst = idx === 0
          const isLast = idx === slides.length - 1
          const widthVw = widths[idx]

          const topLeft = isFirst ? '0' : `${slantVw}vw`
          const bottomRight = isLast ? '100%' : `calc(100% - ${slantVw}vw)`
          const clipPath = `polygon(${topLeft} 0, 100% 0, ${bottomRight} 100%, 0 100%)`

          const pos = HOME_HERO_OBJECT_POS[slide.slug] ?? { x: '50%', y: '50%' }

          const desktopStyle = isDesktop
            ? ({
                clipPath,
                width: `${widthVw}vw`,
                marginLeft: isFirst ? 0 : `-${slantVw}vw`,
                ['--hero-pos-x']: pos.x,
                ['--hero-pos-y']: pos.y,
              } as CSSProperties)
            : ({
                ['--hero-pos-x']: pos.x,
                ['--hero-pos-y']: pos.y,
              } as CSSProperties)
          const simulatorPath = `/simulator/${slide.slug}`

          return (
            <article
              key={slide.slug}
              onMouseEnter={() => {
                if (!isDesktop) return
                setActiveId(slide.slug)
              }}
              style={desktopStyle}
              className={[
                'group relative overflow-hidden',
                'min-[990px]:h-full min-[990px]:flex-none min-[990px]:cursor-pointer min-[990px]:transition-[width,margin] min-[990px]:duration-500 min-[990px]:ease-out',
              ].join(' ')}
            >
              <img
                src={HOME_HERO_SLIDE_IMAGES[slide.slug]}
                alt={slide.title}
                style={{
                  objectPosition: 'var(--hero-pos-x) var(--hero-pos-y)',
                  ...(isDesktop
                    ? {
                        // Ширина = макс. активная: при сужении колонки кадр не зумится,
                        // просто обрезается; при расширении открывается уже лежащая часть.
                        width: `${ACTIVE_W_VW}vw`,
                        height: '100%',
                        maxWidth: 'none',
                        left: isFirst ? 0 : undefined,
                        right: isLast ? 0 : undefined,
                      }
                    : undefined),
                }}
                className="block h-auto w-full object-cover min-[990px]:absolute min-[990px]:inset-y-0 min-[990px]:h-full"
              />

              <div
                className={[
                  'absolute inset-0 hidden transition-colors duration-500 min-[990px]:block',
                  isDimmed ? 'bg-[#151824]/45' : 'bg-transparent',
                ].join(' ')}
              />

              <div
                style={
                  isDesktop
                    ? { paddingRight: isLast ? '40px' : `calc(${slantVw}vw + 24px)` }
                    : undefined
                }
                className="absolute inset-x-0 bottom-0 z-10 hidden items-center justify-between gap-4 px-10 pb-8 pt-20 min-[990px]:flex"
              >
                <h2 className="whitespace-nowrap text-[min(2.6vw,38px)] font-bold leading-none tracking-tight text-white">
                  {slide.title}
                </h2>
                <div
                  className={[
                    'pointer-events-none flex shrink-0 items-center gap-3 transition-opacity duration-300',
                    isActive ? 'pointer-events-auto opacity-100' : 'opacity-0',
                  ].join(' ')}
                >
                  <button
                    type="button"
                    onClick={() =>
                      openBooking({
                        simulatorSlug: slide.slug as BookingSimulatorSlug,
                      })
                    }
                    className="btn-book-flight h-12 px-10 text-lg font-medium"
                  >
                    Забронировать полет
                  </button>
                  <Link
                    to={simulatorPath}
                    className="btn-outline-light h-12 px-9 text-lg font-medium"
                  >
                    Подробнее <span className="ml-2">→</span>
                  </Link>
                </div>
              </div>

              <Link
                to={simulatorPath}
                className="btn-book-flight absolute bottom-6 left-1/2 z-20 -translate-x-1/2 whitespace-nowrap px-7 py-3 text-base font-semibold no-underline min-[990px]:hidden"
              >
                {slide.mobileButtonText}
                <span aria-hidden="true">→</span>
              </Link>
            </article>
          )
        })}
      </div>
    </section>
  )
}

export default HomeHero
