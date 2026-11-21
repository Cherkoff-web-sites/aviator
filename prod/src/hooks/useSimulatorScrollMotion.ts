import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useLayoutEffect, type RefObject } from 'react'

gsap.registerPlugin(ScrollTrigger)

const SCRUB = 0.65
const PIN_BG = '#002D62'
const DESKTOP_MQ = '(min-width: 990px)'
const MOBILE_MQ = '(max-width: 989px)'

const REVEAL_SELECTOR = [
  '[data-sim-hero] [data-sim-reveal-item]',
  '[data-sim-reveal] [data-sim-reveal-item]',
  '[data-sim-reveal] [data-sim-reveal-head]',
  '[data-sim-reveal] [data-sim-reveal-line]',
  '[data-sim-reveal] [data-sim-reveal-media]',
].join(', ')

function paintPinSpacer(self: ScrollTrigger, color = PIN_BG) {
  const spacer = self.pin?.parentElement
  if (spacer?.classList.contains('pin-spacer')) {
    spacer.style.backgroundColor = color
  }
}

function scrollSpan(vh: number) {
  return () => `+=${Math.round(window.innerHeight * vh)}`
}

function buildSplitTimeline(
  section: HTMLElement,
  scrollTrigger: ScrollTrigger.Vars,
) {
  const mediaWrap = section.querySelector<HTMLElement>('[data-sim-reveal-media]')
  const img = mediaWrap?.querySelector<HTMLElement>('img') ?? mediaWrap ?? null
  const lines = section.querySelectorAll<HTMLElement>('[data-sim-reveal-line]')
  const fromLeft = section.dataset.simFrom !== 'right'
  const lineCount = lines.length
  const zoomDur = 1
  const lineDur = 0.45
  const totalDur = zoomDur + Math.max(lineCount, 1) * lineDur + 0.25

  const tl = gsap.timeline({
    scrollTrigger,
    defaults: { ease: 'none' },
  })

  if (mediaWrap) {
    tl.fromTo(
      mediaWrap,
      { autoAlpha: 0, scale: 0.92 },
      { autoAlpha: 1, scale: 1, duration: zoomDur * 0.35 },
      0,
    )
  }

  if (img) {
    tl.fromTo(img, { scale: 1.38 }, { scale: 1, duration: zoomDur }, 0)
  }

  lines.forEach((line, i) => {
    const xFrom = fromLeft ? -36 : 36
    tl.fromTo(
      line,
      { x: xFrom, y: 28, autoAlpha: 0 },
      { x: 0, y: 0, autoAlpha: 1, duration: lineDur },
      zoomDur + i * lineDur,
    )
  })

  tl.to({}, { duration: 0.25 }, totalDur - 0.25)
  return tl
}

function buildCardsTimeline(
  cards: NodeListOf<HTMLElement>,
  scrollTrigger: ScrollTrigger.Vars,
) {
  const tl = gsap.timeline({
    scrollTrigger,
    defaults: { ease: 'none' },
  })
  cards.forEach((card, i) => {
    tl.fromTo(
      card,
      { y: 40, autoAlpha: 0, scale: 0.96 },
      { y: 0, autoAlpha: 1, scale: 1, duration: 0.5 },
      i * 0.28,
    )
  })
  return tl
}

/**
 * Scroll-driven motion for simulator pages:
 * image zooms with scroll, then text lines pull in one by one;
 * scrub reverses on scroll up. Desktop pins only split sections (not cards —
 * pin after the photo slider caused a ~1.5vh empty gap).
 */
export function useSimulatorScrollMotion(
  rootRef: RefObject<HTMLElement | null>,
  deps: unknown[] = [],
) {
  useLayoutEffect(() => {
    const root = rootRef.current
    if (!root) return

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return
    }

    const mm = gsap.matchMedia()

    const ctx = gsap.context(() => {
      const revealNodes = root.querySelectorAll<HTMLElement>(REVEAL_SELECTOR)
      if (revealNodes.length) {
        gsap.set(revealNodes, { autoAlpha: 0 })
      }

      const hero = root.querySelector<HTMLElement>('[data-sim-hero]')
      if (hero) {
        const media = hero.querySelector<HTMLElement>('[data-sim-hero-media]')
        const items = hero.querySelectorAll<HTMLElement>('[data-sim-reveal-item]')

        if (media) {
          gsap.fromTo(
            media,
            { scale: 1.12 },
            {
              scale: 1,
              ease: 'none',
              scrollTrigger: {
                trigger: hero,
                start: 'top top',
                end: 'bottom top',
                scrub: SCRUB,
              },
            },
          )
        }

        if (items.length) {
          gsap.fromTo(
            items,
            { y: 36, autoAlpha: 0 },
            {
              y: 0,
              autoAlpha: 1,
              duration: 0.85,
              stagger: 0.12,
              ease: 'power3.out',
              delay: 0.08,
              immediateRender: true,
            },
          )
        }
      }

      const sections = Array.from(
        root.querySelectorAll<HTMLElement>('[data-sim-reveal]'),
      )

      mm.add(DESKTOP_MQ, () => {
        sections.forEach((section) => {
          const kind = section.dataset.simReveal || 'block'
          if (kind === 'split') {
            const lineCount = section.querySelectorAll('[data-sim-reveal-line]').length
            const vh = Math.min(2.2, 1.05 + lineCount * 0.2)
            buildSplitTimeline(section, {
              trigger: section,
              start: 'top top',
              end: scrollSpan(vh),
              pin: true,
              pinSpacing: true,
              scrub: SCRUB,
              anticipatePin: 1,
              invalidateOnRefresh: true,
              onRefresh: (self) => paintPinSpacer(self),
              onEnter: (self) => paintPinSpacer(self),
            })
          }
          if (kind === 'cards') {
            const cards = section.querySelectorAll<HTMLElement>('[data-sim-reveal-item]')
            if (!cards.length) return
            // Без pin: иначе после слайдера появляется «пропасть» ~1.5 экрана
            buildCardsTimeline(cards, {
              trigger: section,
              start: 'top 85%',
              end: 'top 40%',
              scrub: SCRUB,
            })
          }
        })
      })

      mm.add(MOBILE_MQ, () => {
        sections.forEach((section) => {
          const kind = section.dataset.simReveal || 'block'
          if (kind === 'split') {
            // Короткий диапазон: картинка успевает появиться, пока верх секции в кадре
            // (при end: bottom 20% на высоких моб-секциях media часто оставалась invisible).
            buildSplitTimeline(section, {
              trigger: section,
              start: 'top 92%',
              end: 'top 42%',
              scrub: 0.45,
            })
          }
          if (kind === 'cards') {
            const cards = section.querySelectorAll<HTMLElement>('[data-sim-reveal-item]')
            if (!cards.length) return
            buildCardsTimeline(cards, {
              trigger: section,
              start: 'top 90%',
              end: 'top 45%',
              scrub: 0.45,
            })
          }
        })
      })

      sections.forEach((section) => {
        const kind = section.dataset.simReveal || 'block'

        if (kind === 'split' || kind === 'cards') return

        if (kind === 'slider') {
          const head = section.querySelectorAll<HTMLElement>('[data-sim-reveal-item]')
          if (!head.length) return

          gsap.fromTo(
            head,
            { y: 32, autoAlpha: 0 },
            {
              y: 0,
              autoAlpha: 1,
              ease: 'none',
              stagger: 0.18,
              scrollTrigger: {
                trigger: section,
                start: 'top 78%',
                end: 'top 35%',
                scrub: SCRUB,
              },
            },
          )
          return
        }

        if (kind === 'pricing') {
          const head = section.querySelectorAll<HTMLElement>('[data-sim-reveal-head]')
          const cards = section.querySelectorAll<HTMLElement>('[data-sim-reveal-item]')
          if (!head.length && !cards.length) return

          const tl = gsap.timeline({
            scrollTrigger: {
              trigger: section,
              start: 'top 80%',
              end: 'top 18%',
              scrub: SCRUB,
            },
            defaults: { ease: 'none' },
          })

          if (head.length) {
            tl.fromTo(
              head,
              { y: 28, autoAlpha: 0 },
              { y: 0, autoAlpha: 1, duration: 0.5, stagger: 0.12 },
              0,
            )
          }

          if (cards.length) {
            tl.fromTo(
              cards,
              { y: 52, autoAlpha: 0 },
              { y: 0, autoAlpha: 1, duration: 0.55, stagger: 0.14 },
              head.length ? 0.35 : 0,
            )
          }
          return
        }

        const items = section.querySelectorAll<HTMLElement>('[data-sim-reveal-item]')
        if (!items.length) {
          gsap.fromTo(
            section,
            { y: 36, autoAlpha: 0 },
            {
              y: 0,
              autoAlpha: 1,
              ease: 'none',
              scrollTrigger: {
                trigger: section,
                start: 'top 85%',
                end: 'top 40%',
                scrub: SCRUB,
              },
            },
          )
          return
        }

        const tl = gsap.timeline({
          scrollTrigger: {
            trigger: section,
            start: 'top 82%',
            end: 'top 28%',
            scrub: SCRUB,
          },
          defaults: { ease: 'none' },
        })

        items.forEach((item, i) => {
          tl.fromTo(
            item,
            { y: 36, autoAlpha: 0 },
            { y: 0, autoAlpha: 1, duration: 0.45 },
            i * 0.28,
          )
        })
      })
    }, root)

    const raf = requestAnimationFrame(() => ScrollTrigger.refresh())
    const t = window.setTimeout(() => ScrollTrigger.refresh(), 160)

    return () => {
      cancelAnimationFrame(raf)
      window.clearTimeout(t)
      mm.revert()
      ctx.revert()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- deps passed explicitly by page
  }, deps)
}
