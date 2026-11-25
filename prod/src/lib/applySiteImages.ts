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

function planTemplateForDuration(
  block: SimulatorPricingBlock,
  durationMin: number,
): SimulatorPricingPlan {
  const hit = block.plans.find((p) => durationMinFromPlanLabel(p.durationLabel) === durationMin)
  if (hit) return hit
  return {
    durationLabel: `${durationMin} минут`,
    priceDisplay: '0 BYN',
    ribbon: `${durationMin} мин полёта`,
    features: ['Инструктаж и сопровождение инструктора', 'Фото- и видеосъемка'],
  }
}

/**
 * Тарифы на сайте = строки из админки «Цены и акции» (минуты / цена / CTA).
 * Шаблоны текстов (ribbon, features) берутся из статики по длительности, если есть.
 * @param allowedDurations если задано (из «Списки для форм») — чужие минуты (напр. старые 15) не показываем.
 */
export function mergeFlightPricesIntoBlock(
  block: SimulatorPricingBlock,
  prices: ApiPriceRow[] | undefined,
  simulatorSlug: string,
  allowedDurations?: readonly number[] | null,
): SimulatorPricingBlock {
  if (!prices?.length) return block
  const allow =
    allowedDurations && allowedDurations.length > 0 ? new Set(allowedDurations) : null
  const rows = [
    ...prices.filter(
      (p) =>
        p.simulatorSlug === simulatorSlug &&
        Number(p.durationMin) > 0 &&
        Number(p.priceByn) >= 0 &&
        (!allow || allow.has(Number(p.durationMin))),
    ),
  ].sort((a, b) => a.durationMin - b.durationMin)
  if (rows.length === 0) return block

  const plans: SimulatorPricingPlan[] = rows.map((row) => {
    const tpl = planTemplateForDuration(block, row.durationMin)
    return {
      ...tpl,
      durationLabel: `${row.durationMin} минут`,
      priceDisplay: `${row.priceByn} BYN`,
      highlighted: Boolean(row.highlighted),
    }
  })

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
  const combo =
    prices.find((p) => p.simulatorSlug === 'combo' && p.durationMin === 60) ??
    prices.find((p) => p.simulatorSlug === 'combo')
  if (combo) {
    return {
      ...block,
      plans: block.plans.map((plan, i) => ({
        ...plan,
        priceDisplay: `${combo.priceByn} BYN`,
        highlighted: i === 0 ? Boolean(combo.highlighted ?? true) : false,
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
  const sliderImages: [string, string, string] = [
    resolveMediaUrl(set.photoSlider[0]),
    resolveMediaUrl(set.photoSlider[1]),
    resolveMediaUrl(set.photoSlider[2]),
  ]
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
