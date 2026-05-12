const footerLogoPath = '/assets/header/logo.svg'
const instagramIconPath = '/assets/footer/instagram.svg'
const maxIconPath = '/assets/footer/max.svg'
const viberIconPath = '/assets/footer/viber.svg'
const whatsappIconPath = '/assets/footer/whatsapp.svg'
const telegramIconPath = '/assets/footer/telegram.svg'
const paymentStripPath = '/assets/footer/payments.png'
const arrowUpIconPath = '/assets/icons/arrow-up.svg'

const mobileFooterSocials = [
  { src: instagramIconPath, label: 'Instagram' },
  { src: maxIconPath, label: 'Max' },
  { src: whatsappIconPath, label: 'WhatsApp' },
  { src: viberIconPath, label: 'Viber' },
  { src: telegramIconPath, label: 'Telegram' },
]

function SiteFooter() {
  return (
    <footer className="bg-[#1b1c20] text-white">
      <div className="container-app">
        <div className="hidden py-12 min-[990px]:block">
          <div className="grid grid-cols-[1.35fr_0.8fr_1fr_1fr] gap-12 border-b border-white/15 pb-10">
            <div>
              <img src={footerLogoPath} alt="Aviator" className="h-8 w-auto" />
              <p className="mt-8 max-w-[420px] text-[22px] leading-8 text-white/85">
                ООО «МаисГрупп» Республика Беларусь, Минская область, Минский район.
                Юридический и почтовый адреса, реквизиты и регистрационные данные добавьте
                после финального согласования.
              </p>
            </div>

            <div>
              <h3 className="mb-5 text-[36px] font-semibold">Меню</h3>
              <ul className="space-y-3 text-2xl text-white/90">
                <li>Цены</li>
                <li>Галерея</li>
                <li>FAQ</li>
                <li>Контакты</li>
              </ul>
            </div>

            <div>
              <h3 className="mb-5 text-[36px] font-semibold">Информация</h3>
              <ul className="space-y-3 text-2xl text-white/90">
                <li>Правила посещения авиатренажера</li>
                <li>Политика конфиденциальности</li>
                <li>Договор публичной оферты</li>
              </ul>
            </div>

            <div>
              <h3 className="mb-5 text-[36px] font-semibold">Контакты</h3>
              <div className="space-y-3 text-2xl text-white/90">
                <p>+375 29 713 10 01</p>
                <p>aviator@737.by</p>
              </div>

              <div className="mt-6 flex items-center gap-4">
                {mobileFooterSocials.map((s) => (
                  <img key={s.label} src={s.src} alt={s.label} className="h-8 w-8" />
                ))}
              </div>
            </div>
          </div>

          <div className="mt-8">
            <img src={paymentStripPath} alt="Payment methods" className="w-auto max-w-full" />
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

          <div className="mt-10 grid grid-cols-2 gap-8">
            <div>
              <h3 className="text-lg font-bold">Контакты</h3>
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
              <h3 className="text-lg font-bold">Режим работы</h3>
              <div className="mt-4 space-y-2 text-sm text-white/85">
                <p>С 12.00 до 22.00</p>
                <p>Ежедневно, без выходных</p>
                <p>г. Минск, ул. Игоря Лученко, д. 26</p>
              </div>
            </div>
          </div>

          <div className="mt-10 grid grid-cols-2 gap-8">
            <div>
              <h3 className="text-lg font-bold">Информация</h3>
              <ul className="mt-4 space-y-3 text-sm text-white/90">
                <li>Правила посещения авиатренажера</li>
                <li>Политика конфиденциальности</li>
                <li>Договор публичной оферты</li>
              </ul>
            </div>
            <div className="text-right">
              <h3 className="text-lg font-bold">Меню</h3>
              <ul className="mt-4 space-y-3 text-sm text-white/90">
                <li>Цены</li>
                <li>Галерея</li>
                <li>FAQ</li>
                <li>Контакты</li>
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
