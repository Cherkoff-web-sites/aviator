/** Вступление к блоку отзывов: без фона — виден фон `body` (#e9e9e9 в `index.css`). */
function SimulatorReviewsIntro() {
  return (
    <section className="py-14 min-[990px]:py-20">
      <div className="container-app mx-auto max-w-[720px] text-center">
        <h2 className="text-[26px] font-bold leading-tight tracking-tight text-[#1f69ff] min-[990px]:text-[36px]">
          О нас говорят...
        </h2>
        <p className="mt-4 text-[16px] font-medium leading-relaxed text-[#6b7280] min-[990px]:mt-5 min-[990px]:text-[18px]">
          Более 1000 довольных посетителей уже испытали незабываемые эмоции
        </p>
      </div>
    </section>
  )
}

export default SimulatorReviewsIntro
