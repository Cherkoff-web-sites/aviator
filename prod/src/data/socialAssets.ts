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

export type SocialIconItem = {
  src: string
  label: string
  /** Пока нет реальных аккаунтов — главные сайты сервисов */
  href: string
}

/** Порядок как в подвале (десктоп). */
export const FOOTER_SOCIAL_ICONS: SocialIconItem[] = [
  { src: SOCIAL_ASSETS.instagram, label: 'Instagram', href: 'https://www.instagram.com/' },
  { src: SOCIAL_ASSETS.max, label: 'Max', href: 'https://max.ru/' },
  { src: SOCIAL_ASSETS.whatsapp, label: 'WhatsApp', href: 'https://www.whatsapp.com/' },
  { src: SOCIAL_ASSETS.viber, label: 'Viber', href: 'https://www.viber.com/' },
  { src: SOCIAL_ASSETS.telegram, label: 'Telegram', href: 'https://telegram.org/' },
]

/** Соцсети в мобильном меню шапки */
export const HEADER_MOBILE_SOCIAL_ICONS: SocialIconItem[] = [
  { src: SOCIAL_ASSETS.instagram, label: 'Instagram', href: 'https://www.instagram.com/' },
  { src: SOCIAL_ASSETS.vk, label: 'VK', href: 'https://vk.com/' },
  { src: SOCIAL_ASSETS.whatsapp, label: 'WhatsApp', href: 'https://www.whatsapp.com/' },
  { src: SOCIAL_ASSETS.telegram, label: 'Telegram', href: 'https://telegram.org/' },
]

/**
 * Иконки соцсетей на тёмном фоне (блок «Наши соцсети» на контактах).
 * Max — двухцветный SVG (белая подложка + тёмный знак); общий CSS `filter` на всё изображение
 * убивает контраст между слоями → визуально «пустой квадрат». Для Max фильтр не применяем.
 */
export function contactSocialIconImgClass(label: string): string {
  const base = 'h-8 w-8 shrink-0 object-contain min-[990px]:h-9 min-[990px]:w-9'
  if (label === 'Max') {
    return `${base} rounded-lg bg-white p-1 shadow-[0_1px_3px_rgba(0,0,0,0.35)] ring-1 ring-white/15`
  }
  return `${base} brightness-0 invert`
}
