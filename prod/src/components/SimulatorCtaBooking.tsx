import { useParams } from 'react-router-dom'

import { useBookingModal } from '../contexts/BookingModalContext'

function SimulatorCtaBooking() {
  const { openBooking } = useBookingModal()
  const { slug } = useParams()
  return (
    <section data-sim-reveal="block" className="bg-[#002D62] py-16 text-white min-[990px]:py-24">
      <div className="container-app flex flex-col items-center text-center">
        <h2
          data-sim-reveal-item
          className="max-w-[520px] text-[28px] font-bold leading-tight tracking-tight min-[990px]:text-[40px]"
        >
          Новые эмоции рядом
        </h2>
        <button
          data-sim-reveal-item
          type="button"
          onClick={() =>
            openBooking({
              simulatorSlug:
                slug === 'mi-2' || slug === 'boeing-737' || slug === 'avia-school' ? slug : null,
            })
          }
          className="btn-book-flight mt-8 px-10 py-3.5 text-[16px] font-semibold min-[990px]:mt-10 min-[990px]:px-12 min-[990px]:py-4 min-[990px]:text-[18px]"
        >
          Забронировать полет
        </button>
      </div>
    </section>
  )
}

export default SimulatorCtaBooking
