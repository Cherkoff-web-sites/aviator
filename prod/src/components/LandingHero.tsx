import { Link } from 'react-router-dom'
import { useBookingModal } from '../contexts/BookingModalContext'
import { useGiftCertificateModal } from '../contexts/GiftCertificateModalContext'

const HERO_IMAGE = '/assets/hero/boeing_737.webp'

function LandingHero() {
  const { openBooking } = useBookingModal()
  const { openGiftCertificate } = useGiftCertificateModal()

  return (
    <section
      id="home-hero"
      className="relative flex min-h-[100dvh] w-full flex-col overflow-hidden bg-[#151824]"
    >
      <img
        src={HERO_IMAGE}
        alt=""
        aria-hidden
        className="absolute inset-0 h-full w-full object-cover"
        style={{ objectPosition: '87% 50%' }}
      />
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(105deg, rgba(0, 45, 98, 0.88) 0%, rgba(0, 45, 98, 0.55) 42%, rgba(21, 24, 36, 0.25) 72%, rgba(21, 24, 36, 0.15) 100%)',
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/25" />

      <div className="container-app relative z-10 flex flex-1 flex-col justify-end pb-14 pt-[120px] min-[990px]:pb-20 min-[990px]:pt-[140px]">
        <div className="max-w-[640px] animate-[fadeUp_0.7s_ease-out_both]">
          <p
            className="text-[clamp(2.5rem,6vw,4.5rem)] font-bold leading-[0.95] tracking-tight text-white"
            style={{ fontFamily: 'Montserrat, sans-serif' }}
          >
            AVIATOR
          </p>
          <h1 className="mt-3 text-[clamp(1.35rem,2.8vw,2rem)] font-semibold leading-snug text-white/95 min-[990px]:mt-4">
            Авиатренажёры в Минске
          </h1>
          <p className="mt-4 max-w-[480px] text-[15px] leading-relaxed text-white/85 min-[990px]:mt-5 min-[990px]:text-lg">
            Станьте пилотом Boeing 737 или вертолёта Ми-2
            <br />
            Забронируйте полет за 2 минуты
          </p>

          <div className="mt-8 flex flex-col gap-3 min-[520px]:flex-row min-[520px]:items-center min-[990px]:mt-10">
            <button
              type="button"
              onClick={() => openBooking()}
              className="btn-book-flight h-12 px-10 text-lg font-medium"
            >
              Забронировать полёт
            </button>
            <Link
              to="/simulators"
              className="btn-outline-light h-12 px-9 text-lg font-medium"
            >
              Посмотреть тренажёры <span className="ml-2">→</span>
            </Link>
          </div>

          <button
            type="button"
            onClick={() => openGiftCertificate()}
            className="mt-5 text-left text-[15px] font-medium text-white/80 underline-offset-4 transition-colors hover:text-white hover:underline min-[990px]:text-base"
          >
            Подарочный сертификат — идеальный подарок пилоту →
          </button>
        </div>
      </div>
    </section>
  )
}

export default LandingHero
