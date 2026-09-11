const YANDEX_REVIEWS_SRC =
  'https://yandex.ru/maps-reviews-widget/63418841000?comments'
const YANDEX_ORG_HREF = 'https://yandex.ru/maps/org/aviator/63418841000/'

/** Блок отзывов + виджет Яндекс.Карт. Фон — `body` (#090c0e). */
function SimulatorReviewsIntro() {
  return (
    <section data-sim-reveal="block" className="py-14 min-[990px]:py-20">
      <div className="container-app mx-auto max-w-[720px] text-center">
        <h2
          data-sim-reveal-item
          className="text-[26px] font-bold leading-tight tracking-tight text-[#1f69ff] min-[990px]:text-[36px]"
        >
          О нас говорят...
        </h2>
        <p
          data-sim-reveal-item
          className="mt-4 text-[16px] font-medium leading-relaxed text-white/70 min-[990px]:mt-5 min-[990px]:text-[18px]"
        >
          Более 1000 довольных посетителей уже испытали незабываемые эмоции
        </p>
      </div>

      <div className="container-app mt-8 flex justify-center min-[990px]:mt-10">
        <div
          data-sim-reveal-item
          className="relative h-[800px] w-full max-w-[560px] overflow-hidden will-change-transform"
        >
          <iframe
            title="Отзывы Авиатор на Яндекс.Картах"
            src={YANDEX_REVIEWS_SRC}
            className="box-border h-full w-full rounded-lg border border-white/15"
            loading="lazy"
          />
          <a
            href={YANDEX_ORG_HREF}
            target="_blank"
            rel="noopener noreferrer"
            className="absolute bottom-2 left-0 box-border block max-h-[14px] w-full overflow-hidden text-ellipsis whitespace-nowrap px-4 text-center text-[10px] font-normal text-white/40 no-underline"
            style={{ fontFamily: 'YS Text, sans-serif' }}
          >
            Авиатор на карте Минска — Яндекс&nbsp;Карты
          </a>
        </div>
      </div>
    </section>
  )
}

export default SimulatorReviewsIntro
