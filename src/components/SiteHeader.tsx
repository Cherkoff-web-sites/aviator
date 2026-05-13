import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

const desktopNavItems = [
  'Авиатренажеры',
  'Школа',
  'Цены',
  'Галерея',
  'Частые вопросы',
  'Контакты',
]

const mobileNavItems: { label: string; to?: string }[] = [
  { label: 'Boing 737', to: '/simulator/boeing-737' },
  { label: 'Ми-2', to: '/simulator/mi-2' },
  { label: 'Летная школа', to: '/simulator/avia-school' },
  { label: 'Цены и акции' },
  { label: 'Галерея' },
  { label: 'Контакты' },
  { label: 'Вопросы и ответы' },
]

const mobileSocialIcons = [
  { src: '/assets/footer/instagram.svg', label: 'Instagram' },
  { src: '/assets/footer/vk.svg', label: 'VK' },
  { src: '/assets/footer/whatsapp.svg', label: 'WhatsApp' },
  { src: '/assets/footer/telegram.svg', label: 'Telegram' },
]

const logoPath = '/assets/header/logo.svg'
const arrowIconPath = '/assets/icons/arrow_right.svg'
const menuIconPath = '/assets/icons/menu.svg'
const closeIconPath = '/assets/icons/close.svg'

function SiteHeader() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  useEffect(() => {
    document.body.style.overflow = isMenuOpen ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [isMenuOpen])

  return (
    <>
      <header className="absolute inset-x-0 top-0 z-30 border-b border-white/10 bg-[#6f6287]/65 bg-[radial-gradient(180.9%_348.86%_at_-43.33%_-142.05%,rgba(3,72,155,0.2)_0%,rgba(3,72,155,0)_100%)] backdrop-blur-[23.1px]">
        <div className="container-app flex h-[64px] items-center justify-between gap-6 min-[990px]:h-[76px] min-[990px]:gap-8">
          <Link
            to="/"
            aria-label="Aviator"
            className="inline-flex items-center gap-2 text-[#f3f5f8] no-underline"
          >
            <img src={logoPath} alt="Aviator" className="h-auto w-[180px] min-[990px]:w-[235px]" />
          </Link>

          <nav
            aria-label="Главное меню"
            className="hidden items-center gap-[35px] min-[990px]:flex"
          >
            {desktopNavItems.map((item) => (
              <a
                key={item}
                href="#"
                className="whitespace-nowrap text-base font-medium text-[#f5f6fa] no-underline transition-opacity hover:opacity-80"
              >
                {item}
              </a>
            ))}
          </nav>

          <button
            type="button"
            className="hidden cursor-pointer items-center gap-[6px] rounded-full border-0 bg-white px-[34px] py-[12px] text-[16px] font-semibold text-[#1f2430] min-[990px]:inline-flex"
          >
            Забронировать
            <img src={arrowIconPath} alt="" aria-hidden="true" className="h-6 w-6" />
          </button>

          <button
            type="button"
            onClick={() => setIsMenuOpen(true)}
            aria-label="Открыть меню"
            className="inline-flex h-10 w-10 items-center justify-center text-white min-[990px]:hidden"
          >
            <img src={menuIconPath} alt="" aria-hidden="true" className="h-7 w-7" />
          </button>
        </div>
      </header>

      {isMenuOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 overflow-y-auto bg-[#002D62] text-white min-[990px]:hidden"
        >
          <div className="container-app flex min-h-full flex-col py-6">
            <div className="flex items-center justify-between">
              <Link to="/" onClick={() => setIsMenuOpen(false)}>
                <img src={logoPath} alt="Aviator" className="h-auto w-[180px]" />
              </Link>
              <button
                type="button"
                onClick={() => setIsMenuOpen(false)}
                aria-label="Закрыть меню"
                className="inline-flex h-10 w-10 items-center justify-center"
              >
                <img src={closeIconPath} alt="" aria-hidden="true" className="h-7 w-7" />
              </button>
            </div>

            <ul className="mt-10 space-y-6 text-xl font-medium">
              {mobileNavItems.map((item) => (
                <li key={item.label}>
                  {item.to ? (
                    <Link
                      to={item.to}
                      onClick={() => setIsMenuOpen(false)}
                      className="block no-underline"
                    >
                      {item.label}
                    </Link>
                  ) : (
                    <a
                      href="#"
                      onClick={() => setIsMenuOpen(false)}
                      className="block no-underline"
                    >
                      {item.label}
                    </a>
                  )}
                </li>
              ))}
            </ul>

            <button
              type="button"
              className="mt-9 inline-flex h-12 items-center justify-center self-start rounded-full bg-white px-7 text-base font-semibold text-[#002D62]"
            >
              Забронировать полет
            </button>

            <div className="mt-auto pt-9">
              <a href="tel:+375297131001" className="block text-lg no-underline">
                +375 29 713 10 01
              </a>
              <div className="mt-4 flex items-center gap-3">
                {mobileSocialIcons.map((s) => (
                  <a
                    key={s.label}
                    href="#"
                    aria-label={s.label}
                    className="inline-flex items-center justify-center"
                  >
                    <img src={s.src} alt="" aria-hidden="true" className="h-8 w-8" />
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default SiteHeader
