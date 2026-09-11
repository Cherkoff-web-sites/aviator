import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useEffect, type RefObject } from 'react'

gsap.registerPlugin(ScrollTrigger)

const EASE = 'power3.out'
const START = 'top 84%'

/**
 * Лёгкий ScrollTrigger-reveal для страниц тренажёров:
 * hero на входе, секции — fade/slide + stagger внутри.
 */
export function useSimulatorScrollMotion(
  rootRef: RefObject<HTMLElement | null>,
  deps: unknown[] = [],
) {
  useEffect(() => {
    const root = rootRef.current
    if (!root) return

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return
    }

    const ctx = gsap.context(() => {
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
          gsap.from(items, {
            y: 36,
            autoAlpha: 0,
            duration: 0.85,
            stagger: 0.12,
            ease: EASE,
            delay: 0.12,
            clearProps: 'transform',
          })
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
            tl.from(
              text,
              {
                x: fromLeft ? -40 : 40,
                autoAlpha: 0,
                duration: 0.8,
                ease: EASE,
              },
              0,
            )
          }

          if (mediaWrap) {
            const img = mediaWrap.querySelector('img') ?? mediaWrap
            tl.from(
              mediaWrap,
              {
                x: fromLeft ? 48 : -48,
                autoAlpha: 0,
                duration: 0.9,
                ease: EASE,
              },
              0.08,
            )
            if (img) {
              tl.from(
                img,
                {
                  scale: 1.08,
                  duration: 1.1,
                  ease: 'power2.out',
                },
                0.08,
              )
            }
          }

          if (bullets.length) {
            tl.from(
              bullets,
              {
                x: -16,
                autoAlpha: 0,
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
          const head = section.querySelectorAll<HTMLElement>('[data-sim-reveal-item]')
          const slides = section.querySelectorAll<HTMLElement>('.swiper-slide img')

          const tl = gsap.timeline({
            scrollTrigger: {
              trigger: section,
              start: START,
              once: true,
            },
          })

          if (head.length) {
            tl.from(head, {
              y: 28,
              autoAlpha: 0,
              duration: 0.7,
              stagger: 0.1,
              ease: EASE,
              clearProps: 'transform',
            })
          }

          if (slides.length) {
            tl.from(
              slides,
              {
                x: 48,
                autoAlpha: 0,
                duration: 0.75,
                stagger: 0.1,
                ease: EASE,
                clearProps: 'transform',
              },
              0.15,
            )
          }

          return
        }

        if (kind === 'cards') {
          const cards = section.querySelectorAll<HTMLElement>('[data-sim-reveal-item]')
          if (!cards.length) return

          gsap.from(cards, {
            scrollTrigger: {
              trigger: section,
              start: START,
              once: true,
            },
            y: 40,
            autoAlpha: 0,
            duration: 0.7,
            stagger: 0.12,
            ease: EASE,
            clearProps: 'transform',
          })
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
            tl.from(head, {
              y: 24,
              autoAlpha: 0,
              duration: 0.65,
              stagger: 0.08,
              ease: EASE,
              clearProps: 'transform',
            })
          }

          if (cards.length) {
            tl.from(
              cards,
              {
                y: 48,
                autoAlpha: 0,
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
          gsap.from(section, {
            scrollTrigger: {
              trigger: section,
              start: START,
              once: true,
            },
            y: 32,
            autoAlpha: 0,
            duration: 0.75,
            ease: EASE,
            clearProps: 'transform',
          })
          return
        }

        gsap.from(items, {
          scrollTrigger: {
            trigger: section,
            start: START,
            once: true,
          },
          y: 32,
          autoAlpha: 0,
          duration: 0.7,
          stagger: 0.1,
          ease: EASE,
          clearProps: 'transform',
        })
      })
    }, root)

    return () => {
      ctx.revert()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- deps passed explicitly by page
  }, deps)
}
