import { useLayoutEffect } from 'react'
import { useLocation } from 'react-router-dom'

/** Прокрутка в начало окна при смене маршрута (в т.ч. при переходе по ссылкам внутри приложения). */
function ScrollToTop() {
  const { pathname } = useLocation()

  useLayoutEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  return null
}

export default ScrollToTop
