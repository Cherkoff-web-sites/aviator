import type { ReactNode } from 'react'

export type GalleryGradientSplitSectionProps = {
  title: string
  titleUppercase?: boolean
  paragraphs: string[]
  /** Слайдер слева на ПК, сверху на мобиле */
  media: ReactNode
}

/** Второй вариант блока галереи: радиальный градиент, слайдер слева, текст справа, светлая типографика. */
function GalleryGradientSplitSection({
  title,
  titleUppercase = false,
  paragraphs,
  media,
}: GalleryGradientSplitSectionProps) {
  return (
    <section className="bg-[#e9e9e9] py-10 min-[990px]:py-16">
      <div className="container-app">
        <div
          className="rounded-[40px] px-5 py-8 text-white min-[990px]:px-10 min-[990px]:py-10"
          style={{
            background: 'radial-gradient(98.31% 98.31% at 50% 50%, #0075FF 0%, #322E67 100%)',
          }}
        >
          <div className="flex flex-col gap-8 min-[990px]:flex-row min-[990px]:items-stretch min-[990px]:gap-12">
            <div className="min-w-0 flex-1">{media}</div>
            <div className="flex min-w-0 flex-1 flex-col justify-center">
              <h2
                className={`mb-4 text-[22px] font-bold leading-tight tracking-tight text-white min-[990px]:text-[28px] ${titleUppercase ? 'uppercase' : ''}`}
              >
                {title}
              </h2>
              <div className="flex flex-col gap-4 text-[15px] font-medium leading-relaxed text-white/95 min-[990px]:text-[17px]">
                {paragraphs.map((p, i) => (
                  <p key={i}>{p}</p>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default GalleryGradientSplitSection
