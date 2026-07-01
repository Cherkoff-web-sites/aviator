/** Иконки соцсетей и платёжная полоса — `public/assets/social/` */
export const SOCIAL_ASSETS = {
  instagram: '/assets/social/instagram.svg',
  max: '/assets/social/max.svg',
  vk: '/assets/social/vk.svg',
  viber: '/assets/social/viber.svg',
  whatsapp: '/assets/social/whatsapp.svg',
  telegram: '/assets/social/telegram.svg',
  payments: '/assets/social/payments.png',
} as const

/** Порядок как в подвале (десктоп). */
export const FOOTER_SOCIAL_ICONS: { src: string; label: string }[] = [
  { src: SOCIAL_ASSETS.instagram, label: 'Instagram' },
  { src: SOCIAL_ASSETS.max, label: 'Max' },
  { src: SOCIAL_ASSETS.whatsapp, label: 'WhatsApp' },
  { src: SOCIAL_ASSETS.viber, label: 'Viber' },
  { src: SOCIAL_ASSETS.telegram, label: 'Telegram' },
]

const SOCIAL_RECOLOR_TO_BRAND_BLUE =
  '[filter:brightness(0)_saturate(100%)_invert(13%)_sepia(95%)_saturate(3500%)_hue-rotate(198deg)_brightness(0.95)_contrast(1.02)]'

/**
 * Иконки соцсетей на светлом фоне (блок «Наши соцсети» на контактах).
 * Max — двухцветный SVG (белая подложка + тёмный знак); общий CSS `filter` на всё изображение
 * убивает контраст между слоями → визуально «пустой квадрат». Для Max фильтр не применяем.
 */
export function contactSocialIconImgClass(label: string): string {
  const base = 'h-8 w-8 shrink-0 object-contain min-[990px]:h-9 min-[990px]:w-9'
  if (label === 'Max') {
    return `${base} rounded-lg bg-white p-1 shadow-[0_1px_3px_rgba(0,45,98,0.12)] ring-1 ring-[#002D62]/10`
  }
  return `${base} ${SOCIAL_RECOLOR_TO_BRAND_BLUE}`
}
