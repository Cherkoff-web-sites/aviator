import { useEffect, useRef } from 'react'

/** Конструктор Яндекс.Карт (карта организации). Тёмный контейнер + фильтр для тёмного вида тайлов. */
const YANDEX_CONSTRUCTOR_SCRIPT_SRC =
  'https://api-maps.yandex.ru/services/constructor/1.0/js/?um=constructor%3A847b6ce87257aa7b137a8fb3c8092c969479b50352bfc5653d1b1ed5e7a72477&width=100%25&height=400&lang=ru_RU&scroll=true'

type Props = {
  className?: string
}

function YandexConstructorMap({ className = '' }: Props) {
  const hostRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const host = hostRef.current
    if (!host) return

    const script = document.createElement('script')
    script.type = 'text/javascript'
    script.charset = 'utf-8'
    script.async = true
    script.src = YANDEX_CONSTRUCTOR_SCRIPT_SRC

    host.appendChild(script)

    return () => {
      host.replaceChildren()
    }
  }, [])

  return (
    <div
      ref={hostRef}
      className={`ymap-dark w-full min-h-[400px] overflow-hidden rounded-[24px] bg-[#0b1220] ring-1 ring-white/10 min-[990px]:rounded-[28px] [&_iframe]:grayscale-[0.35] [&_iframe]:contrast-[1.05] [&_iframe]:brightness-[0.72] [&_ymaps]:!bg-[#0b1220] ${className}`.trim()}
      aria-label="Карта"
    />
  )
}

export default YandexConstructorMap
