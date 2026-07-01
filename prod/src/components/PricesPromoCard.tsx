import type { ReactNode } from 'react'

import { useBookingModal } from '../contexts/BookingModalContext'

const DOC_ICON = (
  <svg className="h-5 w-5 shrink-0 text-white" viewBox="0 0 24 24" fill="none" aria-hidden>
    <path
      d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinejoin="round"
    />
    <path d="M14 2v6h6M8 13h8M8 17h6" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
  </svg>
)

const CALENDAR_ICON = (
  <svg className="h-5 w-5 shrink-0 text-white" viewBox="0 0 24 24" fill="none" aria-hidden>
    <rect x="3" y="5" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="1.75" />
    <path d="M3 10h18M8 3v4M16 3v4" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
  </svg>
)

const CHECK_ICON = (
  <svg className="mt-0.5 h-4 w-4 shrink-0 text-white" viewBox="0 0 20 20" fill="none" aria-hidden>
    <path
      d="M5.27 11.82l2.35 1.76c.31.23.75.18 1-.15l6.1-7.46"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    />
  </svg>
)

export type PricesPromoCardProps = {
  headerBackground: string
  headerIcon: ReactNode
  title: string
  discount: string
  lead: string
  terms: string[]
  documentLine: string
}

function PricesPromoCard({
  headerBackground,
  headerIcon,
  title,
  discount,
  lead,
  terms,
  documentLine,
}: PricesPromoCardProps) {
  const { openBooking } = useBookingModal()
  return (
    <article className="flex flex-col overflow-hidden rounded-[40px] shadow-[0_16px_48px_rgba(0,45,98,0.18)]">
      <header
        className="flex shrink-0 items-center gap-4 px-6 py-5 text-white min-[990px]:gap-5 min-[990px]:px-8 min-[990px]:py-6"
        style={{ background: headerBackground }}
      >
        {headerIcon}
        <div className="min-w-0">
          <p className="text-[16px] font-semibold leading-tight text-white min-[990px]:text-[18px]">{title}</p>
          <p className="mt-1 text-[28px] font-bold leading-none tracking-tight text-white min-[990px]:text-[36px]">
            {discount}
          </p>
        </div>
      </header>

      <div className="flex flex-1 flex-col gap-5 bg-[#002D62] px-6 py-6 text-[15px] font-medium leading-relaxed text-white min-[990px]:gap-6 min-[990px]:px-8 min-[990px]:py-8 min-[990px]:text-[16px]">
        <p>{lead}</p>

        <div>
          <div className="mb-3 flex items-center gap-2">
            {DOC_ICON}
            <span className="text-[15px] font-semibold min-[990px]:text-[16px]">Условия акции</span>
          </div>
          <ul className="m-0 flex list-none flex-col gap-3 p-0 pl-1">
            {terms.map((t) => (
              <li key={t} className="relative pl-5 text-white/95 before:absolute before:left-0 before:top-[0.55em] before:h-1.5 before:w-1.5 before:rounded-full before:bg-white/80 before:content-['']">
                {t}
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-2xl border border-white/35 px-4 py-4 min-[990px]:px-5 min-[990px]:py-5">
          <div className="flex items-center gap-2">
            {CALENDAR_ICON}
            <span className="text-[15px] font-semibold min-[990px]:text-[16px]">Необходимые документы:</span>
          </div>
          <div className="mt-3 flex gap-2">
            {CHECK_ICON}
            <span className="text-white/95">{documentLine}</span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => openBooking()}
          className="mt-auto inline-flex w-full items-center justify-center rounded-full bg-[radial-gradient(98.31%_98.31%_at_50%_50%,#0075FF_0%,#322E67_100%)] px-6 py-3.5 text-[15px] font-semibold text-white shadow-[0_0_24px_rgba(0,117,255,0.4)] min-[990px]:py-4 min-[990px]:text-[17px]"
        >
          Забронировать полет
        </button>
      </div>
    </article>
  )
}

export function PromoGiftIcon({ className = 'h-11 w-11' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <path
        d="M20 12v8a2 2 0 01-2 2H6a2 2 0 01-2-2v-8M2 12h20M12 22V7M12 7H7.5A2.5 2.5 0 015 4.5C5 3 6.5 1.5 8.5 1.5 11 1.5 12 7 12 7Zm0 0h4.5A2.5 2.5 0 0019 4.5c0-1.5-1.5-3-3.5-3C13 1.5 12 7 12 7Z"
        stroke="currentColor"
        strokeWidth="1.85"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function PromoClockIcon({ className = 'h-11 w-11' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <circle cx="12" cy="12" r="7" stroke="currentColor" strokeWidth="1.85" />
      <path d="M12 8v5l3 2" stroke="currentColor" strokeWidth="1.85" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export default PricesPromoCard
