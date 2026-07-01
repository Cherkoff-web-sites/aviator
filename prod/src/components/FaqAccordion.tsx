import * as Accordion from '@radix-ui/react-accordion'

import type { FaqItem } from '../data/faq'

export type FaqAccordionProps = {
  items: FaqItem[]
  /** Какой пункт открыт при первой отрисовке (id из `items`). */
  defaultOpenId?: string
  className?: string
}

function ChevronIcon({ className = '' }: { className?: string }) {
  return (
    <svg
      className={className}
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        d="M5 7.5L10 12.5L15 7.5"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/** Аккордеон на @radix-ui/react-accordion: a11y, клавиатура, кастомизация через className. */
function FaqAccordion({ items, defaultOpenId, className = '' }: FaqAccordionProps) {
  return (
    <Accordion.Root
      type="single"
      collapsible
      defaultValue={defaultOpenId}
      className={className}
    >
      {items.map((item) => (
        <Accordion.Item key={item.id} value={item.id} className="border-b border-[#002D62]/25">
          <Accordion.Header className="flex">
            <Accordion.Trigger
              className="group flex w-full cursor-pointer items-center justify-between gap-4 py-4 text-left outline-none min-[990px]:py-5 [&:focus-visible]:ring-2 [&:focus-visible]:ring-[#0075FF]/50 [&:focus-visible]:ring-offset-2 [&:focus-visible]:ring-offset-[#e9e9e9]"
            >
              <span className="text-[15px] font-semibold leading-snug text-[#002D62] min-[990px]:text-[17px]">
                {item.question}
              </span>
              <ChevronIcon className="shrink-0 text-[#002D62] transition-transform duration-200 ease-out group-data-[state=open]:-rotate-180" />
            </Accordion.Trigger>
          </Accordion.Header>
          <Accordion.Content className="overflow-hidden data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down">
            <div className="space-y-3 pb-4 pr-10 text-[14px] font-medium leading-relaxed text-[#5a6578] min-[990px]:pb-5 min-[990px]:text-[15px] min-[990px]:leading-relaxed">
              {item.answer
                .split(/\n\n+/)
                .map((p) => p.trim())
                .filter(Boolean)
                .map((paragraph, i) => (
                  <p key={i} className="m-0">
                    {paragraph}
                  </p>
                ))}
            </div>
          </Accordion.Content>
        </Accordion.Item>
      ))}
    </Accordion.Root>
  )
}

export default FaqAccordion
