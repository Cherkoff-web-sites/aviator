import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useLayoutEffect, type RefObject } from 'react'

gsap.registerPlugin(ScrollTrigger)

const EASE = 'power3.out'
const START = 'top 84%'

const REVEAL_SELECTOR = [
  '[data-sim-hero] [data-sim-reveal-item]',
  '[data-sim-reveal] [data-sim-reveal-item]',
  '[data-sim-reveal] [data-sim-reveal-head]',
  '[data-sim-reveal] [data-sim-reveal-copy]',
  '[data-sim-reveal] [data-sim-reveal-media]',
  '[data-sim-reveal] [data-sim-reveal-bullet]',
].join(', ')

/**
 * Лёгкий ScrollTrigger-reveal для страниц тренажёров:
 * hero на входе, секции — fade/slide + stagger внутри.
 *
 * Важно: только fromTo → autoAlpha: 1. Нельзя сочетать CSS opacity:0 с gsap.from():
 * then «to» = текущие 0 и текст навсегда невидимый (место остаётся).
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
            { scale: 1.08 },
            { scale: 1, duration: 1.5, ease: 'power2.out' },
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
              ease: EASE,
              delay: 0.12,
              immediateRender: true,
              clearProps: 'transform',
            },
          )
        }
      }

      root.querySelectorAll<HTMLElement>('[data-sim-reveal]').forEach((section) => {
        const kind = section.dataset.simReveal || 'block'

        if (kind === 'split') {
          const text = section.querySelector<HTMLElement>('[data-sim-reveal-copy]')
          const mediaWrap = section.querySelector<HTMLElement>('[data-sim-reveal-media]')
          const bullets = section.querySelectorAll<HTMLElement>('[data-sim-reveal-bullet]')
          const fromLeft = section.dataset.simFrom !== 'right'

          const tl = gsap.timeline({
            scrollTrigger: {
              trigger: section,
              start: START,
              once: true,
            },
          })

          if (text) {
            tl.fromTo(
              text,
              { x: fromLeft ? -40 : 40, autoAlpha: 0 },
              { x: 0, autoAlpha: 1, duration: 0.8, ease: EASE },
              0,
            )
          }

          if (mediaWrap) {
            const img = mediaWrap.querySelector('img') ?? mediaWrap
            tl.fromTo(
              mediaWrap,
              { x: fromLeft ? 48 : -48, autoAlpha: 0 },
              { x: 0, autoAlpha: 1, duration: 0.9, ease: EASE },
              0.08,
            )
            if (img) {
              tl.fromTo(
                img,
                { scale: 1.08 },
                { scale: 1, duration: 1.1, ease: 'power2.out' },
                0.08,
              )
            }
          }

          if (bullets.length) {
            tl.fromTo(
              bullets,
              { x: -16, autoAlpha: 0 },
              {
                x: 0,
                autoAlpha: 1,
                duration: 0.45,
                stagger: 0.07,
                ease: 'power2.out',
                clearProps: 'transform',
              },
              0.35,
            )
          }

          return
        }

        if (kind === 'slider') {
          // Горизонтальный скролл ленты — в SimulatorPhotoSlider (pin + scrub).
          // Здесь только появление заголовка/описания.
          const head = section.querySelectorAll<HTMLElement>('[data-sim-reveal-item]')
          if (!head.length) return

          gsap.fromTo(
            head,
            { y: 28, autoAlpha: 0 },
            {
              y: 0,
              autoAlpha: 1,
              duration: 0.7,
              stagger: 0.1,
              ease: EASE,
              clearProps: 'transform',
              scrollTrigger: {
                trigger: section,
                start: START,
                once: true,
              },
            },
          )
          return
        }

        if (kind === 'cards') {
          const cards = section.querySelectorAll<HTMLElement>('[data-sim-reveal-item]')
          if (!cards.length) return

          gsap.fromTo(
            cards,
            { y: 40, autoAlpha: 0 },
            {
              y: 0,
              autoAlpha: 1,
              duration: 0.7,
              stagger: 0.12,
              ease: EASE,
              clearProps: 'transform',
              scrollTrigger: {
                trigger: section,
                start: START,
                once: true,
              },
            },
          )
          return
        }

        if (kind === 'pricing') {
          const head = section.querySelectorAll<HTMLElement>('[data-sim-reveal-head]')
          const cards = section.querySelectorAll<HTMLElement>('[data-sim-reveal-item]')

          const tl = gsap.timeline({
            scrollTrigger: {
              trigger: section,
              start: 'top 88%',
              once: true,
            },
          })

          if (head.length) {
            tl.fromTo(
              head,
              { y: 24, autoAlpha: 0 },
              {
                y: 0,
                autoAlpha: 1,
                duration: 0.65,
                stagger: 0.08,
                ease: EASE,
                clearProps: 'transform',
              },
            )
          }

          if (cards.length) {
            tl.fromTo(
              cards,
              { y: 48, autoAlpha: 0 },
              {
                y: 0,
                autoAlpha: 1,
                duration: 0.7,
                stagger: 0.1,
                ease: EASE,
                clearProps: 'transform',
              },
              0.12,
            )
          }

          return
        }

        // default block: title / copy / widget / cta
        const items = section.querySelectorAll<HTMLElement>('[data-sim-reveal-item]')
        if (!items.length) {
          gsap.fromTo(
            section,
            { y: 32, autoAlpha: 0 },
            {
              y: 0,
              autoAlpha: 1,
              duration: 0.75,
              ease: EASE,
              clearProps: 'transform',
              scrollTrigger: {
                trigger: section,
                start: START,
                once: true,
              },
            },
          )
          return
        }

        gsap.fromTo(
          items,
          { y: 32, autoAlpha: 0 },
          {
            y: 0,
            autoAlpha: 1,
            duration: 0.7,
            stagger: 0.1,
            ease: EASE,
            clearProps: 'transform',
            scrollTrigger: {
              trigger: section,
              start: START,
              once: true,
            },
          },
        )
      })
    }, root)

    return () => {
      ctx.revert()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- deps passed explicitly by page
  }, deps)
}
