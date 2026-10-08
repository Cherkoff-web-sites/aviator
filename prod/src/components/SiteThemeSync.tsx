import { useLayoutEffect } from 'react'
import { useLocation } from 'react-router-dom'

/**
 * Тёмная тема публичного сайта (`html.public-site`) vs светлая тема админки.
 * Класс вешается на <html>, чтобы body и CSS-переменные shadcn не ломали /admin.
 */
function SiteThemeSync() {
  const { pathname } = useLocation()

  useLayoutEffect(() => {
    const isPublic = !pathname.startsWith('/admin')
    document.documentElement.classList.toggle('public-site', isPublic)
  }, [pathname])

  return null
}

export default SiteThemeSync
