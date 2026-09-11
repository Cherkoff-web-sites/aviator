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
    <article className="flex h-full flex-col overflow-hidden rounded-[40px] shadow-[0_16px_48px_rgba(0,45,98,0.18)]">
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

        <div className="mt-auto flex flex-col gap-5 min-[990px]:gap-6">
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
            className="btn-book-flight w-full px-6 py-3.5 text-[15px] font-semibold min-[990px]:py-4 min-[990px]:text-[17px]"
          >
            Забронировать полет
          </button>
        </div>
      </div>
    </article>
  )
}

export function PromoGiftIcon({
  className = 'h-[65px] w-[65px] shrink-0 min-[990px]:h-[92px] min-[990px]:w-[92px]',
}: {
  className?: string
}) {
  return (
    <svg
      className={className}
      width="92"
      height="92"
      viewBox="0 0 92 92"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <rect width="92" height="92" rx="18.4" fill="#002D62" fillOpacity="0.5" />
      <path
        d="M24.4375 41.2084C24.4375 38.9495 24.4375 37.8201 25.1392 37.1184C25.8409 36.4167 26.9704 36.4167 29.2292 36.4167H62.7708C65.0296 36.4167 66.1591 36.4167 66.8608 37.1184C67.5625 37.8201 67.5625 38.9495 67.5625 41.2084V44.8021C67.5625 45.9184 67.5625 46.4766 67.3801 46.9169C67.137 47.5039 66.6706 47.9703 66.0835 48.2135C65.6432 48.3959 65.0851 48.3959 63.9687 48.3959C62.8524 48.3959 62.2943 48.3959 61.854 48.5782C61.2669 48.8214 60.8005 49.2878 60.5574 49.8748C60.375 50.3151 60.375 50.8733 60.375 51.9896V60.375C60.375 62.6338 60.375 63.7632 59.6733 64.465C58.9716 65.1667 57.8421 65.1667 55.5833 65.1667H36.4167C34.1579 65.1667 33.0284 65.1667 32.3267 64.465C31.625 63.7632 31.625 62.6338 31.625 60.375V51.9896C31.625 50.8733 31.625 50.3151 31.4426 49.8748C31.1995 49.2878 30.7331 48.8214 30.146 48.5782C29.7057 48.3959 29.1476 48.3959 28.0312 48.3959C26.9149 48.3959 26.3568 48.3959 25.9165 48.2135C25.3294 47.9703 24.863 47.5039 24.6199 46.9169C24.4375 46.4766 24.4375 45.9184 24.4375 44.8021V41.2084Z"
        stroke="white"
        strokeWidth="2.39583"
      />
      <path d="M29.2285 48.3958H62.7702" stroke="white" strokeWidth="2.39583" strokeLinecap="round" />
      <path d="M46 34.0208L46 65.1666" stroke="white" strokeWidth="2.39583" strokeLinecap="round" />
      <path
        d="M45.9993 34.0208L43.8945 31.916C41.3398 29.3613 38.2254 27.4364 34.7979 26.294C32.058 25.3807 29.2285 27.42 29.2285 30.3081V30.7444C29.2285 32.7011 30.4806 34.4382 32.3368 35.0569L36.416 36.4167"
        stroke="white"
        strokeWidth="2.39583"
        strokeLinecap="round"
      />
      <path
        d="M46.0007 34.0208L48.1055 31.916C50.6602 29.3613 53.7746 27.4364 57.2021 26.294C59.942 25.3807 62.7715 27.42 62.7715 30.3081V30.7444C62.7715 32.7011 61.5194 34.4382 59.6632 35.0569L55.584 36.4167"
        stroke="white"
        strokeWidth="2.39583"
        strokeLinecap="round"
      />
    </svg>
  )
}

export function PromoClockIcon({
  className = 'h-[65px] w-[65px] shrink-0 min-[990px]:h-[92px] min-[990px]:w-[92px]',
}: {
  className?: string
}) {
  return (
    <svg
      className={className}
      width="92"
      height="92"
      viewBox="0 0 92 92"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <rect width="92" height="92" rx="18.4" fill="#085F43" fillOpacity="0.5" />
      <circle cx="46.0006" cy="46" r="20.6667" stroke="#E9E9E9" strokeWidth="3" />
      <path
        d="M56.7812 46H46.25C46.1119 46 46 45.8881 46 45.75V37.6146"
        stroke="#E9E9E9"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  )
}

export default PricesPromoCard
