import * as React from 'react'
import { useLocation } from 'react-router-dom'

const STORAGE_KEY = 'aviator_cookie_ok'
const ENTER_MS = 500

/** Страницы, где плашка только после скролла с hero */
const SCROLL_GATED_PATHS: Record<string, string> = {
  '/': 'home-hero',
  '/simulators': 'simulators-hero',
}

export default function CookieConsent() {
  const { pathname } = useLocation()
  const [accepted, setAccepted] = React.useState(
    () => typeof window !== 'undefined' && !!localStorage.getItem(STORAGE_KEY),
  )
  const [pastHero, setPastHero] = React.useState(false)
  const [mounted, setMounted] = React.useState(false)
  const [entered, setEntered] = React.useState(false)

  const heroId = SCROLL_GATED_PATHS[pathname]
  const isScrollGated = Boolean(heroId)
  const isAdmin = pathname.startsWith('/admin')
  const shouldShow = !accepted && !isAdmin && (!isScrollGated || pastHero)

  React.useEffect(() => {
    if (!heroId || accepted) {
      setPastHero(false)
      return
    }

    const hero = document.getElementById(heroId)
    if (!hero) {
      setPastHero(true)
      return
    }

    const update = () => {
      setPastHero(hero.getBoundingClientRect().top < -24)
    }

    update()
    window.addEventListener('scroll', update, { passive: true })
    window.addEventListener('resize', update)
    return () => {
      window.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
    }
  }, [heroId, accepted, pathname])

  React.useEffect(() => {
    if (shouldShow) {
      setMounted(true)
      const id = window.setTimeout(() => setEntered(true), 30)
      return () => window.clearTimeout(id)
    }

    setEntered(false)
    const id = window.setTimeout(() => setMounted(false), ENTER_MS)
    return () => window.clearTimeout(id)
  }, [shouldShow])

  if (!mounted) return null

  return (
    <div
      className={[
        'fixed bottom-4 left-4 z-[200] w-[calc(100%-2rem)] max-w-[300px] rounded-xl border border-white/15 bg-[#12161a]/95 p-4 shadow-lg backdrop-blur-sm',
        'transition-[opacity,transform] duration-500 ease-out',
        entered ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0',
      ].join(' ')}
    >
      <div className="flex flex-col gap-3">
        <p className="text-sm leading-snug text-white/90">
          Мы используем cookie для корректной работы сайта и улучшения сервиса. Продолжая пользоваться
          сайтом, вы соглашаетесь с{' '}
          <a href="/faq" className="font-medium text-[#6ea8ff] underline-offset-2 hover:underline">
            политикой обработки данных
          </a>
          .
        </p>
        <button
          type="button"
          className="w-full rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
          onClick={() => {
            localStorage.setItem(STORAGE_KEY, '1')
            setAccepted(true)
          }}
        >
          Принять
        </button>
      </div>
    </div>
  )
}
