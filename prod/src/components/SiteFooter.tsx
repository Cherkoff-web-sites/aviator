import { Link } from 'react-router-dom'

import { FOOTER_SOCIAL_ICONS, SOCIAL_ASSETS } from '../data/socialAssets'

const footerLogoPath = '/assets/header/logo.svg'
const paymentStripPath = SOCIAL_ASSETS.payments
const arrowUpIconPath = '/assets/icons/arrow_up.svg'

const mobileFooterSocials = FOOTER_SOCIAL_ICONS

function SiteFooter() {
  return (
    <footer className="bg-[#1b1c20] text-white">
      <div className="container-app">
        <div className="hidden py-12 min-[990px]:block">
          <div className="flex items-stretch justify-between gap-12">
            <div className="flex min-h-[220px] max-w-[400px] flex-1 flex-col justify-between">
              <img src={footerLogoPath} alt="Aviator" className="h-auto w-[240px]" />
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
                      <Link to="/prices" className="text-inherit no-underline hover:opacity-90">
                        Цены
                      </Link>
                    </li>
                    <li>
                      <Link to="/gallery" className="text-inherit no-underline hover:opacity-90">
                        Галерея
                      </Link>
                    </li>
                    <li>
                      <Link to="/faq" className="text-inherit no-underline hover:opacity-90">
                        FAQ
                      </Link>
                    </li>
                    <li>
                      <Link to="/contacts" className="text-inherit no-underline hover:opacity-90">
                        Контакты
                      </Link>
                    </li>
                    <li>
                      <Link to="/admin" className="text-inherit no-underline hover:opacity-90">
                        Админ-панель
                      </Link>
                    </li>
                  </ul>
                </div>

                <div>
                  <h3 className="mb-3 text-[20px] font-bold">Информация</h3>
                  <ul className="space-y-2 text-[15px] font-medium text-white/90">
                    <li>Правила посещения авиатренажера</li>
                    <li>Политика конфиденциальности</li>
                    <li>Договор публичной оферты</li>
                  </ul>
                </div>

                <div>
                  <h3 className="mb-3 text-[20px] font-bold">Контакты</h3>
                  <div className="space-y-2 text-[15px] font-medium text-white/90">
                    <p>+375 29 713 10 01</p>
                    <p>aviator@737.by</p>
                  </div>

                  <div className="mt-4 flex items-center gap-2">
                    {mobileFooterSocials.map((s) => (
                      <img key={s.label} src={s.src} alt={s.label} className="h-7 w-7" />
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="mb-3 text-[20px] font-bold">Режим работы</h3>
                  <div className="space-y-2 text-[15px] font-medium text-white/90">
                    <p>С 12.00 до 22.00</p>
                    <p>Ежедневно, без выходных</p>
                    <p>г. Минск, ул. Игоря Лученко, д. 26</p>
                  </div>
                </div>
              </div>

              <div className="mt-8 flex justify-end">
                <button
                  type="button"
                  className="inline-flex h-11 items-center gap-[6px] rounded-full border border-white/40 px-6 text-[15px] font-semibold text-white"
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
            <img src={footerLogoPath} alt="Aviator" className="h-6 w-auto" />
            <button
              type="button"
              className="inline-flex h-11 items-center gap-2 rounded-full border border-white/40 px-6 text-sm font-semibold text-white"
            >
              Наверх
              <img src={arrowUpIconPath} alt="" aria-hidden="true" className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-10 grid grid-cols-2 gap-x-8 gap-y-10">
            <div>
              <h3 className="text-[18px] font-bold">Контакты</h3>
              <div className="mt-4 space-y-2 text-sm">
                <p>+375 29 713 10 01</p>
                <p>aviator@737.by</p>
              </div>
              <div className="mt-5 flex flex-wrap items-center gap-2">
                {mobileFooterSocials.map((s) => (
                  <a
                    key={s.label}
                    href="#"
                    aria-label={s.label}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-white/30"
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
                <p>г. Минск, ул. Игоря Лученко, д. 26</p>
              </div>
            </div>

            <div>
              <h3 className="text-[18px] font-bold">Информация</h3>
              <ul className="mt-4 space-y-3 text-sm text-white/90">
                <li>Правила посещения авиатренажера</li>
                <li>Политика конфиденциальности</li>
                <li>Договор публичной оферты</li>
              </ul>
            </div>

            <div className="text-right">
              <h3 className="text-[18px] font-bold">Меню</h3>
              <ul className="mt-4 space-y-3 text-sm text-white/90">
                <li>
                  <Link to="/prices" className="text-inherit no-underline hover:opacity-90">
                    Цены
                  </Link>
                </li>
                <li>
                  <Link to="/gallery" className="text-inherit no-underline hover:opacity-90">
                    Галерея
                  </Link>
                </li>
                <li>
                  <Link to="/faq" className="text-inherit no-underline hover:opacity-90">
                    FAQ
                  </Link>
                </li>
                <li>
                  <Link to="/contacts" className="text-inherit no-underline hover:opacity-90">
                    Контакты
                  </Link>
                </li>
                <li>
                  <Link to="/admin" className="text-inherit no-underline hover:opacity-90">
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
            <img
              src={paymentStripPath}
              alt="Способы оплаты"
              className="w-full max-w-full"
            />
          </div>
        </div>
      </div>
    </footer>
  )
}

export default SiteFooter
