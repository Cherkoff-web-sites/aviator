import { useEffect, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'

import { useBookingModal } from '../contexts/BookingModalContext'
import { HEADER_MOBILE_SOCIAL_ICONS } from '../data/socialAssets'

function isSimulatorsNavActive(pathname: string) {
  return pathname === '/simulators' || pathname.startsWith('/simulator/')
}

const desktopNavItems: ({ label: string } & ({ to: string } | { href: string }))[] = [
  { label: 'Авиатренажеры', to: '/simulators' },
  // { label: 'Школа', to: '/simulator/avia-school' }, // временно скрыто
  { label: 'Цены', to: '/prices' },
  { label: 'Галерея', to: '/gallery' },
  { label: 'Частые вопросы', to: '/faq' },
  { label: 'Контакты', to: '/contacts' },
]

const mobileNavItems: { label: string; to?: string }[] = [
  { label: 'Авиатренажеры', to: '/simulators' },
  { label: 'Boing 737', to: '/simulator/boeing-737' },
  { label: 'Ми-2', to: '/simulator/mi-2' },
  // { label: 'Летная школа', to: '/simulator/avia-school' }, // временно скрыто
  { label: 'Цены и акции', to: '/prices' },
  { label: 'Галерея', to: '/gallery' },
  { label: 'Контакты', to: '/contacts' },
  { label: 'Вопросы и ответы', to: '/faq' },
]

const logoPath = '/assets/header/logo.svg'
const arrowIconPath = '/assets/icons/arrow_right.svg'
const menuIconPath = '/assets/icons/menu.svg'
const closeIconPath = '/assets/icons/close.svg'

function SiteHeader() {
  const { pathname } = useLocation()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [headerVisible, setHeaderVisible] = useState(true)
  const { openBooking } = useBookingModal()
  const headerHasBg = pathname === '/' || pathname === '/simulators'

  useEffect(() => {
    document.body.style.overflow = isMenuOpen ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [isMenuOpen])

  useEffect(() => {
    let lastY = window.scrollY

    const onScroll = () => {
      if (isMenuOpen) {
        setHeaderVisible(true)
        lastY = window.scrollY
        return
      }

      const y = window.scrollY
      const delta = y - lastY

      if (y < 24) {
        setHeaderVisible(true)
      } else if (delta > 6) {
        setHeaderVisible(false)
      } else if (delta < -6) {
        setHeaderVisible(true)
      }

      lastY = y
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [isMenuOpen])

  return (
    <>
      <header
        className={[
          'fixed inset-x-0 top-0 z-30 transition-transform duration-300 ease-out',
          headerHasBg ? 'border-b border-white/10' : 'border-b border-transparent',
          headerVisible ? 'translate-y-0' : '-translate-y-full',
        ].join(' ')}
        style={
          headerHasBg
            ? {
                background:
                  'radial-gradient(145.17% 312.16% at 22.07% 0%, #03489B 0%, rgba(3, 72, 155, 0) 100%)',
                backdropFilter: 'blur(21px)',
                WebkitBackdropFilter: 'blur(21px)',
              }
            : undefined
        }
      >
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
            {desktopNavItems.map((item) =>
              'to' in item ? (
                <NavLink
                  key={item.label}
                  to={item.to}
                  end={item.to === '/'}
                  className={({ isActive }) => {
                    const active =
                      item.to === '/simulators'
                        ? isSimulatorsNavActive(pathname)
                        : isActive
                    return [
                      'whitespace-nowrap text-base font-medium no-underline transition-colors duration-200',
                      active ? 'text-white' : 'text-white/65 hover:text-white',
                    ].join(' ')
                  }}
                >
                  {item.label}
                </NavLink>
              ) : (
                <a
                  key={item.label}
                  href={item.href}
                  className="whitespace-nowrap text-base font-medium text-white/65 no-underline transition-colors duration-200 hover:text-white"
                >
                  {item.label}
                </a>
              ),
            )}
          </nav>

          <button
            type="button"
            onClick={() => openBooking()}
            className="btn-solid-light hidden px-[34px] py-[12px] text-[16px] font-semibold min-[990px]:inline-flex"
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
              onClick={() => {
                openBooking()
                setIsMenuOpen(false)
              }}
              className="btn-solid-light mt-9 h-12 self-start px-7 text-base font-semibold"
            >
              Забронировать полет
            </button>

            <div className="mt-auto pt-9">
              <a
                href="tel:+375297131001"
                target="_blank"
                rel="noopener noreferrer"
                className="block text-lg no-underline"
              >
                +375 29 713 10 01
              </a>
              <div className="mt-4 flex items-center gap-3">
                {HEADER_MOBILE_SOCIAL_ICONS.map((s) => (
                  <a
                    key={s.label}
                    href={s.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={s.label}
                    className="inline-flex items-center justify-center transition-opacity hover:opacity-80"
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
