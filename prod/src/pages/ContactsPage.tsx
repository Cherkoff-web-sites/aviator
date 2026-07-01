import SiteFooter from '../components/SiteFooter'
import SiteHeader from '../components/SiteHeader'
import YandexConstructorMap from '../components/YandexConstructorMap'
import { FOOTER_SOCIAL_ICONS, contactSocialIconImgClass } from '../data/socialAssets'

const CONTACT_ICONS = {
  pin: '/assets/icons/icon_pin.svg',
  phone: '/assets/icons/icon_phone.svg',
  clock: '/assets/icons/icon_clock.svg',
  mail: '/assets/icons/icon_mail.svg',
} as const

const CONTACT_ICON_IMG_CLASS =
  'h-6 w-6 shrink-0 object-contain min-[990px]:h-7 min-[990px]:w-7'

function ContactsPage() {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <SiteHeader />
      <main className="flex min-h-0 flex-1 flex-col bg-[#e9e9e9] pb-14 pt-[96px] text-[#002D62] min-[990px]:pb-20 min-[990px]:pt-[112px]">
        <div className="container-app flex flex-col gap-6 min-[990px]:gap-8">
          <h1 className="text-[26px] font-bold leading-tight tracking-tight min-[990px]:text-[36px] min-[990px]:leading-[1.15]">
            Удобная локация в центре города
          </h1>

          <div className="flex flex-col gap-8 min-[990px]:grid min-[990px]:grid-cols-2 min-[990px]:items-start min-[990px]:gap-12">
            <div className="flex min-w-0 flex-col gap-6 min-[990px]:col-start-1 min-[990px]:row-start-1">
              <p className="text-[15px] font-medium leading-relaxed min-[990px]:text-[17px]">
                Наши авиатренажеры расположены в центре Минска, что позволяет с комфортом добраться из любой точки
                города, не затрачивая лишних усилий
              </p>
              <ul className="m-0 flex list-none flex-col gap-5 p-0">
                <li className="flex gap-3">
                  <img src={CONTACT_ICONS.pin} alt="" className={CONTACT_ICON_IMG_CLASS} aria-hidden />
                  <span className="pt-0.5 text-[15px] font-medium leading-snug min-[990px]:text-[16px]">
                    г. Минск, ул. Игоря Лученка, д. 26 м. «Аэродромная»
                  </span>
                </li>
                <li className="flex gap-3">
                  <img src={CONTACT_ICONS.phone} alt="" className={CONTACT_ICON_IMG_CLASS} aria-hidden />
                  <a
                    href="tel:+375297131001"
                    className="pt-0.5 text-[15px] font-medium underline decoration-[#002D62]/40 underline-offset-2 min-[990px]:text-[16px]"
                  >
                    +375 29 713 10 01
                  </a>
                </li>
                <li className="flex gap-3">
                  <img src={CONTACT_ICONS.clock} alt="" className={CONTACT_ICON_IMG_CLASS} aria-hidden />
                  <span className="pt-0.5 text-[15px] font-medium min-[990px]:text-[16px]">
                    С 12.00 до 22.00 ежедневно
                  </span>
                </li>
                <li className="flex gap-3">
                  <img src={CONTACT_ICONS.mail} alt="" className={CONTACT_ICON_IMG_CLASS} aria-hidden />
                  <a
                    href="mailto:aviator@737.by"
                    className="pt-0.5 text-[15px] font-medium underline decoration-[#002D62]/40 underline-offset-2 min-[990px]:text-[16px]"
                  >
                    aviator@737.by
                  </a>
                </li>
              </ul>
            </div>

            <YandexConstructorMap className="shrink-0 min-[990px]:col-start-2 min-[990px]:row-start-1 min-[990px]:row-span-2 min-[990px]:min-h-[min(100%,520px)]" />

            <div className="flex flex-col gap-4 min-[990px]:col-start-1 min-[990px]:row-start-2">
              <h2 className="text-[18px] font-bold leading-tight min-[990px]:text-[20px]">Наши соцсети</h2>
              <div className="flex flex-wrap items-center gap-4">
                {FOOTER_SOCIAL_ICONS.map((s) => (
                  <a
                    key={s.label}
                    href="#"
                    aria-label={s.label}
                    className="inline-flex items-center justify-center rounded-lg transition-opacity hover:opacity-80"
                  >
                    <img src={s.src} alt="" aria-hidden className={contactSocialIconImgClass(s.label)} />
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  )
}

export default ContactsPage
