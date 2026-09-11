import { Link } from 'react-router-dom'

import { useGiftCertificateModal } from '../contexts/GiftCertificateModalContext'
import { FOOTER_SOCIAL_ICONS, SOCIAL_ASSETS } from '../data/socialAssets'

const footerLogoPath = '/assets/header/logo.svg'
const paymentStripPath = SOCIAL_ASSETS.payments
const arrowUpIconPath = '/assets/icons/arrow_up.svg'

const MAPS_URL =
  'https://yandex.ru/maps/?text=%D0%9C%D0%B8%D0%BD%D1%81%D0%BA%2C%20%D1%83%D0%BB.%20%D0%98%D0%B3%D0%BE%D1%80%D1%8F%20%D0%9B%D1%83%D1%87%D0%B5%D0%BD%D0%BA%D0%BE%2C%2026'
const PHONE_HREF = 'tel:+375297131001'
const EMAIL_HREF = 'mailto:aviator@737.by'

const linkClass = 'text-inherit no-underline transition-opacity hover:opacity-90'
const externalRel = 'noopener noreferrer'

function SiteFooter() {
  const { openGiftCertificate } = useGiftCertificateModal()

  return (
    <footer className="bg-[#090c0e] text-white">
      <div className="container-app">
        <div className="hidden py-12 min-[990px]:block">
          <div className="flex items-stretch justify-between gap-12">
            <div className="flex min-h-[220px] max-w-[400px] flex-1 flex-col justify-between">
              <Link to="/" className="inline-flex w-fit" aria-label="Aviator — на главную">
                <img src={footerLogoPath} alt="Aviator" className="h-auto w-[240px]" />
              </Link>
              <div className="flex flex-col gap-2 text-[15px] font-medium leading-[1.35] text-white/90">
                <p>ООО «МайсГрупп»</p>
                <p>
                  Республика Беларусь, Минская область, Минский район, д. Обчак, АПК, каб 9.
                  Р/с BY28 ALFA 3012 2Е44 1700 1027 0000 ЗАО «Альфа-Банк» СВИФТ - ALFABY2X,
                  УНП 101541947, ОКПО 37526626 Св-во о гос регистрации №692124404 от 15.03.2019
                  г., Минский райисполком
                </p>
                <p>Почтовый адрес: 220035 г.Минск, пр-т Победителей 47/1-62</p>
              </div>
            </div>

            <div className="flex flex-1 flex-col justify-between">
              <div className="grid grid-cols-4 gap-10">
                <div>
                  <h3 className="mb-3 text-[20px] font-bold">Меню</h3>
                  <ul className="space-y-2 text-[15px] font-medium text-white/90">
                    <li>
                      <Link to="/simulators" className={linkClass}>
                        Авиатренажеры
                      </Link>
                    </li>
                    <li>
                      <button
                        type="button"
                        onClick={() => openGiftCertificate()}
                        className="cursor-pointer border-0 bg-transparent p-0 text-left text-inherit transition-opacity hover:opacity-90"
                      >
                        Подарочный сертификат
                      </button>
                    </li>
                    <li>
                      <Link to="/prices" className={linkClass}>
                        Цены
                      </Link>
                    </li>
                    <li>
                      <Link to="/gallery" className={linkClass}>
                        Галерея
                      </Link>
                    </li>
                    <li>
                      <Link to="/faq" className={linkClass}>
                        FAQ
                      </Link>
                    </li>
                    <li>
                      <Link to="/contacts" className={linkClass}>
                        Контакты
                      </Link>
                    </li>
                    <li>
                      <Link to="/admin" className={linkClass}>
                        Админ-панель
                      </Link>
                    </li>
                  </ul>
                </div>

                <div>
                  <h3 className="mb-3 text-[20px] font-bold">Информация</h3>
                  <ul className="space-y-2 text-[15px] font-medium text-white/90">
                    <li>
                      <Link to="/faq" className={linkClass} target="_blank" rel={externalRel}>
                        Правила посещения авиатренажера
                      </Link>
                    </li>
                    <li>
                      <Link to="/faq" className={linkClass} target="_blank" rel={externalRel}>
                        Политика конфиденциальности
                      </Link>
                    </li>
                    <li>
                      <Link to="/faq" className={linkClass} target="_blank" rel={externalRel}>
                        Договор публичной оферты
                      </Link>
                    </li>
                  </ul>
                </div>

                <div>
                  <h3 className="mb-3 text-[20px] font-bold">Контакты</h3>
                  <div className="space-y-2 text-[15px] font-medium text-white/90">
                    <p>
                      <a href={PHONE_HREF} className={linkClass} target="_blank" rel={externalRel}>
                        +375 29 713 10 01
                      </a>
                    </p>
                    <p>
                      <a href={EMAIL_HREF} className={linkClass} target="_blank" rel={externalRel}>
                        aviator@737.by
                      </a>
                    </p>
                  </div>

                  <div className="mt-4 flex items-center gap-2">
                    {FOOTER_SOCIAL_ICONS.map((s) => (
                      <a
                        key={s.label}
                        href={s.href}
                        target="_blank"
                        rel={externalRel}
                        aria-label={s.label}
                        className="inline-flex transition-opacity hover:opacity-80"
                      >
                        <img src={s.src} alt="" aria-hidden className="h-7 w-7" />
                      </a>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="mb-3 text-[20px] font-bold">Режим работы</h3>
                  <div className="space-y-2 text-[15px] font-medium text-white/90">
                    <p>С 12.00 до 22.00</p>
                    <p>Ежедневно, без выходных</p>
                    <p>
                      <a href={MAPS_URL} className={linkClass} target="_blank" rel={externalRel}>
                        г. Минск, ул. Игоря Лученко, д. 26
                      </a>
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-8 flex justify-end">
                <button
                  type="button"
                  onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                  className="btn-outline-light h-11 px-6 text-[15px] font-semibold"
                >
                  Наверх
                  <img src={arrowUpIconPath} alt="" aria-hidden="true" className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          <div className="mt-8">
            <img src={paymentStripPath} alt="Payment methods" className="w-full max-w-full" />
          </div>
        </div>

        <div className="py-10 min-[990px]:hidden">
          <div className="flex flex-col items-center gap-5">
            <Link to="/" className="inline-flex" aria-label="Aviator — на главную">
              <img src={footerLogoPath} alt="Aviator" className="h-6 w-auto" />
            </Link>
            <button
              type="button"
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="btn-outline-light h-11 px-6 text-sm font-semibold"
            >
              Наверх
              <img src={arrowUpIconPath} alt="" aria-hidden="true" className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-10 grid grid-cols-2 gap-x-8 gap-y-10">
            <div>
              <h3 className="text-[18px] font-bold">Контакты</h3>
              <div className="mt-4 space-y-2 text-sm">
                <p>
                  <a href={PHONE_HREF} className={linkClass} target="_blank" rel={externalRel}>
                    +375 29 713 10 01
                  </a>
                </p>
                <p>
                  <a href={EMAIL_HREF} className={linkClass} target="_blank" rel={externalRel}>
                    aviator@737.by
                  </a>
                </p>
              </div>
              <div className="mt-5 flex flex-wrap items-center gap-2">
                {FOOTER_SOCIAL_ICONS.map((s) => (
                  <a
                    key={s.label}
                    href={s.href}
                    target="_blank"
                    rel={externalRel}
                    aria-label={s.label}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-white/30 transition-opacity hover:opacity-80"
                  >
                    <img src={s.src} alt="" aria-hidden="true" className="h-5 w-5" />
                  </a>
                ))}
              </div>
            </div>

            <div className="text-right">
              <h3 className="text-[18px] font-bold">Режим работы</h3>
              <div className="mt-4 space-y-2 text-sm text-white/85">
                <p>С 12.00 до 22.00</p>
                <p>Ежедневно, без выходных</p>
                <p>
                  <a href={MAPS_URL} className={linkClass} target="_blank" rel={externalRel}>
                    г. Минск, ул. Игоря Лученко, д. 26
                  </a>
                </p>
              </div>
            </div>

            <div>
              <h3 className="text-[18px] font-bold">Информация</h3>
              <ul className="mt-4 space-y-3 text-sm text-white/90">
                <li>
                  <Link to="/faq" className={linkClass} target="_blank" rel={externalRel}>
                    Правила посещения авиатренажера
                  </Link>
                </li>
                <li>
                  <Link to="/faq" className={linkClass} target="_blank" rel={externalRel}>
                    Политика конфиденциальности
                  </Link>
                </li>
                <li>
                  <Link to="/faq" className={linkClass} target="_blank" rel={externalRel}>
                    Договор публичной оферты
                  </Link>
                </li>
              </ul>
            </div>

            <div className="text-right">
              <h3 className="text-[18px] font-bold">Меню</h3>
              <ul className="mt-4 space-y-3 text-sm text-white/90">
                <li>
                  <Link to="/simulators" className={linkClass}>
                    Авиатренажеры
                  </Link>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => openGiftCertificate()}
                    className="cursor-pointer border-0 bg-transparent p-0 text-inherit transition-opacity hover:opacity-90"
                  >
                    Подарочный сертификат
                  </button>
                </li>
                <li>
                  <Link to="/prices" className={linkClass}>
                    Цены
                  </Link>
                </li>
                <li>
                  <Link to="/gallery" className={linkClass}>
                    Галерея
                  </Link>
                </li>
                <li>
                  <Link to="/faq" className={linkClass}>
                    FAQ
                  </Link>
                </li>
                <li>
                  <Link to="/contacts" className={linkClass}>
                    Контакты
                  </Link>
                </li>
                <li>
                  <Link to="/admin" className={linkClass}>
                    Админ-панель
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-10">
            <p className="text-base font-bold">ООО «МайсГрупп»</p>
            <p className="mt-3 text-sm leading-6 text-white/80">
              Республика Беларусь, Минская область, Минский район, д. Обчак, АПК, каб 9.
              Р/с BY28 ALFA 3012 2Е44 1700 1027 0000 ЗАО «Альфа-Банк»
              СВИФТ - ALFABY2X, УНП 101541947, ОКПО 37526626
              Св-во о гос регистрации №692124404 от 15.03.2019 г., Минский райисполком
            </p>
            <p className="mt-4 text-sm text-white/80">
              Почтовый адрес: 220035 г.Минск, пр-т Победителей 47/1-62
            </p>
          </div>

          <div className="mt-8">
            <img src={paymentStripPath} alt="Способы оплаты" className="w-full max-w-full" />
          </div>
        </div>
      </div>
    </footer>
  )
}

export default SiteFooter
