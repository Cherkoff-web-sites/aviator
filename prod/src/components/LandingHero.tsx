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
      <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/20 to-black/35" />

      <div className="container-app relative z-10 flex flex-1 flex-col justify-end pb-14 pt-[120px] min-[990px]:pb-20 min-[990px]:pt-[140px]">
        <div className="max-w-[640px] animate-[fadeUp_0.7s_ease-out_both]">
          <p
            className="text-[clamp(2.5rem,6vw,4.5rem)] font-bold leading-[0.95] tracking-tight text-white"
            style={{ fontFamily: 'Montserrat, sans-serif' }}
          >
            AVIATOR
          </p>
          <h1 className="mt-3 text-[clamp(1.35rem,2.8vw,2rem)] font-semibold leading-snug text-white/95 min-[990px]:mt-4">
            Профессиональные авиатренажеры в Минске
          </h1>
          <p className="mt-4 max-w-[520px] text-[15px] leading-relaxed text-white/85 min-[990px]:mt-5 min-[990px]:text-lg">
            Погрузитесь в небо и откройте для себя увлекательный мир авиации – почувствуйте себя
            пилотом самолета Boeing 737 или вертолета Ми-2.
          </p>

          <div className="mt-8 flex flex-col gap-3 min-[520px]:flex-row min-[520px]:flex-wrap min-[520px]:items-center min-[990px]:mt-10">
            <button
              type="button"
              onClick={() => openBooking()}
              className="btn-book-flight h-12 px-10 text-lg font-medium"
            >
              Забронировать полёт
            </button>
            <button
              type="button"
              onClick={() => openGiftCertificate()}
              className="btn-outline-light h-12 px-9 text-lg font-medium"
            >
              Подарить полёт
            </button>
            <Link
              to="/simulators"
              className="btn-outline-light h-12 px-9 text-lg font-medium"
            >
              Посмотреть тренажеры <span className="ml-2">→</span>
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}

export default LandingHero
