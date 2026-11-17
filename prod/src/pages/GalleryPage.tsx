import { useEffect, useMemo } from 'react'

import ContentSplitSectionLight from '../components/ContentSplitSectionLight'
import GalleryGradientSplitSection from '../components/GalleryGradientSplitSection'
import GalleryMediaPanel from '../components/GalleryMediaPanel'
import SiteCtaBanner from '../components/SiteCtaBanner'
import SiteFooter from '../components/SiteFooter'
import SiteHeader from '../components/SiteHeader'
import { resolveMediaUrl } from '../data/siteImages'
import { useSiteImages } from '../hooks/useSiteImages'
import { preloadPanoramasSequential } from '../lib/panoramaCache'

const GALLERY_BOEING_COPY = [
  'Забудьте о роли пассажира — здесь вы становитесь главной силой, поднимающей в небо легенду мировой авиации. Пилотирование Boeing 737 — это сочетание железной выдержки и филигранной точности: от оглушительного рева двигателей на взлете до сложнейшего захода на посадку в условиях грозы. Попробуйте укротить строптивый характер многотонного лайнера при боковом ветре или доверьтесь совершенной авионике, прокладывая маршрут через океаны. Это не просто симулятор, это ваш пропуск в мир большой авиации, где каждое решение имеет значение, а драйв от касания полосы остается с вами навсегда.',
]

const GALLERY_MI2_COPY = [
  'Укротите легенду винтокрылой авиации. Забудьте о длинных взлетных полосах — здесь небо начинается прямо под вами. Пилотирование вертолета — это высший пилотаж координации, где задействованы и руки, и ноги, и интуиция. Попробуйте удержать многотонную машину в режиме «висения» или совершить ювелирную посадку на крошечную площадку. Ми-2 не просто тренажер, это характер, который проверит вас на прочность и подарит ни с чем не сравнимый драйв свободного полета в любом направлении.',
]

function GalleryPage() {
  const { images } = useSiteImages()

  const boeingSlides = useMemo(
    () =>
      images.gallery['boeing-737'].map((s) => ({
        ...s,
        src: resolveMediaUrl(s.src),
        panoramaSrc: s.panoramaSrc ? resolveMediaUrl(s.panoramaSrc) : undefined,
      })),
    [images.gallery],
  )
  const mi2Slides = useMemo(
    () =>
      images.gallery['mi-2'].map((s) => ({
        ...s,
        src: resolveMediaUrl(s.src),
        panoramaSrc: s.panoramaSrc ? resolveMediaUrl(s.panoramaSrc) : undefined,
      })),
    [images.gallery],
  )

  useEffect(() => {
    const panoramas = [...boeingSlides, ...mi2Slides]
      .map((s) => s.panoramaSrc)
      .filter((src): src is string => Boolean(src))
    if (panoramas.length) void preloadPanoramasSequential(panoramas)
  }, [boeingSlides, mi2Slides])

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <SiteHeader />
      <main className="flex min-h-0 flex-1 flex-col pb-12 pt-[96px] text-white min-[990px]:pb-16 min-[990px]:pt-[112px]">
        <div className="container-app pb-6 min-[990px]:pb-10">
          <h1 className="text-[26px] font-bold leading-tight tracking-tight min-[990px]:text-[36px] min-[990px]:leading-[1.15]">
            Как это выглядит изнутри
          </h1>
        </div>
        <ContentSplitSectionLight
          variant="text-left"
          title="Boeing 737: Возьмите под контроль 70 тонн чистой энергии"
          paragraphs={[...GALLERY_BOEING_COPY]}
          media={<GalleryMediaPanel slides={boeingSlides} />}
        />
        <GalleryGradientSplitSection
          title="Ми-2"
          paragraphs={[...GALLERY_MI2_COPY]}
          media={<GalleryMediaPanel theme="dark" slides={mi2Slides} />}
        />
      </main>
      <SiteCtaBanner />
      <SiteFooter />
    </div>
  )
}

export default GalleryPage
