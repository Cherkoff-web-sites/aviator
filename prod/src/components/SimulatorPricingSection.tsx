import { useEffect, useRef } from 'react'
import { useParams } from 'react-router-dom'

import type { BookingSimulatorSlug } from '../contexts/BookingModalContext'
import { useBookingModal } from '../contexts/BookingModalContext'
import { useGiftCertificateModal } from '../contexts/GiftCertificateModalContext'
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

function useFinePointer() {
  const fineRef = useRef(false)

  useEffect(() => {
    const mq = window.matchMedia('(hover: hover) and (pointer: fine)')
    fineRef.current = mq.matches
    const onChange = () => {
      fineRef.current = mq.matches
    }
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  return fineRef
}

function PricingPlanCard({
  plan,
  features,
  onBook,
  isFirst,
}: {
  plan: SimulatorPricingPlan
  features: string[]
  onBook: () => void
  isFirst: boolean
}) {
  const hi = Boolean(plan.highlighted)
  const cardRef = useRef<HTMLElement>(null)
  const finePointer = useFinePointer()

  useEffect(() => {
    if (!hi) return

    const onMove = (e: MouseEvent) => {
      if (!finePointer.current) return
      const el = cardRef.current
      if (!el) return

      const nx = Math.min(1, Math.max(0, e.clientX / window.innerWidth))
      const ny = Math.min(1, Math.max(0, e.clientY / window.innerHeight))

      // Как раньше — мягкий 2-стопный градиент; диапазон чуть шире исходного
      el.style.setProperty('--pricing-ga', `${155 + nx * 58}deg`)
      el.style.setProperty('--pricing-gs1', `${14 + ny * 34}%`)
      el.style.setProperty('--pricing-gs2', `${108 + nx * 62}%`)
    }

    window.addEventListener('mousemove', onMove, { passive: true })
    return () => window.removeEventListener('mousemove', onMove)
  }, [finePointer, hi])

  return (
    <article
      ref={cardRef}
      data-sim-reveal-item
      className={
        hi
          ? [
              'pricing-plan-featured relative z-10 flex min-h-0 flex-col px-5 py-7 text-white',
              'my-0 min-[990px]:h-[calc(100%+2.5rem)] min-[990px]:self-center min-[990px]:px-6 min-[990px]:py-9',
            ].join(' ')
          : [
              'relative flex h-full min-h-0 flex-col px-5 py-6 text-white min-[990px]:px-5 min-[990px]:py-7',
              !isFirst ? 'border-t border-white/25 min-[990px]:border-t-0 min-[990px]:border-l' : '',
            ].join(' ')
      }
    >
      <h3 className="text-[22px] font-bold leading-tight tracking-tight min-[990px]:text-[24px]">
        {plan.durationLabel}
      </h3>
      <p className="mt-2 text-[17px] font-semibold leading-tight min-[990px]:text-[18px]">{plan.priceDisplay}</p>

      {plan.ribbon ? (
        <p className="mt-3 text-[14px] font-semibold leading-snug text-white/95 min-[990px]:text-[15px]">
          {plan.ribbon}
        </p>
      ) : null}

      <div className={`my-4 h-px w-full ${hi ? 'bg-white/40' : 'bg-white/25'}`} />

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
            ? 'btn-solid-light mt-6 w-full px-4 py-2.5 text-[14px] font-semibold text-[#085DC1] min-[990px]:mt-8 min-[990px]:py-3 min-[990px]:text-[15px]'
            : 'btn-book-flight mt-6 w-full px-4 py-2.5 text-[14px] font-semibold min-[990px]:mt-8 min-[990px]:py-3 min-[990px]:text-[15px]'
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

export type SimulatorPricingSectionLayout =
  /** фон и контент на всю ширину вьюпорта, контент в `container-app` */
  | 'fullBleed'
  /** один визуальный блок по ширине родителя (обычно уже в `container-app`) */
  | 'contained'

type Props = {
  block: SimulatorPricingBlock
  layout?: SimulatorPricingSectionLayout
  /** На странице без `:slug` в URL — явно указывает тренажёр для модалки брони. */
  bookingSimulatorSlug?: BookingSimulatorSlug
}

function SimulatorPricingSection({ block, layout = 'fullBleed', bookingSimulatorSlug }: Props) {
  const isContained = layout === 'contained'
  const { openBooking } = useBookingModal()
  const { openGiftCertificate } = useGiftCertificateModal()
  const { slug } = useParams()

  const simulatorSlug: BookingSimulatorSlug | null =
    bookingSimulatorSlug ??
    (slug === 'mi-2' || slug === 'boeing-737' || slug === 'avia-school' ? slug : null)

  const giftProduct =
    simulatorSlug === 'boeing-737' || simulatorSlug === 'mi-2' ? simulatorSlug : null

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
        className={`pointer-events-none absolute inset-0 overflow-hidden ${isContained ? 'rounded-[40px]' : ''}`}
        aria-hidden
      >
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${block.backgroundImage})` }}
        />
      </div>

      <div className={`relative z-[1] ${isContained ? 'px-4 min-[990px]:px-8' : 'container-app'}`}>
        <header className="mb-8 flex flex-col gap-4 min-[640px]:mb-12 min-[640px]:flex-row min-[640px]:items-start min-[640px]:justify-between min-[640px]:gap-6">
          <div data-sim-reveal-head className="flex min-w-0 max-w-[640px] gap-4 min-[990px]:gap-5">
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
          </div>

          {giftProduct ? (
            <button
              data-sim-reveal-head
              type="button"
              onClick={() => openGiftCertificate({ product: giftProduct })}
              className="btn-solid-light shrink-0 self-start px-5 py-2.5 text-[14px] font-semibold min-[990px]:px-6 min-[990px]:py-3 min-[990px]:text-[15px]"
            >
              Подарить полет
            </button>
          ) : null}
        </header>

        <div className="relative flex min-[990px]:my-5 min-[990px]:justify-center">
          <div
            className="pricing-plans-shell relative"
            style={{
              ['--plan-count' as string]: String(
                Math.min(4, Math.max(1, block.plans.length)),
              ),
            }}
          >
            <div className="pricing-plans-shell__grid">
              {block.plans.map((plan, index) => (
                <PricingPlanCard
                  key={plan.durationLabel}
                  plan={plan}
                  features={block.features}
                  isFirst={index === 0}
                  onBook={() => handleBookPlan(plan)}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  )

  if (isContained) {
    return (
      <section
        data-sim-reveal="pricing"
        className="relative isolate w-full overflow-visible rounded-[40px] py-10 min-[990px]:py-12"
      >
        {inner}
      </section>
    )
  }

  return (
    <section
      data-sim-reveal="pricing"
      className="relative isolate overflow-visible py-12 min-[990px]:py-[4.5rem]"
    >
      {inner}
    </section>
  )
}

export default SimulatorPricingSection
