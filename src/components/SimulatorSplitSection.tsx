import type { SimulatorSplitVariant } from '../data/simulators'

const OK_MARKER_SRC = '/assets/icons/ok.svg'

export type SimulatorSplitSectionProps = {
  variant: SimulatorSplitVariant
  /** SVG над заголовком, 65×65 (путь из public, например /assets/icons/...) */
  iconSrc?: string
  title: string
  paragraphs: string[]
  /** Опциональный маркированный список (маркер — ok.svg 20×20) */
  bulletPoints?: string[]
  imageSrc: string
  imageAlt?: string
}

function SimulatorSplitSection({
  variant,
  iconSrc,
  title,
  paragraphs,
  bulletPoints,
  imageSrc,
  imageAlt = '',
}: SimulatorSplitSectionProps) {
  const isImageLeft = variant === 'image-left'

  return (
    <section className="bg-[#002D62] py-12 text-white min-[990px]:py-16">
      <div className="container-app">
        <div
          className={[
            'flex flex-col gap-8 min-[990px]:flex-row min-[990px]:items-stretch min-[990px]:gap-12',
            isImageLeft ? 'flex-col-reverse min-[990px]:flex-row-reverse' : '',
          ].join(' ')}
        >
          <div className="flex min-w-0 flex-1 flex-col justify-center">
            {iconSrc ? (
              <img
                src={iconSrc}
                alt=""
                width={65}
                height={65}
                className="mb-4 h-[65px] w-[65px] shrink-0 object-contain"
                aria-hidden="true"
              />
            ) : null}

            <h2 className="mb-4 text-[24px] font-bold leading-tight tracking-tight min-[990px]:text-[32px]">
              {title}
            </h2>

            <div className="flex flex-col gap-4 text-[16px] font-medium leading-relaxed text-white/95 min-[990px]:text-[18px]">
              {paragraphs.map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>

            {bulletPoints && bulletPoints.length > 0 ? (
              <ul className="mt-4 flex list-none flex-col gap-4 p-0">
                {bulletPoints.map((item, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <img
                      src={OK_MARKER_SRC}
                      alt=""
                      width={20}
                      height={20}
                      className="mt-0.5 h-5 w-5 shrink-0 object-contain"
                      aria-hidden="true"
                    />
                    <span className="text-base font-medium leading-relaxed text-white/95">{item}</span>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>

          <div className="min-w-0 flex-1 min-[990px]:min-h-[320px]">
            <img
              src={imageSrc}
              alt={imageAlt}
              className="h-full min-h-[220px] w-full rounded-[24px] object-cover min-[990px]:min-h-[320px]"
            />
          </div>
        </div>
      </div>
    </section>
  )
}

export default SimulatorSplitSection
