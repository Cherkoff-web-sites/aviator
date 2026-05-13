/** Блок «выбор полёта» + индикатор загрузки (имитация). Без своего фона — фон `body`. */
function SimulatorFlightPricingPlaceholder() {
  return (
    <section className="py-14 min-[990px]:py-20">
      <div className="container-app mx-auto max-w-[720px] text-center">
        <h2 className="text-[26px] font-bold leading-tight tracking-tight text-[#1f69ff] min-[990px]:text-[36px]">
          Выберите свой полет
        </h2>
        <p className="mt-4 text-[16px] font-medium leading-relaxed text-[#6b7280] min-[990px]:mt-5 min-[990px]:text-[18px]">
          Стоимость зависит от продолжительности сеанса. Чем дольше, тем выгоднее!
        </p>

        <div className="mt-10 flex justify-center min-[990px]:mt-12" aria-hidden="true">
          <div
            className="h-10 w-10 rounded-full border-[3px] border-solid border-[#d1d5db] border-t-[#1f69ff] motion-safe:animate-spin"
            role="presentation"
          />
        </div>
      </div>
    </section>
  )
}

export default SimulatorFlightPricingPlaceholder
