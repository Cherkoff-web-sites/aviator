export type SimulatorPageViewProps = {
  heroImage: string
  heading: string
  description: string
}

function SimulatorPageView({ heroImage, heading, description }: SimulatorPageViewProps) {
  return (
    <section className="relative bg-[#202020] min-[990px]:h-[50vw]">
      <img
        src={heroImage}
        alt=""
        className="absolute inset-0 h-full min-h-full w-full object-cover object-center"
      />
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[45%]"
        style={{
          background:
            'linear-gradient(180deg, rgba(10, 31, 77, 0.78) 0%, rgba(10, 31, 77, 0) 100%)',
        }}
        aria-hidden="true"
      />

      <div className="relative z-10 flex min-h-0 flex-col pt-24 min-[990px]:h-full min-[990px]:pt-28">
        <div className="container-app mt-auto pb-12 min-[990px]:pb-20">
          <h1 className="text-[32px] font-bold leading-[1.1] tracking-tight text-white min-[990px]:text-[64px]">
            {heading}
          </h1>
          <p className="mt-6 max-w-[640px] text-[18px] font-medium leading-[1.45] text-white/95 min-[990px]:mt-8 min-[990px]:text-[24px]">
            {description}
          </p>
          <button
            type="button"
            className="mt-8 inline-flex items-center rounded-full bg-white px-8 py-3 text-[16px] font-semibold text-[#1f2430] min-[990px]:mt-10"
          >
            Забронировать полет
          </button>
        </div>
      </div>
    </section>
  )
}

export default SimulatorPageView
