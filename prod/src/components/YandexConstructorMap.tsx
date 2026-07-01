import { useEffect, useRef } from 'react'

/** Конструктор Яндекс.Карт (карта организации). */
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
      className={`w-full min-h-[400px] overflow-hidden rounded-[24px] bg-[#e8eaed] min-[990px]:rounded-[28px] ${className}`.trim()}
      aria-label="Карта"
    />
  )
}

export default YandexConstructorMap
