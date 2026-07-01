import PageGradientTitle from '../components/PageGradientTitle'
import PricesPromoCard, { PromoClockIcon, PromoGiftIcon } from '../components/PricesPromoCard'
import SimulatorPricingSection from '../components/SimulatorPricingSection'
import SiteFooter from '../components/SiteFooter'
import SiteHeader from '../components/SiteHeader'
import { useGiftCertificateModal } from '../contexts/GiftCertificateModalContext'
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
  const { openGiftCertificate } = useGiftCertificateModal()
  const boeingSim = getSimulatorBySlug('boeing-737')
  const mi2Sim = getSimulatorBySlug('mi-2')
  if (!boeingSim || !mi2Sim) {
    throw new Error('[PricesPage] Не найдены данные тренажёров boeing-737 или mi-2.')
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <SiteHeader />
      <main className="flex min-h-0 flex-1 flex-col bg-[#e9e9e9] pb-12 pt-[72px] min-[990px]:pb-16 min-[990px]:pt-[84px]">
        <PageGradientTitle title="Цены" className="pb-6 min-[990px]:pb-10" />
        <div className="container-app flex flex-col gap-8 min-[990px]:gap-10">
          <div className="flex justify-center">
            <button
              type="button"
              onClick={openGiftCertificate}
              className="inline-flex w-full max-w-[520px] items-center justify-center rounded-full border-2 border-[#1D56BE] bg-white px-6 py-3.5 text-center text-[15px] font-bold uppercase tracking-wide text-[#1D56BE] shadow-[0_8px_28px_rgba(29,86,190,0.12)] transition-opacity hover:opacity-90 min-[990px]:py-4 min-[990px]:text-[16px]"
            >
              Покупка подарочного сертификата
            </button>
          </div>
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
        <section className="bg-[#e9e9e9] py-8 min-[990px]:py-12">
          <div className="container-app grid grid-cols-1 gap-6 min-[990px]:grid-cols-2 min-[990px]:gap-8">
            <PricesPromoCard
              headerBackground="radial-gradient(98.31% 98.31% at 50% 50%, #0075FF 0%, #322E67 100%)"
              headerIcon={<PromoGiftIcon className="h-11 w-11 min-[990px]:h-12 min-[990px]:w-12" />}
              title="День рождения"
              discount="-15%"
              lead="Подарите себе незабываемый полет в день рождения или в течении трех дней до или после праздника"
              terms={BIRTHDAY_TERMS}
              documentLine="Паспорт или водительское удостоверение"
            />
            <PricesPromoCard
              headerBackground="linear-gradient(90deg, #2dd4bf 0%, #0d9488 42%, #134e4a 100%)"
              headerIcon={<PromoClockIcon className="h-11 w-11 min-[990px]:h-12 min-[990px]:w-12" />}
              title="Счастливые часы"
              discount="-10%"
              lead="Летайте по специальной цене в будние дни с 12:00 до 15:00"
              terms={HAPPY_TERMS}
              documentLine="Паспорт или водительское удостоверение"
            />
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  )
}

export default PricesPage
