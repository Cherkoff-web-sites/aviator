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
        className="flex min-h-[140px] items-center justify-center rounded-[40px] px-6 py-10 min-[990px]:min-h-[280px] min-[990px]:py-16"
        style={{
          background: 'radial-gradient(98.31% 98.31% at 50% 50%, #0075FF 0%, #322E67 100%)',
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
