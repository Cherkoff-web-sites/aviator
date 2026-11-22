import PricesPromoCard, { PromoClockIcon, PromoGiftIcon } from '../components/PricesPromoCard'
import SimulatorPricingSection from '../components/SimulatorPricingSection'
import SiteCtaBanner from '../components/SiteCtaBanner'
import SiteFooter from '../components/SiteFooter'
import SiteHeader from '../components/SiteHeader'
import { usePublicCertPrices } from '../hooks/usePublicCertPrices'
import { usePublicFlightPrices } from '../hooks/usePublicFlightPrices'
import { useSiteImages } from '../hooks/useSiteImages'
import {
  applyComboPricingBlock,
  applySiteImagesToSimulator,
  mergeComboPricesIntoBlock,
  mergeFlightPricesIntoBlock,
} from '../lib/applySiteImages'

const BIRTHDAY_TERMS = [
  'Пользуйтесь скидкой в сам день рождения, а также за 3 дня до или после него.',
  'Акция распространяется на все полетные программы любой продолжительности.',
]

const HAPPY_TERMS = [
  'Действует понедельник – пятница с 12:00 до 15:00',
  'При бронировании обязательно упомянуть промокод «Счастливые часы»',
]

function PricesPage() {
  const { images } = useSiteImages()
  const flightPrices = usePublicFlightPrices()
  const certPrices = usePublicCertPrices()
  const boeingSim = applySiteImagesToSimulator('boeing-737', images)
  const mi2Sim = applySiteImagesToSimulator('mi-2', images)
  // Блок «2в1» на /prices — сертификат combo из «Цены на сертификаты»
  const comboBlock = mergeComboPricesIntoBlock(applyComboPricingBlock(images), certPrices)
  if (!boeingSim || !mi2Sim) {
    throw new Error('[PricesPage] Не найдены данные тренажёров boeing-737 или mi-2.')
  }
  const boeingBlock = mergeFlightPricesIntoBlock(
    boeingSim.pricingBlock,
    flightPrices,
    'boeing-737',
  )
  const mi2Block = mergeFlightPricesIntoBlock(mi2Sim.pricingBlock, flightPrices, 'mi-2')

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <SiteHeader />
      <main className="flex min-h-0 flex-1 flex-col pb-12 pt-[96px] text-white min-[990px]:pb-16 min-[990px]:pt-[112px]">
        <div className="container-app pb-6 min-[990px]:pb-10">
          <h1 className="text-[26px] font-bold leading-tight tracking-tight min-[990px]:text-[36px] min-[990px]:leading-[1.15]">
            А сколько это стоит?
          </h1>
        </div>
        <div className="flex flex-col gap-8 overflow-x-clip min-[990px]:container-app min-[990px]:gap-10">
          <SimulatorPricingSection
            layout="contained"
            block={boeingBlock}
            bookingSimulatorSlug="boeing-737"
          />
          <SimulatorPricingSection
            layout="contained"
            block={mi2Block}
            bookingSimulatorSlug="mi-2"
          />
        </div>
        <div className="mt-8 min-[990px]:mt-10">
          <SimulatorPricingSection
            layout="fullBleed"
            block={comboBlock}
            giftProduct="both"
            primaryAction="combo"
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
