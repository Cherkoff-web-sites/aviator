/** Иконки: положите SVG в `public/assets/icons/` с этими именами (можете заменить заглушки). */
const HIGHLIGHTS = [
  {
    iconSrc: '/assets/icons/icon_check.svg',
    title: 'Профессиональная подготовка',
    description: 'Возможность отработки стандартных и нестандартных процедур',
  },
  {
    iconSrc: '/assets/icons/icon_scenarios.svg',
    title: 'Разнообразные сценарии',
    description: 'Более 100 аэропортов и реалистичные погодные условия по всему миру',
  },
  {
    iconSrc: '/assets/icons/icon_equipment.svg',
    title: 'Современное оборудование',
    description: 'Новейшие технологии для максимальной реалистичности',
  },
] as const

function SimulatorHighlightsThree() {
  return (
    <section className="bg-[#002D62] py-12 text-white min-[990px]:py-16">
      <div className="container-app">
        <div className="grid grid-cols-1 gap-12 min-[990px]:grid-cols-3 min-[990px]:gap-10">
          {HIGHLIGHTS.map((item) => (
            <div
              key={item.iconSrc}
              className="flex flex-col items-center text-center min-[990px]:px-4"
            >
              <img
                src={item.iconSrc}
                alt=""
                width={56}
                height={56}
                className="mb-6 h-14 w-14 shrink-0 object-contain"
                aria-hidden="true"
              />
              <h3 className="mb-3 text-[20px] font-bold leading-tight tracking-tight min-[990px]:text-[22px]">
                {item.title}
              </h3>
              <p className="max-w-[320px] text-[15px] font-medium leading-relaxed text-white/90 min-[990px]:text-[16px]">
                {item.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export default SimulatorHighlightsThree
