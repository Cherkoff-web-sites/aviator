/** Зеркало server `SiteImages` — дефолты совпадают с hardcoded путями сайта. */

export type GallerySlideImage = {
  src: string
  alt: string
  badge360OnThumb?: boolean
  panoramaSrc?: string
}

export type SimulatorImageSet = {
  hero: string
  sections: [string, string, string]
  photoSlider: [string, string, string]
  pricingBackground: string
}

export type SiteImages = {
  heroes: {
    landing: string
    homeMi2: string
    homeBoeing: string
    homeSchool: string
  }
  simulators: {
    'boeing-737': SimulatorImageSet
    'mi-2': SimulatorImageSet
    'avia-school': SimulatorImageSet
  }
  gallery: {
    'boeing-737': GallerySlideImage[]
    'mi-2': GallerySlideImage[]
  }
  comboPricingBackground: string
}

export const DEFAULT_SITE_IMAGES: SiteImages = {
  heroes: {
    landing: '/assets/hero/boeing_737.webp',
    homeMi2: '/assets/hero/mi_2.webp',
    homeBoeing: '/assets/hero/boeing_737.webp',
    homeSchool: '/assets/hero/avia_school.webp',
  },
  simulators: {
    'boeing-737': {
      hero: '/assets/simulator/boeing_737.webp',
      sections: [
        '/assets/simulator/sm_1.webp',
        '/assets/simulator/sm_2.webp',
        '/assets/simulator/sm_3.webp',
      ],
      photoSlider: [
        '/assets/simulator/photo_sm_1.webp',
        '/assets/simulator/photo_sm_2.webp',
        '/assets/simulator/photo_sm_3.webp',
      ],
      pricingBackground: '/assets/simulator/sm_price_1.webp',
    },
    'mi-2': {
      hero: '/assets/simulator/mi_2.webp',
      sections: [
        '/assets/simulator/sm_4.webp',
        '/assets/simulator/sm_5.webp',
        '/assets/simulator/sm_6.webp',
      ],
      photoSlider: [
        '/assets/simulator/photo_sm_mi2_1.png',
        '/assets/simulator/photo_sm_mi2_2.png',
        '/assets/simulator/photo_sm_mi2_3.png',
      ],
      pricingBackground: '/assets/simulator/sm_price_2.webp',
    },
    'avia-school': {
      hero: '/assets/simulator/school.webp',
      sections: [
        '/assets/simulator/sm_1.webp',
        '/assets/simulator/sm_2.webp',
        '/assets/simulator/sm_3.webp',
      ],
      photoSlider: [
        '/assets/simulator/photo_sm_1.webp',
        '/assets/simulator/photo_sm_2.webp',
        '/assets/simulator/photo_sm_3.webp',
      ],
      pricingBackground: '/assets/simulator/school.webp',
    },
  },
  gallery: {
    'boeing-737': [
      {
        src: '/assets/simulator/sm_1.webp',
        alt: 'Кабина Boeing 737NG — обзор 360°',
        badge360OnThumb: true,
        panoramaSrc: '/assets/gallery/360/boeing-737.jpeg',
      },
      { src: '/assets/simulator/sm_2.webp', alt: 'Панель приборов Boeing 737NG' },
      { src: '/assets/simulator/sm_3.webp', alt: 'Boeing 737NG, вид из кабины' },
      { src: '/assets/simulator/boeing_737.webp', alt: 'Авиатренажёр Boeing 737NG' },
    ],
    'mi-2': [
      {
        src: '/assets/simulator/mi_2.webp',
        alt: 'Авиатренажёр Ми-2 — обзор 360°',
        badge360OnThumb: true,
        panoramaSrc: '/assets/gallery/360/mi-2.jpeg',
      },
      { src: '/assets/simulator/sm_4.webp', alt: 'Тренажёр Ми-2' },
      { src: '/assets/simulator/sm_5.webp', alt: 'Кабина вертолёта Ми-2' },
      { src: '/assets/simulator/sm_6.webp', alt: 'Ми-2, приборная панель' },
    ],
  },
  comboPricingBackground: '/assets/simulator/sm_price_2.webp',
}

/** `/uploads/...` → абсолютный URL API; остальное без изменений. */
export function resolveMediaUrl(url: string): string {
  if (!url) return url
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
    return url
  }
  if (url.startsWith('/uploads/')) {
    const base = (import.meta.env.VITE_API_URL as string | undefined) ?? ''
    return `${base.replace(/\/$/, '')}${url}`
  }
  return url
}
