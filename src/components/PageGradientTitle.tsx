export type PageGradientTitleProps = {
  /** Заголовок по центру блока (например «Галерея») */
  title: string
  className?: string
}

/** Первый блок доп. страниц: скруглённый прямоугольник с синим градиентом и крупным белым заголовком. */
function PageGradientTitle({ title, className = '' }: PageGradientTitleProps) {
  return (
    <div className={`container-app mt-8 min-[990px]:mt-14 ${className}`.trim()}>
      <div
        className="flex min-h-[140px] items-center justify-center rounded-[28px] px-6 py-10 min-[990px]:min-h-[200px] min-[990px]:rounded-[30px] min-[990px]:py-14"
        style={{
          background:
            'linear-gradient(180deg, #2B8CFF 0%, #0075FF 38%, #003d8f 72%, #00214d 100%)',
        }}
      >
        <h1 className="text-center text-[32px] font-bold leading-tight tracking-tight text-white min-[990px]:text-[52px] min-[990px]:leading-none">
          {title}
        </h1>
      </div>
    </div>
  )
}

export default PageGradientTitle
