import { Link } from 'react-router-dom'

import FaqAccordion from '../components/FaqAccordion'
import PageGradientTitle from '../components/PageGradientTitle'
import SiteCtaBanner from '../components/SiteCtaBanner'
import SiteFooter from '../components/SiteFooter'
import SiteHeader from '../components/SiteHeader'
import { FAQ_ITEMS } from '../data/faq'

function FaqPage() {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <SiteHeader />
      <main className="flex min-h-0 flex-1 flex-col pb-12 pt-[72px] text-white min-[990px]:pb-16 min-[990px]:pt-[84px]">
        <PageGradientTitle title="Вопросы и ответы" className="pb-6 min-[990px]:pb-10" />
        <div className="container-app max-w-[800px]">
          <FaqAccordion items={FAQ_ITEMS} defaultOpenId="real-plane" />
          <section className="mt-10 text-center min-[990px]:mt-14">
            <h2 className="text-[20px] font-bold leading-tight tracking-tight text-white min-[990px]:text-[24px]">
              Остались вопросы?
            </h2>
            <Link
              to="/contacts"
              className="btn-book-flight mt-5 w-full max-w-[400px] px-8 py-3.5 text-[16px] font-semibold no-underline min-[990px]:mt-6 min-[990px]:max-w-[440px] min-[990px]:py-4 min-[990px]:text-[17px]"
            >
              Свяжитесь с нами
            </Link>
          </section>
        </div>
      </main>
      <SiteCtaBanner />
      <SiteFooter />
    </div>
  )
}

export default FaqPage
