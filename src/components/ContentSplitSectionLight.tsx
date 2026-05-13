import type { ReactNode } from 'react'

export type ContentSplitVariantLight = 'text-left' | 'image-left'

export type ContentSplitSectionLightProps = {
  variant: ContentSplitVariantLight
  title: string
  /** Заголовок капсом как на макете (например BOEING 737NG) */
  titleUppercase?: boolean
  paragraphs: string[]
  /** Правая/левая колонка с медиа — обычно `<GalleryMediaPanel />` */
  media: ReactNode
}

function ContentSplitSectionLight({
  variant,
  title,
  titleUppercase = true,
  paragraphs,
  media,
}: ContentSplitSectionLightProps) {
  const isImageLeft = variant === 'image-left'

  return (
    <section className="bg-[#e9e9e9] py-10 min-[990px]:py-16">
      <div className="container-app">
        <div
          className={[
            'flex flex-col gap-8 min-[990px]:flex-row min-[990px]:items-stretch min-[990px]:gap-12',
            isImageLeft ? 'flex-col-reverse min-[990px]:flex-row-reverse' : '',
          ].join(' ')}
        >
          <div className="flex min-w-0 flex-1 flex-col justify-center">
            <h2
              className={`mb-4 text-[22px] font-bold leading-tight tracking-tight text-[#002D62] min-[990px]:text-[28px] ${titleUppercase ? 'uppercase' : ''}`}
            >
              {title}
            </h2>
            <div className="flex flex-col gap-4 text-[15px] font-medium leading-relaxed text-[#5c6570] min-[990px]:text-[17px]">
              {paragraphs.map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>
          </div>
          {media}
        </div>
      </div>
    </section>
  )
}

export default ContentSplitSectionLight
