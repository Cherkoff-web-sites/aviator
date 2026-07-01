import { useParams } from 'react-router-dom'

import type { BookingSimulatorSlug } from '../contexts/BookingModalContext'
import { useBookingModal } from '../contexts/BookingModalContext'
import type { SimulatorPricingBlock, SimulatorPricingPlan } from '../data/simulators'

const ARROW_RIGHT_SRC = '/assets/icons/arrow_right.svg'

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="18"
      height="18"
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        d="M5.27299 11.8182L7.62433 13.5817C7.93611 13.8155 8.37679 13.762 8.62357 13.4604L14.7275 6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  )
}

function PricingPlanCard({
  plan,
  features,
  onBook,
}: {
  plan: SimulatorPricingPlan
  features: string[]
  onBook: () => void
}) {
  const hi = Boolean(plan.highlighted)

  return (
    <article
      className={
        hi
          ? 'relative flex min-h-0 flex-col rounded-2xl bg-[#0075FF] px-5 pb-6 pt-6 text-white shadow-[0_12px_40px_rgba(0,117,255,0.35)] min-[990px]:z-10 min-[990px]:scale-[1.03] min-[990px]:px-6 min-[990px]:pb-8 min-[990px]:pt-8'
          : 'flex min-h-0 flex-col rounded-2xl border border-white/30 bg-[rgba(15,35,70,0.45)] px-5 pb-6 pt-6 text-white backdrop-blur-md min-[990px]:px-5 min-[990px]:pb-7 min-[990px]:pt-7'
      }
    >
      <h3 className="text-[22px] font-bold leading-tight tracking-tight min-[990px]:text-[24px]">
        {plan.durationLabel}
      </h3>
      <p className="mt-2 text-[17px] font-semibold leading-tight min-[990px]:text-[18px]">{plan.priceDisplay}</p>

      {plan.ribbon ? (
        <>
          <div className={`my-4 h-px w-full ${hi ? 'bg-white/35' : 'bg-white/25'}`} />
          <p className="text-center text-[14px] font-semibold leading-snug text-white/95 min-[990px]:text-[15px]">
            {plan.ribbon}
          </p>
          <div className={`my-4 h-px w-full ${hi ? 'bg-white/35' : 'bg-white/25'}`} />
        </>
      ) : (
        <div className={`my-4 h-px w-full ${hi ? 'bg-white/35' : 'bg-white/25'}`} />
      )}

      <ul className="flex flex-1 flex-col gap-2.5 text-[14px] font-medium leading-snug min-[990px]:gap-3 min-[990px]:text-[15px]">
        {features.map((line) => (
          <li key={line} className="flex gap-2.5">
            <CheckIcon className="mt-0.5 shrink-0 text-white opacity-95" />
            <span>{line}</span>
          </li>
        ))}
      </ul>

      <button
        type="button"
        onClick={onBook}
        className={
          hi
            ? 'mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-white px-4 py-2.5 text-[14px] font-semibold text-[#0075FF] min-[990px]:mt-8 min-[990px]:py-3 min-[990px]:text-[15px]'
            : 'mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-[radial-gradient(98.31%_98.31%_at_50%_50%,#0075FF_0%,#322E67_100%)] px-4 py-2.5 text-[14px] font-semibold text-white shadow-[0_0_20px_rgba(0,117,255,0.35)] min-[990px]:mt-8 min-[990px]:py-3 min-[990px]:text-[15px]'
        }
      >
        Летим
        <img
          src={ARROW_RIGHT_SRC}
          alt=""
          width={20}
          height={15}
          aria-hidden
          className={
            hi
              ? 'h-[12px] w-auto shrink-0 object-contain [filter:brightness(0)_saturate(100%)_invert(40%)_sepia(98%)_saturate(4000%)_hue-rotate(200deg)_brightness(0.98)_contrast(101%)] min-[990px]:h-[13px]'
              : 'h-[12px] w-auto shrink-0 object-contain brightness-0 invert min-[990px]:h-[13px]'
          }
        />
      </button>
    </article>
  )
}

export type SimulatorPricingSectionLayout = /** фон и контент на всю ширину вьюпорта, контент в `container-app` */ 'fullBleed' | /** один визуальный блок по ширине родителя (обычно уже в `container-app`) */ 'contained'

type Props = {
  block: SimulatorPricingBlock
  layout?: SimulatorPricingSectionLayout
  /** На странице без `:slug` в URL — явно указывает тренажёр для модалки брони. */
  bookingSimulatorSlug?: BookingSimulatorSlug
}

function SimulatorPricingSection({ block, layout = 'fullBleed', bookingSimulatorSlug }: Props) {
  const isContained = layout === 'contained'
  const { openBooking } = useBookingModal()
  const { slug } = useParams()

  const simulatorSlug: BookingSimulatorSlug | null =
    bookingSimulatorSlug ??
    (slug === 'mi-2' || slug === 'boeing-737' || slug === 'avia-school' ? slug : null)

  const handleBookPlan = (plan: SimulatorPricingPlan) => {
    const m = plan.durationLabel.match(/(\d+)\s*минут/)
    if (!m) {
      openBooking(simulatorSlug ? { simulatorSlug } : {})
      return
    }
    const n = Number(m[1])
    const durationMin =
      n === 30 || n === 60 || n === 90 || n === 120 ? (n as 30 | 60 | 90 | 120) : null
    openBooking({
      simulatorSlug,
      durationMin: durationMin ?? undefined,
    })
  }

  const inner = (
    <>
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${block.backgroundImage})` }}
        aria-hidden
      />

      <div className={`relative z-[1] ${isContained ? 'px-4 min-[990px]:px-8' : 'container-app'}`}>
        <header className="mb-8 flex max-w-[640px] gap-4 min-[990px]:mb-12 min-[990px]:gap-5">
          <img
            src={block.headingIcon}
            alt=""
            className="h-[52px] w-[52px] shrink-0 object-contain min-[990px]:h-14 min-[990px]:w-14"
            width={56}
            height={56}
          />
          <div className="min-w-0 pt-0.5">
            <h2 className="text-[22px] font-bold leading-tight tracking-tight text-white drop-shadow-[0_2px_12px_rgba(0,0,0,0.55)] min-[990px]:text-[32px]">
              {block.headingTitle}
            </h2>
            <p className="mt-1.5 text-[14px] font-medium leading-relaxed text-white/95 drop-shadow-[0_1px_8px_rgba(0,0,0,0.5)] min-[990px]:mt-2 min-[990px]:text-[17px]">
              {block.headingSubtitle}
            </p>
          </div>
        </header>

        <div className="flex flex-col gap-4 min-[990px]:grid min-[990px]:grid-cols-4 min-[990px]:items-stretch min-[990px]:gap-5">
          {block.plans.map((plan) => (
            <PricingPlanCard
              key={plan.durationLabel}
              plan={plan}
              features={block.features}
              onBook={() => handleBookPlan(plan)}
            />
          ))}
        </div>
      </div>
    </>
  )

  if (isContained) {
    return (
      <section className="relative isolate w-full overflow-hidden rounded-[24px] py-10 min-[990px]:rounded-[32px] min-[990px]:py-12">
        {inner}
      </section>
    )
  }

  return (
    <section className="relative isolate overflow-hidden py-12 min-[990px]:py-[4.5rem]">
      {inner}
    </section>
  )
}

export default SimulatorPricingSection
