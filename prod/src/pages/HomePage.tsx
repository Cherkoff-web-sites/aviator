import LandingHero from '../components/LandingHero'
import SiteFooter from '../components/SiteFooter'
import SiteHeader from '../components/SiteHeader'

function HomePage() {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <SiteHeader />
      <main className="flex min-h-0 flex-1 flex-col bg-[#151824]">
        <LandingHero />
      </main>
      <SiteFooter />
    </div>
  )
}

export default HomePage
