import { Link } from 'react-router-dom'

import FaqAccordion from '../components/FaqAccordion'
import PageGradientTitle from '../components/PageGradientTitle'
import SiteFooter from '../components/SiteFooter'
import SiteHeader from '../components/SiteHeader'
import { FAQ_ITEMS } from '../data/faq'

function FaqPage() {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <SiteHeader />
      <main className="flex min-h-0 flex-1 flex-col bg-[#e9e9e9] pb-12 pt-[72px] text-[#002D62] min-[990px]:pb-16 min-[990px]:pt-[84px]">
        <PageGradientTitle title="Вопросы и ответы" className="pb-6 min-[990px]:pb-10" />
        <div className="container-app max-w-[800px]">
          <FaqAccordion items={FAQ_ITEMS} defaultOpenId="real-plane" />
          <section className="mt-10 text-center min-[990px]:mt-14">
            <h2 className="text-[20px] font-bold leading-tight tracking-tight text-[#002D62] min-[990px]:text-[24px]">
              Остались вопросы?
            </h2>
            <Link
              to="/contacts"
              className="mt-5 inline-flex w-full max-w-[400px] items-center justify-center rounded-full px-8 py-3.5 text-[16px] font-semibold text-white no-underline shadow-[0_8px_28px_rgba(0,117,255,0.35)] transition-opacity hover:opacity-95 min-[990px]:mt-6 min-[990px]:max-w-[440px] min-[990px]:py-4 min-[990px]:text-[17px]"
              style={{
                background: 'linear-gradient(180deg, #4da3ff 0%, #0075ff 42%, #0050b3 100%)',
              }}
            >
              Свяжитесь с нами
            </Link>
          </section>
        </div>
      </main>
      <SiteFooter />
    </div>
  )
}

export default FaqPage
