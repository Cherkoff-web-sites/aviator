import type { Simulator, SimulatorPricingBlock, SimulatorPricingPlan } from '@/data/simulators'
import { COMBO_PRICING_BLOCK, getSimulatorBySlug, simulators } from '@/data/simulators'
import {
  DEFAULT_SITE_IMAGES,
  resolveMediaUrl,
  type SiteImages,
  type SimulatorImageSet,
} from '@/data/siteImages'
import type { ApiPriceRow } from '@/lib/api'

function durationMinFromPlanLabel(label: string): number | null {
  const m = label.match(/(\d+)\s*минут/)
  if (!m) return null
  const n = Number(m[1])
  return Number.isFinite(n) ? n : null
}

/** Подставляет цены и CTA (highlighted) из админки в блок тарифов на сайте. */
export function mergeFlightPricesIntoBlock(
  block: SimulatorPricingBlock,
  prices: ApiPriceRow[] | undefined,
  simulatorSlug: string,
): SimulatorPricingBlock {
  if (!prices?.length) return block
  const rows = prices.filter((p) => p.simulatorSlug === simulatorSlug)
  if (rows.length === 0) return block

  const plans: SimulatorPricingPlan[] = block.plans.map((plan) => {
    const dur = durationMinFromPlanLabel(plan.durationLabel)
    if (dur == null) return { ...plan, highlighted: false }
    const row = rows.find((r) => r.durationMin === dur)
    if (!row) return { ...plan, highlighted: false }
    return {
      ...plan,
      priceDisplay: `${row.priceByn} BYN`,
      highlighted: Boolean(row.highlighted),
    }
  })

  // Если в API никто не отмечен CTA — оставляем первый как запасной для мульти-тарифов
  if (plans.length > 1 && !plans.some((p) => p.highlighted)) {
    const fallback = rows.find((r) => r.highlighted)
    if (fallback) {
      const idx = plans.findIndex(
        (p) => durationMinFromPlanLabel(p.durationLabel) === fallback.durationMin,
      )
      if (idx >= 0) plans[idx] = { ...plans[idx], highlighted: true }
    } else {
      plans[0] = { ...plans[0], highlighted: true }
    }
  }

  return { ...block, plans }
}

export function mergeComboPricesIntoBlock(
  block: SimulatorPricingBlock,
  prices: ApiPriceRow[] | undefined,
): SimulatorPricingBlock {
  if (!prices?.length) return block
  const combo = prices.find((p) => p.simulatorSlug === 'combo')
  if (combo) {
    return {
      ...block,
      plans: block.plans.map((plan, i) => ({
        ...plan,
        priceDisplay: `${combo.priceByn} BYN`,
        highlighted: i === 0 ? Boolean(combo.highlighted) : false,
      })),
    }
  }
  const plane = prices.find((p) => p.simulatorSlug === 'boeing-737' && p.durationMin === 30)
  const heli = prices.find((p) => p.simulatorSlug === 'mi-2' && p.durationMin === 30)
  if (!plane || !heli) return block
  const sum = plane.priceByn + heli.priceByn
  return {
    ...block,
    plans: block.plans.map((plan) => ({
      ...plan,
      priceDisplay: `${sum} BYN`,
    })),
  }
}

function applySimImages(sim: Simulator, set: SimulatorImageSet): Simulator {
  const sections = sim.sections.map((section, i) => ({
    ...section,
    image: resolveMediaUrl(set.sections[i] ?? section.image),
  }))
  const sliderImages = set.photoSlider.map((src) => resolveMediaUrl(src))
  return {
    ...sim,
    image: resolveMediaUrl(set.hero),
    sections,
    photoSlider: {
      ...sim.photoSlider,
      images: sliderImages,
    },
    pricingBlock: {
      ...sim.pricingBlock,
      backgroundImage: resolveMediaUrl(set.pricingBackground),
    },
  }
}

export function applySiteImagesToSimulator(
  slug: string | undefined,
  images: SiteImages = DEFAULT_SITE_IMAGES,
): Simulator | undefined {
  const base = getSimulatorBySlug(slug)
  if (!base) return undefined
  const set = images.simulators[slug as keyof SiteImages['simulators']]
  if (!set) return base
  return applySimImages(base, set)
}

export function applySiteImagesToAll(images: SiteImages = DEFAULT_SITE_IMAGES): Simulator[] {
  return simulators.map((sim) => {
    const set = images.simulators[sim.slug as keyof SiteImages['simulators']]
    return set ? applySimImages(sim, set) : sim
  })
}

export function applyComboPricingBlock(images: SiteImages = DEFAULT_SITE_IMAGES): SimulatorPricingBlock {
  return {
    ...COMBO_PRICING_BLOCK,
    backgroundImage: resolveMediaUrl(images.comboPricingBackground),
  }
}

export function homeHeroImageForSlug(slug: string, images: SiteImages): string {
  const map: Record<string, string> = {
    'mi-2': images.heroes.homeMi2,
    'boeing-737': images.heroes.homeBoeing,
    'avia-school': images.heroes.homeSchool,
  }
  return resolveMediaUrl(map[slug] ?? DEFAULT_SITE_IMAGES.heroes.homeBoeing)
}
