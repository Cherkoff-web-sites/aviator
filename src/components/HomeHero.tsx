import { useEffect, useState } from 'react'

const slides = [
  {
    id: 'mi-2',
    title: 'Ми-2',
    mobileButtonText: 'Тренажер Ми-2',
    image: '/assets/hero/mi-2.webp',
  },
  {
    id: 'boeing-737',
    title: 'Boeing 737 NG',
    mobileButtonText: 'Тренажер Boeing 737NG',
    image: '/assets/hero/boeing-737.webp',
  },
  {
    id: 'avia-school',
    title: 'Авиашкола',
    mobileButtonText: 'Авиашкола',
    image: '/assets/hero/avia-school.webp',
  },
]

const SLANT_VW = 22.2603
const ACTIVE_W_VW = 68
const INACTIVE_W_VW = 41.0959
const DESKTOP_MIN = 990

const DEFAULT_ACTIVE_ID = slides[1].id

function HomeHero() {
  const [activeId, setActiveId] = useState(DEFAULT_ACTIVE_ID)
  const [hasUserHovered, setHasUserHovered] = useState(false)
  const [isDesktop, setIsDesktop] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth >= DESKTOP_MIN : true
  )

  useEffect(() => {
    const onResize = () => setIsDesktop(window.innerWidth >= DESKTOP_MIN)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  return (
    <section
      onMouseLeave={() => {
        if (!isDesktop) return
        setActiveId(DEFAULT_ACTIVE_ID)
        setHasUserHovered(false)
      }}
      className="relative w-full overflow-hidden bg-[#202020] min-[990px]:h-[min(61.6438vw,100vh)]"
    >
      <div className="flex w-full flex-col min-[990px]:h-full min-[990px]:flex-row min-[990px]:gap-0 min-[990px]:p-0">
        {slides.map((slide, idx) => {
          const isActive = slide.id === activeId
          const isDimmed = activeId !== slide.id
          const isFirst = idx === 0
          const isLast = idx === slides.length - 1

          const topLeft = isFirst ? '0' : `${SLANT_VW}vw`
          const bottomRight = isLast ? '100%' : `calc(100% - ${SLANT_VW}vw)`
          const clipPath = `polygon(${topLeft} 0, 100% 0, ${bottomRight} 100%, 0 100%)`

          const desktopStyle = isDesktop
            ? {
                clipPath,
                width: `${isActive ? ACTIVE_W_VW : INACTIVE_W_VW}vw`,
                marginLeft: isFirst ? 0 : `-${SLANT_VW}vw`,
              }
            : undefined
          const actionsRightOffset = isLast ? '40px' : `calc(${SLANT_VW}vw + 24px)`

          return (
            <article
              key={slide.id}
              onMouseEnter={() => {
                if (!isDesktop) return
                setActiveId(slide.id)
                setHasUserHovered(true)
              }}
              style={desktopStyle}
              className={[
                'group relative overflow-hidden',
                'min-[990px]:h-full min-[990px]:flex-none min-[990px]:cursor-pointer min-[990px]:transition-all min-[990px]:duration-500 min-[990px]:ease-out',
              ].join(' ')}
            >
              <img
                src={slide.image}
                alt={slide.title}
                className="block h-auto w-full object-cover object-center min-[990px]:absolute min-[990px]:inset-0 min-[990px]:h-full min-[990px]:w-full min-[990px]:transition-transform min-[990px]:duration-700 min-[990px]:group-hover:scale-[1.03]"
              />

              <div
                className={[
                  'absolute inset-0 hidden transition-colors duration-500 min-[990px]:block',
                  hasUserHovered && isDimmed ? 'bg-[#151824]/45' : 'bg-transparent',
                ].join(' ')}
              />

              <div className="absolute inset-x-0 bottom-0 z-10 hidden items-end px-10 pb-8 pt-20 min-[990px]:flex">
                <h2 className="text-[38px] font-bold leading-none tracking-tight text-white">
                  {slide.title}
                </h2>
              </div>

              <div
                style={isDesktop ? { right: actionsRightOffset } : undefined}
                className={[
                  'pointer-events-none absolute bottom-9 z-20 hidden items-center gap-3 transition-opacity duration-300 min-[990px]:flex',
                  hasUserHovered && isActive
                    ? 'opacity-100 pointer-events-auto'
                    : 'opacity-0',
                ].join(' ')}
              >
                <button className="h-12 rounded-full bg-[#1f69ff] px-10 text-lg font-medium text-white">
                  Забронировать полет
                </button>
                <button className="inline-flex h-12 items-center rounded-full border border-white/70 bg-transparent px-9 text-lg font-medium text-white">
                  Подробнее <span className="ml-2">→</span>
                </button>
              </div>

              <a
                href="#"
                className="absolute bottom-6 left-1/2 z-20 inline-flex -translate-x-1/2 items-center gap-2 whitespace-nowrap rounded-[35px] bg-[radial-gradient(98.31%_98.31%_at_50%_50%,#0075FF_0%,#322E67_100%)] px-7 py-3 text-base font-semibold text-white min-[990px]:hidden"
              >
                {slide.mobileButtonText}
                <span aria-hidden="true">→</span>
              </a>
            </article>
          )
        })}
      </div>
    </section>
  )
}

export default HomeHero
