import type { ReactNode } from 'react'

import SiteFooter from './SiteFooter'
import SiteHeader from './SiteHeader'

type Props = {
  title: string
  children: ReactNode
}

/** Общая оболочка для страниц правил / политики / оферты */
function LegalDocumentLayout({ title, children }: Props) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <SiteHeader />
      <main className="flex min-h-0 flex-1 flex-col bg-[#f4f6f9] pb-16 pt-[88px] text-[#151824] min-[990px]:pb-24 min-[990px]:pt-[100px]">
        <article className="container-app max-w-[880px]">
          <h1
            className="text-[28px] font-bold leading-tight tracking-tight text-[#002D62] min-[990px]:text-[40px]"
            style={{ fontFamily: 'Montserrat, sans-serif' }}
          >
            {title}
          </h1>
          <div className="legal-doc mt-8 space-y-4 text-[15px] leading-relaxed text-[#243047] min-[990px]:mt-10 min-[990px]:space-y-5 min-[990px]:text-[16px]">
            {children}
          </div>
        </article>
      </main>
      <SiteFooter />
    </div>
  )
}

export function LegalH2({ children }: { children: ReactNode }) {
  return (
    <h2 className="!mt-10 text-[18px] font-bold tracking-tight text-[#002D62] first:!mt-0 min-[990px]:!mt-12 min-[990px]:text-[20px]">
      {children}
    </h2>
  )
}

export function LegalH3({ children }: { children: ReactNode }) {
  return <h3 className="!mt-6 text-[16px] font-semibold text-[#002D62] min-[990px]:text-[17px]">{children}</h3>
}

export function LegalP({ children }: { children: ReactNode }) {
  return <p className="m-0">{children}</p>
}

export function LegalUl({ children }: { children: ReactNode }) {
  return <ul className="m-0 list-disc space-y-2 pl-5">{children}</ul>
}

export function LegalLi({ children }: { children: ReactNode }) {
  return <li className="pl-1">{children}</li>
}

export default LegalDocumentLayout
