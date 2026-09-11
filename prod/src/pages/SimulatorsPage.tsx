import HomeHero from '../components/HomeHero'
import SiteCtaBanner from '../components/SiteCtaBanner'
import SiteFooter from '../components/SiteFooter'
import SiteHeader from '../components/SiteHeader'

/** Страница выбора авиатренажёров (бывшая главная) */
function SimulatorsPage() {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <SiteHeader />
      <main className="flex min-h-0 flex-1 flex-col">
        <HomeHero />
      </main>
      <SiteCtaBanner />
      <SiteFooter />
    </div>
  )
}

export default SimulatorsPage
