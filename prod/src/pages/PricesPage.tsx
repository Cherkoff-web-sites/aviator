import PageGradientTitle from '../components/PageGradientTitle'
import PricesPromoCard, { PromoClockIcon, PromoGiftIcon } from '../components/PricesPromoCard'
import SimulatorPricingSection from '../components/SimulatorPricingSection'
import SiteCtaBanner from '../components/SiteCtaBanner'
import SiteFooter from '../components/SiteFooter'
import SiteHeader from '../components/SiteHeader'
import { getSimulatorBySlug } from '../data/simulators'

const BIRTHDAY_TERMS = [
  'Действует при посещении авиатренажера ±3 дня до и после дня рождения',
  'Скидка применяется на любую продолжительность полета',
]

const HAPPY_TERMS = [
  'Действует понедельник–пятница с 12:00 до 15:00',
  'При бронировании обязательно упомянуть промокод «Счастливые часы»',
]

function PricesPage() {
  const boeingSim = getSimulatorBySlug('boeing-737')
  const mi2Sim = getSimulatorBySlug('mi-2')
  if (!boeingSim || !mi2Sim) {
    throw new Error('[PricesPage] Не найдены данные тренажёров boeing-737 или mi-2.')
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <SiteHeader />
      <main className="flex min-h-0 flex-1 flex-col pb-12 pt-[72px] min-[990px]:pb-16 min-[990px]:pt-[84px]">
        <PageGradientTitle title="Цены" className="pb-6 min-[990px]:pb-10" />
        <div className="container-app flex flex-col gap-8 min-[990px]:gap-10">
          <SimulatorPricingSection
            layout="contained"
            block={boeingSim.pricingBlock}
            bookingSimulatorSlug="boeing-737"
          />
          <SimulatorPricingSection
            layout="contained"
            block={mi2Sim.pricingBlock}
            bookingSimulatorSlug="mi-2"
          />
        </div>
        <section className="pt-16 pb-8 min-[990px]:pt-24 min-[990px]:pb-12">
          <div className="container-app grid grid-cols-1 gap-6 min-[990px]:grid-cols-2 min-[990px]:gap-8">
            <PricesPromoCard
              headerBackground="linear-gradient(93.39deg, #0075FF -38.83%, #004699 123.25%)"
              headerIcon={<PromoGiftIcon />}
              title="День рождения"
              discount="-15%"
              lead="Подарите себе незабываемый полет в день рождения или в течении трех дней до или после праздника"
              terms={BIRTHDAY_TERMS}
              documentLine="Паспорт или водительское удостоверение"
            />
            <PricesPromoCard
              headerBackground="linear-gradient(91.68deg, #35AEA2 -98.39%, #164843 196.25%)"
              headerIcon={<PromoClockIcon />}
              title="Счастливые часы"
              discount="-10%"
              lead="Летайте по специальной цене в будние дни с 12:00 до 15:00"
              terms={HAPPY_TERMS}
              documentLine="Паспорт или водительское удостоверение"
            />
          </div>
        </section>
      </main>
      <SiteCtaBanner />
      <SiteFooter />
    </div>
  )
}

export default PricesPage
