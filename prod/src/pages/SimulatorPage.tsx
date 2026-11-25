import { useMemo, useRef } from 'react'
import { Navigate, useParams } from 'react-router-dom'
import SiteCtaBanner from '../components/SiteCtaBanner'
import SiteFooter from '../components/SiteFooter'
import SiteHeader from '../components/SiteHeader'
import SimulatorCtaBooking from '../components/SimulatorCtaBooking'
import SimulatorPricingSection from '../components/SimulatorPricingSection'
import SimulatorHighlightsThree from '../components/SimulatorHighlightsThree'
import SimulatorPhotoSlider from '../components/SimulatorPhotoSlider'
import SimulatorPageView from '../components/SimulatorPageView'
import SimulatorReviewsIntro from '../components/SimulatorReviewsIntro'
import SimulatorSplitSection from '../components/SimulatorSplitSection'
import { usePublicFlightPrices } from '../hooks/usePublicFlightPrices'
import { usePublicOptionLists } from '../hooks/usePublicOptionLists'
import { useSiteImages } from '../hooks/useSiteImages'
import { useSimulatorScrollMotion } from '../hooks/useSimulatorScrollMotion'
import { applySiteImagesToSimulator, mergeFlightPricesIntoBlock } from '../lib/applySiteImages'
import { durationChoicesFromList } from '../lib/option-list-utils'

function SimulatorPage() {
  const { slug } = useParams()
  const { images } = useSiteImages()
  const flightPrices = usePublicFlightPrices()
  const optionLists = usePublicOptionLists()
  const allowedFlightDurations = useMemo(
    () => durationChoicesFromList(optionLists?.duration).map((d) => d.value),
    [optionLists?.duration],
  )
  const simulator = applySiteImagesToSimulator(slug, images)
  const pricingBlock = useMemo(() => {
    if (!simulator) return undefined
    if (simulator.slug === 'boeing-737' || simulator.slug === 'mi-2') {
      return mergeFlightPricesIntoBlock(
        simulator.pricingBlock,
        flightPrices,
        simulator.slug,
        allowedFlightDurations,
      )
    }
    return simulator.pricingBlock
  }, [simulator, flightPrices, allowedFlightDurations])
  const motionRootRef = useRef<HTMLDivElement>(null)

  useSimulatorScrollMotion(motionRootRef, [simulator?.slug])

  if (!simulator) {
    return <Navigate to="/" replace />
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <SiteHeader />
      {/*
        Без overflow-x на этом дереве — иначе ломается GSAP pin слайдера.
        Горизонтальный клип — внутри секций (слайдер / тарифы / split).
      */}
      <div
        ref={motionRootRef}
        data-sim-motion
        className="flex min-h-0 flex-1 flex-col"
      >
        <SimulatorPageView
          heroImage={simulator.image}
          heading={simulator.pageHeading}
          description={simulator.pageDescription}
        />
        {simulator.sections.map((section, i) => (
          <SimulatorSplitSection
            key={`${simulator.slug}-${i}`}
            variant={section.variant}
            iconSrc={section.iconSrc}
            title={section.title}
            paragraphs={section.paragraphs}
            bulletPoints={section.bulletPoints}
            imageSrc={section.image}
          />
        ))}
        {/*
          Синяя обёртка: pin-spacer GSAP прозрачный — иначе в зазоре виден чёрный фон страницы.
          Все соседние синие блоки держим в одном фоне #002D62.
        */}
        <div className="bg-[#002D62]">
          <SimulatorPhotoSlider
            title={simulator.photoSlider.title}
            description={simulator.photoSlider.description}
            images={simulator.photoSlider.images}
            galleryTo={simulator.photoSlider.galleryTo}
          />
          <SimulatorHighlightsThree items={simulator.highlights} />
          <SimulatorCtaBooking title={simulator.ctaTitle} />
        </div>
        {simulator.slug !== 'avia-school' && pricingBlock ? (
          <SimulatorPricingSection block={pricingBlock} />
        ) : null}
        <SimulatorReviewsIntro />
        <SiteCtaBanner />
      </div>
      <SiteFooter />
    </div>
  )
}

export default SimulatorPage
