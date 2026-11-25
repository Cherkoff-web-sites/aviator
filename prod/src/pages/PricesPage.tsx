import { useMemo } from 'react'

import PricesPromoCard, { PromoClockIcon, PromoGiftIcon } from '../components/PricesPromoCard'
import SimulatorPricingSection from '../components/SimulatorPricingSection'
import SiteCtaBanner from '../components/SiteCtaBanner'
import SiteFooter from '../components/SiteFooter'
import SiteHeader from '../components/SiteHeader'
import { usePublicCertPrices } from '../hooks/usePublicCertPrices'
import { usePublicFlightPrices } from '../hooks/usePublicFlightPrices'
import { usePublicOptionLists } from '../hooks/usePublicOptionLists'
import { usePublicPromos } from '../hooks/usePublicPromos'
import { useSiteImages } from '../hooks/useSiteImages'
import { durationChoicesFromList } from '../lib/option-list-utils'
import { formatAdminDate } from '../lib/admin-date'
import {
  applyComboPricingBlock,
  applySiteImagesToSimulator,
  mergeComboPricesIntoBlock,
  mergeFlightPricesIntoBlock,
} from '../lib/applySiteImages'
import {
  formatPromoDiscountLabel,
  isPromoUsableToday,
  promoByType,
} from '../lib/promos'
import { useServerNow } from '../contexts/ServerClockContext'

const BIRTHDAY_TERMS = [
  'Пользуйтесь скидкой в сам день рождения, а также за 3 дня до или после него.',
  'Акция распространяется на все полетные программы любой продолжительности.',
]

const HAPPY_TERMS = [
  'Действует понедельник – пятница с 12:00 до 15:00',
  'При бронировании обязательно упомянуть промокод «Счастливые часы»',
]

function promoDisabledReason(
  promo: ReturnType<typeof promoByType>,
  now: Date,
): string | undefined {
  if (!promo) return 'Акция не настроена'
  if (!promo.active) return 'Акция временно отключена'
  const today = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
  ].join('-')
  const start = String(promo.startDate || '').slice(0, 10)
  if (start && today < start) {
    return `Акция начнётся ${formatAdminDate(start)}`
  }
  if (!promo.indefinite) {
    const end = String(promo.endDate || '').slice(0, 10)
    if (end && end !== '9999-12-31' && today > end) {
      return `Акция завершилась ${formatAdminDate(end)}`
    }
  }
  return 'Акция сейчас недоступна'
}

function PricesPage() {
  const { images } = useSiteImages()
  const flightPrices = usePublicFlightPrices()
  const certPrices = usePublicCertPrices()
  const optionLists = usePublicOptionLists()
  const promos = usePublicPromos()
  const serverNow = useServerNow()
  const allowedFlightDurations = useMemo(
    () => durationChoicesFromList(optionLists?.duration).map((d) => d.value),
    [optionLists?.duration],
  )
  /** Только календарный день — без тика каждую секунду (иначе тарифы пересобираются). */
  const todayKey = useMemo(() => {
    const y = serverNow.getFullYear()
    const m = String(serverNow.getMonth() + 1).padStart(2, '0')
    const d = String(serverNow.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  }, [serverNow.getFullYear(), serverNow.getMonth(), serverNow.getDate()])

  const boeingSim = applySiteImagesToSimulator('boeing-737', images)
  const mi2Sim = applySiteImagesToSimulator('mi-2', images)
  const boeingBlock = useMemo(
    () =>
      boeingSim
        ? mergeFlightPricesIntoBlock(
            boeingSim.pricingBlock,
            flightPrices,
            'boeing-737',
            allowedFlightDurations,
          )
        : null,
    [boeingSim, flightPrices, allowedFlightDurations],
  )
  const mi2Block = useMemo(
    () =>
      mi2Sim
        ? mergeFlightPricesIntoBlock(
            mi2Sim.pricingBlock,
            flightPrices,
            'mi-2',
            allowedFlightDurations,
          )
        : null,
    [mi2Sim, flightPrices, allowedFlightDurations],
  )
  const comboBlock = useMemo(
    () => mergeComboPricesIntoBlock(applyComboPricingBlock(images), certPrices),
    [images, certPrices],
  )

  const birthdayPromo = useMemo(() => promoByType(promos, 'BIRTHDAY'), [promos])
  const happyPromo = useMemo(() => promoByType(promos, 'HAPPY_HOURS'), [promos])
  const birthdayLive = useMemo(
    () => isPromoUsableToday(birthdayPromo, new Date(`${todayKey}T12:00:00`)),
    [birthdayPromo, todayKey],
  )
  const happyLive = useMemo(
    () => isPromoUsableToday(happyPromo, new Date(`${todayKey}T12:00:00`)),
    [happyPromo, todayKey],
  )

  if (!boeingSim || !mi2Sim || !boeingBlock || !mi2Block) {
    throw new Error('[PricesPage] Не найдены данные тренажёров boeing-737 или mi-2.')
  }

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
              title={birthdayPromo?.name?.trim() || 'День рождения'}
              discount={formatPromoDiscountLabel(birthdayPromo?.discountPercent ?? 15)}
              lead="Сделайте свой день рождения по-настоящему особенным, заняв кресло капитана Boeing 737NG или вертолета Ми-2"
              terms={BIRTHDAY_TERMS}
              footerTitle="Необходимые документы:"
              documentLine="Паспорт или водительское удостоверение"
              bookingPromo="birthday"
              disabled={!birthdayLive}
              disabledReason={
                birthdayLive ? undefined : promoDisabledReason(birthdayPromo, serverNow)
              }
              endsOn={
                birthdayPromo && !birthdayPromo.indefinite && birthdayPromo.endDate !== '9999-12-31'
                  ? birthdayPromo.endDate
                  : null
              }
              indefinite={Boolean(birthdayPromo?.indefinite)}
            />
            <PricesPromoCard
              headerBackground="linear-gradient(91.68deg, #35AEA2 -98.39%, #164843 196.25%)"
              headerIcon={<PromoClockIcon />}
              title={happyPromo?.name?.trim() || 'Счастливые часы'}
              discount={formatPromoDiscountLabel(happyPromo?.discountPercent ?? 10)}
              lead="Взлетайте выгоднее по будням. Идеальное время для вашего полета по специальному тарифу."
              terms={HAPPY_TERMS}
              footerTitle="Ограничения:"
              documentLine="Предложение не действует в праздничные дни."
              bookingPromo="happy-hours"
              disabled={!happyLive}
              disabledReason={happyLive ? undefined : promoDisabledReason(happyPromo, serverNow)}
              endsOn={
                happyPromo && !happyPromo.indefinite && happyPromo.endDate !== '9999-12-31'
                  ? happyPromo.endDate
                  : null
              }
              indefinite={Boolean(happyPromo?.indefinite)}
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
