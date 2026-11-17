import {
  FOOTER_SOCIAL_ICONS,
  HEADER_MOBILE_SOCIAL_ICONS,
  type SocialIconItem,
} from '@/data/socialAssets'

/** Подставляет URL из настроек; пустое значение в сторе = дефолт из ассетов. */
export function resolveSocialLinks(
  icons: SocialIconItem[],
  fromStore?: Record<string, string> | null,
): SocialIconItem[] {
  const map = fromStore ?? {}
  return icons
    .map((s) => {
      const custom = map[s.label]?.trim()
      return custom ? { ...s, href: custom } : s
    })
    .filter((s) => Boolean(s.href))
}

export function resolveFooterSocialLinks(fromStore?: Record<string, string> | null) {
  return resolveSocialLinks(FOOTER_SOCIAL_ICONS, fromStore)
}

export function resolveHeaderSocialLinks(fromStore?: Record<string, string> | null) {
  return resolveSocialLinks(HEADER_MOBILE_SOCIAL_ICONS, fromStore)
}
