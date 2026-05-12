import { useEffect, useState } from 'react'

const desktopNavItems = [
  'Авиатренажеры',
  'Школа',
  'Цены',
  'Галерея',
  'Частые вопросы',
  'Контакты',
]

const mobileNavItems = [
  'Boing 737',
  'Ми-2',
  'Летная школа',
  'Цены и акции',
  'Галерея',
  'Контакты',
  'Вопросы и ответы',
]

const mobileSocialIcons = [
  { src: '/src/assets/footer/instagram.svg', label: 'Instagram' },
  { src: '/src/assets/footer/vk.svg', label: 'VK' },
  { src: '/src/assets/footer/whatsapp.svg', label: 'WhatsApp' },
  { src: '/src/assets/footer/telegram.svg', label: 'Telegram' },
]

const logoPath = '/src/assets/header/logo.svg'
const arrowIconPath = '/src/assets/icons/arrow-right.svg'
const menuIconPath = '/src/assets/icons/menu.svg'
const closeIconPath = '/src/assets/icons/close.svg'

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
          <a
            href="#"
            aria-label="Aviator"
            className="inline-flex items-center gap-2 text-[#f3f5f8] no-underline"
          >
            <img src={logoPath} alt="Aviator" className="h-6 w-auto min-[990px]:h-7" />
          </a>

          <nav
            aria-label="Главное меню"
            className="hidden items-center gap-10 min-[990px]:flex"
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
            className="hidden h-12 cursor-pointer items-center gap-2 rounded-full border-0 bg-white px-8 text-[30px] font-semibold text-[#1f2430] min-[990px]:inline-flex"
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
          className="fixed inset-0 z-50 overflow-y-auto bg-[#0d3a82] text-white min-[990px]:hidden"
        >
          <div className="container-app flex min-h-full flex-col py-6">
            <div className="flex items-center justify-between">
              <img src={logoPath} alt="Aviator" className="h-6 w-auto" />
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
                <li key={item}>
                  <a
                    href="#"
                    onClick={() => setIsMenuOpen(false)}
                    className="block no-underline"
                  >
                    {item}
                  </a>
                </li>
              ))}
            </ul>

            <button
              type="button"
              className="mt-9 inline-flex h-12 items-center justify-center self-start rounded-full bg-white px-7 text-base font-semibold text-[#0d3a82]"
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
                    className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-white/30"
                  >
                    <img src={s.src} alt="" aria-hidden="true" className="h-5 w-5" />
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
