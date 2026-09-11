import { useRef } from 'react'
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
import { getSimulatorBySlug } from '../data/simulators'
import { useSimulatorScrollMotion } from '../hooks/useSimulatorScrollMotion'

function SimulatorPage() {
  const { slug } = useParams()
  const simulator = getSimulatorBySlug(slug)
  const motionRootRef = useRef<HTMLDivElement>(null)

  useSimulatorScrollMotion(motionRootRef, [simulator?.slug])

  if (!simulator) {
    return <Navigate to="/" replace />
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <SiteHeader />
      <div ref={motionRootRef} className="flex min-h-0 flex-1 flex-col">
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
        <SimulatorPhotoSlider
          title={simulator.photoSlider.title}
          description={simulator.photoSlider.description}
          images={simulator.photoSlider.images}
          galleryTo={simulator.photoSlider.galleryTo}
        />
        <SimulatorHighlightsThree />
        <SimulatorCtaBooking />
        {simulator.slug !== 'avia-school' ? (
          <SimulatorPricingSection block={simulator.pricingBlock} />
        ) : null}
        <SimulatorReviewsIntro />
        <SiteCtaBanner />
      </div>
      <SiteFooter />
    </div>
  )
}

export default SimulatorPage
