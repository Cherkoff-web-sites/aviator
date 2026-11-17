import { Link } from 'react-router-dom'
import { useBookingModal } from '../contexts/BookingModalContext'
import { useGiftCertificateModal } from '../contexts/GiftCertificateModalContext'
import { resolveMediaUrl } from '../data/siteImages'
import { useSiteImages } from '../hooks/useSiteImages'

function LandingHero() {
  const { openBooking } = useBookingModal()
  const { openGiftCertificate } = useGiftCertificateModal()
  const { images } = useSiteImages()
  const heroImage = resolveMediaUrl(images.heroes.landing)

  return (
    <section
      id="home-hero"
      className="relative flex min-h-[100dvh] w-full flex-col overflow-hidden bg-[#151824]"
    >
      <img
        src={heroImage}
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
          <Link
            to="/simulators"
            className="mt-3 inline-flex items-center gap-2.5 text-lg font-medium leading-none text-white no-underline transition-opacity hover:opacity-80 min-[990px]:mt-4"
          >
            Посмотреть тренажеры
            <span
              className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[linear-gradient(180deg,#4da3ff_0%,#0075ff_48%,#0050b3_100%)] text-[13px] font-semibold leading-none text-white shadow-[0_4px_12px_rgba(0,117,255,0.4)]"
              aria-hidden
            >
              →
            </span>
          </Link>
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
          </div>
        </div>
      </div>
    </section>
  )
}

export default LandingHero
