import { useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'

import type { BookingSimulatorSlug } from '../contexts/BookingModalContext'
import { useBookingModal } from '../contexts/BookingModalContext'
import { useGiftCertificateModal } from '../contexts/GiftCertificateModalContext'
import type { GiftCertProductChoice } from './booking/bookingPricing'
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
  selected,
  onSelect,
  /** Несколько тарифов: absolute-рост. Одна карточка (2в1) — в потоке, без выступа из shell. */
  expand,
}: {
  plan: SimulatorPricingPlan
  features: string[]
  onBook: () => void
  isFirst: boolean
  selected: boolean
  onSelect: () => void
  expand: boolean
}) {
  const hi = selected
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

      el.style.setProperty('--pricing-ga', `${155 + nx * 58}deg`)
      el.style.setProperty('--pricing-gs1', `${14 + ny * 34}%`)
      el.style.setProperty('--pricing-gs2', `${108 + nx * 62}%`)
    }

    window.addEventListener('mousemove', onMove, { passive: true })
    return () => window.removeEventListener('mousemove', onMove)
  }, [finePointer, hi])

  /*
    Ширина под текст в обоих состояниях одинакова: рамка 1px со всех сторон у обоих
    (у idle — прозрачная). Featured шире на 0.75rem с каждой стороны (-inset-x-3) и ровно
    на столько же больше боковой padding (px-5 + 0.75rem = px-8) — текст не переносится иначе.
  */
  const featuredClass = expand
    ? [
        'pricing-plan-featured z-10 flex min-h-0 flex-col px-5 py-7 text-white outline-none',
        'relative transition-[top,bottom,left,right,padding,box-shadow] duration-300 ease-out',
        'min-[990px]:absolute min-[990px]:-inset-x-3 min-[990px]:-top-5 min-[990px]:-bottom-5 min-[990px]:px-8 min-[990px]:py-9',
      ].join(' ')
    : [
        'pricing-plan-featured relative z-10 flex h-full min-h-0 flex-col px-5 py-7 text-white outline-none',
        'min-[990px]:py-9',
      ].join(' ')

  const idleDivider = !isFirst
    ? 'border-t-white/25 min-[990px]:border-t-transparent min-[990px]:border-l-white/25'
    : ''

  const idleClass = expand
    ? [
        'relative z-0 flex h-full min-h-0 cursor-pointer flex-col border border-transparent px-5 py-6 text-white outline-none',
        'transition-[top,bottom,left,right,padding,background-color] duration-300 ease-out hover:bg-white/[0.06]',
        'min-[990px]:absolute min-[990px]:inset-x-0 min-[990px]:top-0 min-[990px]:bottom-0 min-[990px]:h-auto min-[990px]:py-7',
        idleDivider,
      ].join(' ')
    : [
        'relative z-0 flex h-full min-h-0 cursor-pointer flex-col border border-transparent px-5 py-6 text-white outline-none',
        'hover:bg-white/[0.06] min-[990px]:py-7',
        idleDivider,
      ].join(' ')

  return (
    /*
      Десктоп (несколько тарифов): невидимый якорь задаёт высоту ряда, карточка absolute —
      рост top/bottom не меняет shell. Одна карточка — обычный поток внутри shell.
    */
    <div className="relative h-full min-h-0">
      {expand ? (
        <div
          className="pointer-events-none invisible hidden select-none flex-col border border-transparent px-5 py-7 min-[990px]:flex"
          aria-hidden
        >
          <h3 className="text-[24px] font-bold leading-tight tracking-tight">{plan.durationLabel}</h3>
          <p className="mt-2 text-[18px] font-semibold leading-tight">{plan.priceDisplay}</p>
          {plan.ribbon ? (
            <p className="mt-3 text-[15px] font-semibold leading-snug">{plan.ribbon}</p>
          ) : null}
          <div className="my-4 h-px w-full" />
          <ul className="flex flex-col gap-3 text-[15px] font-medium leading-snug">
            {features.map((line) => (
              <li key={line} className="flex gap-2.5">
                <span className="mt-0.5 size-[18px] shrink-0" />
                <span>{line}</span>
              </li>
            ))}
          </ul>
          <div className="mt-8 h-[48px] w-full shrink-0" />
        </div>
      ) : null}

      <article
        ref={cardRef}
        data-sim-reveal-item
        onMouseEnter={onSelect}
        onFocus={onSelect}
        tabIndex={0}
        className={hi ? featuredClass : idleClass}
      >
        <h3 className="text-[22px] font-bold leading-tight tracking-tight min-[990px]:text-[24px]">
          {plan.durationLabel}
        </h3>
        <p className="mt-2 text-[17px] font-semibold leading-tight min-[990px]:text-[18px]">
          {plan.priceDisplay}
        </p>

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
          onClick={(e) => {
            e.stopPropagation()
            onBook()
          }}
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
    </div>
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
  /** Кнопка «Подарить» / действие «Летим» как сертификат (для 2в1 — `both`). */
  giftProduct?: GiftCertProductChoice | null
  /** «Летим» открывает сертификат вместо бронирования полёта. */
  primaryAction?: 'booking' | 'gift'
}

function defaultPlanIndex(block: SimulatorPricingBlock) {
  // Одна карточка (2в1): по умолчанию idle, CTA только по hover
  if (block.plans.length <= 1) return -1
  const idx = block.plans.findIndex((p) => p.highlighted)
  return idx >= 0 ? idx : 0
}

function SimulatorPricingSection({
  block,
  layout = 'fullBleed',
  bookingSimulatorSlug,
  giftProduct: giftProductProp,
  primaryAction = 'booking',
}: Props) {
  const isContained = layout === 'contained'
  const { openBooking } = useBookingModal()
  const { openGiftCertificate } = useGiftCertificateModal()
  const { slug } = useParams()
  const defaultIdxRef = useRef(defaultPlanIndex(block))
  const [selectedIdx, setSelectedIdx] = useState(() => defaultPlanIndex(block))
  const leaveTimerRef = useRef<number | null>(null)

  useEffect(() => {
    const idx = defaultPlanIndex(block)
    defaultIdxRef.current = idx
    setSelectedIdx(idx)
  }, [block])

  useEffect(
    () => () => {
      if (leaveTimerRef.current != null) window.clearTimeout(leaveTimerRef.current)
    },
    [],
  )

  const selectPlan = (index: number) => {
    if (leaveTimerRef.current != null) {
      window.clearTimeout(leaveTimerRef.current)
      leaveTimerRef.current = null
    }
    setSelectedIdx(index)
  }

  /** Сброс на CTA с небольшой задержкой — иначе при увеличении карточки срабатывает leave и мерцает */
  const resetToDefaultSoon = () => {
    if (leaveTimerRef.current != null) window.clearTimeout(leaveTimerRef.current)
    leaveTimerRef.current = window.setTimeout(() => {
      setSelectedIdx(defaultIdxRef.current)
      leaveTimerRef.current = null
    }, 80)
  }

  const simulatorSlug: BookingSimulatorSlug | null =
    bookingSimulatorSlug ??
    (slug === 'mi-2' || slug === 'boeing-737' || slug === 'avia-school' ? slug : null)

  const giftProduct: GiftCertProductChoice | null =
    giftProductProp !== undefined
      ? giftProductProp
      : simulatorSlug === 'boeing-737' || simulatorSlug === 'mi-2'
        ? simulatorSlug
        : null

  const handleBookPlan = (plan: SimulatorPricingPlan) => {
    if (primaryAction === 'gift' && giftProduct) {
      openGiftCertificate({ product: giftProduct })
      return
    }

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

  const planCount = Math.min(4, Math.max(1, block.plans.length))

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
        <div className="absolute inset-0 bg-[#002D62]/35" />
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
              className="btn-solid-light shrink-0 self-start px-6 py-3 text-[15px] font-bold shadow-[0_8px_28px_rgba(255,255,255,0.22)] min-[990px]:px-8 min-[990px]:py-3.5 min-[990px]:text-[16px]"
            >
              Подарить полёт
            </button>
          ) : null}
        </header>

        {/* Запас my-5 — место под absolute-выступ featured (только если тарифов > 1) */}
        <div
          className={`relative flex min-[990px]:justify-center ${planCount > 1 ? 'min-[990px]:my-5' : ''}`}
          onMouseLeave={resetToDefaultSoon}
        >
          <div
            className="pricing-plans-shell relative overflow-visible"
            style={{ ['--plan-count' as string]: String(planCount) }}
          >
            <div className="pricing-plans-shell__grid items-stretch">
              {block.plans.map((plan, index) => (
                <PricingPlanCard
                  key={plan.durationLabel}
                  plan={plan}
                  features={plan.features?.length ? plan.features : block.features}
                  isFirst={index === 0}
                  selected={index === selectedIdx}
                  onSelect={() => selectPlan(index)}
                  onBook={() => handleBookPlan(plan)}
                  expand={planCount > 1}
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
