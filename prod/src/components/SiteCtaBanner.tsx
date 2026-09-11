import { useBookingModal } from '../contexts/BookingModalContext'
import { useGiftCertificateModal } from '../contexts/GiftCertificateModalContext'

/** Полноширинный CTA перед футером на публичных страницах */
function SiteCtaBanner() {
  const { openBooking } = useBookingModal()
  const { openGiftCertificate } = useGiftCertificateModal()

  return (
    <section
      data-sim-reveal="block"
      className="relative w-full overflow-hidden py-14 text-white min-[990px]:py-20"
      style={{
        background: 'radial-gradient(98.31% 98.31% at 50% 50%, #0075FF 0%, #322E67 100%)',
      }}
    >
      <div className="container-app relative z-10 flex flex-col items-center text-center">
        <h2
          data-sim-reveal-item
          className="max-w-[640px] text-[28px] font-bold leading-tight tracking-tight min-[990px]:text-[40px]"
          style={{ fontFamily: 'Montserrat, sans-serif' }}
        >
          Сложно определиться?
        </h2>
        <p
          data-sim-reveal-item
          className="mt-4 max-w-[520px] text-[15px] font-medium leading-relaxed text-white/90 min-[990px]:mt-5 min-[990px]:text-lg"
        >
          Оставьте заявку и менеджер свяжется с Вами в ближайшее время
        </p>

        <div
          data-sim-reveal-item
          className="mt-8 flex w-full max-w-[520px] flex-col gap-3 min-[520px]:mt-10 min-[520px]:max-w-none min-[520px]:flex-row min-[520px]:justify-center min-[520px]:gap-4"
        >
          <button
            type="button"
            onClick={() => openBooking()}
            className="btn-solid-light h-12 px-10 text-lg font-medium min-[990px]:h-14 min-[990px]:px-12"
          >
            Забронировать
          </button>
          <button
            type="button"
            onClick={() => openGiftCertificate()}
            className="btn-outline-light h-12 px-10 text-lg font-medium min-[990px]:h-14 min-[990px]:px-12"
          >
            Подарить полет
          </button>
        </div>
      </div>
    </section>
  )
}

export default SiteCtaBanner
