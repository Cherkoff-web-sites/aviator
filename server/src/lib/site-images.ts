import type { GallerySlideImage, SimulatorImageSet, SiteImages } from '../types.js'

export function defaultSiteImages(): SiteImages {
  return {
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
}

function asString(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback
}

function asTriple(value: unknown, fallback: [string, string, string]): [string, string, string] {
  if (!Array.isArray(value) || value.length < 3) return fallback
  return [
    asString(value[0], fallback[0]),
    asString(value[1], fallback[1]),
    asString(value[2], fallback[2]),
  ]
}

function asSimulatorSet(value: unknown, fallback: SimulatorImageSet): SimulatorImageSet {
  const raw = (value && typeof value === 'object' ? value : {}) as Partial<SimulatorImageSet>
  return {
    hero: asString(raw.hero, fallback.hero),
    sections: asTriple(raw.sections, fallback.sections),
    photoSlider: asTriple(raw.photoSlider, fallback.photoSlider),
    pricingBackground: asString(raw.pricingBackground, fallback.pricingBackground),
  }
}

function asGallerySlides(value: unknown, fallback: GallerySlideImage[]): GallerySlideImage[] {
  if (!Array.isArray(value) || value.length === 0) return fallback.map((s) => ({ ...s }))
  const slides: GallerySlideImage[] = []
  for (let index = 0; index < value.length; index++) {
    const item = value[index]
    const fb = fallback[index] ?? fallback[0] ?? { src: '', alt: '' }
    if (typeof item === 'string') {
      if (item.trim()) slides.push({ src: item.trim(), alt: fb.alt ?? '' })
      continue
    }
    if (!item || typeof item !== 'object') continue
    const row = item as Partial<GallerySlideImage>
    const src = asString(row.src, fb.src)
    if (!src) continue
    const slide: GallerySlideImage = {
      src,
      alt: asString(row.alt, fb.alt ?? ''),
    }
    if (row.badge360OnThumb) {
      slide.badge360OnThumb = true
      if (typeof row.panoramaSrc === 'string' && row.panoramaSrc.trim()) {
        slide.panoramaSrc = row.panoramaSrc.trim()
      }
    }
    slides.push(slide)
  }
  return slides.length > 0 ? slides : fallback.map((s) => ({ ...s }))
}

/** Гарантирует полную структуру siteImages с дефолтами. */
export function normalizeSiteImages(raw: unknown): SiteImages {
  const defaults = defaultSiteImages()
  const input = (raw && typeof raw === 'object' ? raw : {}) as Partial<SiteImages>
  const heroesIn = (input.heroes && typeof input.heroes === 'object' ? input.heroes : {}) as Partial<
    SiteImages['heroes']
  >
  const simsIn = (input.simulators && typeof input.simulators === 'object'
    ? input.simulators
    : {}) as Partial<SiteImages['simulators']>
  const galleryIn = (input.gallery && typeof input.gallery === 'object' ? input.gallery : {}) as Partial<
    SiteImages['gallery']
  >

  return {
    heroes: {
      landing: asString(heroesIn.landing, defaults.heroes.landing),
      homeMi2: asString(heroesIn.homeMi2, defaults.heroes.homeMi2),
      homeBoeing: asString(heroesIn.homeBoeing, defaults.heroes.homeBoeing),
      homeSchool: asString(heroesIn.homeSchool, defaults.heroes.homeSchool),
    },
    simulators: {
      'boeing-737': asSimulatorSet(simsIn['boeing-737'], defaults.simulators['boeing-737']),
      'mi-2': asSimulatorSet(simsIn['mi-2'], defaults.simulators['mi-2']),
      'avia-school': asSimulatorSet(simsIn['avia-school'], defaults.simulators['avia-school']),
    },
    gallery: {
      'boeing-737': asGallerySlides(galleryIn['boeing-737'], defaults.gallery['boeing-737']),
      'mi-2': asGallerySlides(galleryIn['mi-2'], defaults.gallery['mi-2']),
    },
    comboPricingBackground: asString(input.comboPricingBackground, defaults.comboPricingBackground),
  }
}
