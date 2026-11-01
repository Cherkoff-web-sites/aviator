import PricesPromoCard, { PromoClockIcon, PromoGiftIcon } from '../components/PricesPromoCard'
import SimulatorPricingSection from '../components/SimulatorPricingSection'
import SiteCtaBanner from '../components/SiteCtaBanner'
import SiteFooter from '../components/SiteFooter'
import SiteHeader from '../components/SiteHeader'
import { COMBO_PRICING_BLOCK, getSimulatorBySlug } from '../data/simulators'

const BIRTHDAY_TERMS = [
  'Пользуйтесь скидкой в сам день рождения, а также за 3 дня до или после него.',
  'Акция распространяется на все полетные программы любой продолжительности.',
]

const HAPPY_TERMS = [
  'Действует понедельник – пятница с 12:00 до 15:00',
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
      <main className="flex min-h-0 flex-1 flex-col pb-12 pt-[96px] text-white min-[990px]:pb-16 min-[990px]:pt-[112px]">
        <div className="container-app pb-6 min-[990px]:pb-10">
          <h1 className="text-[26px] font-bold leading-tight tracking-tight min-[990px]:text-[36px] min-[990px]:leading-[1.15]">
            Цены
          </h1>
        </div>
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
        <div className="mt-8 min-[990px]:mt-10">
          <SimulatorPricingSection
            layout="fullBleed"
            block={COMBO_PRICING_BLOCK}
            giftProduct="both"
            primaryAction="gift"
          />
        </div>
        <section className="pt-16 pb-8 min-[990px]:pt-24 min-[990px]:pb-12">
          <div className="container-app grid grid-cols-1 gap-6 min-[990px]:grid-cols-2 min-[990px]:gap-8">
            <PricesPromoCard
              headerBackground="linear-gradient(93.39deg, #0075FF -38.83%, #004699 123.25%)"
              headerIcon={<PromoGiftIcon />}
              title="День рождения"
              discount="-15%"
              lead="Сделайте свой день рождения по-настоящему особенным, заняв кресло капитана Boeing 737NG или вертолета Ми-2"
              terms={BIRTHDAY_TERMS}
              footerTitle="Необходимые документы:"
              documentLine="Паспорт или водительское удостоверение"
              bookingPromo="birthday"
            />
            <PricesPromoCard
              headerBackground="linear-gradient(91.68deg, #35AEA2 -98.39%, #164843 196.25%)"
              headerIcon={<PromoClockIcon />}
              title="Счастливые часы"
              discount="-10%"
              lead="Взлетайте выгоднее по будням. Идеальное время для вашего полета по специальному тарифу."
              terms={HAPPY_TERMS}
              footerTitle="Ограничения:"
              documentLine="Предложение не действует в праздничные дни."
              bookingPromo="happy-hours"
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
