import * as React from 'react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

function Cell({ children }: { children: React.ReactNode }) {
  const empty =
    children === '' ||
    children === null ||
    children === undefined ||
    (typeof children === 'string' && children.trim() === '')
  return (
    <td className="px-3 py-3 align-middle text-sm text-foreground first:pl-0 last:pr-0">
      {empty ? (
        <span className="text-muted-foreground">—</span>
      ) : (
        children
      )}
    </td>
  )
}

function PriceTable({
  headers,
  rows,
}: {
  headers: string[]
  rows: (string | number | null | undefined)[][]
}) {
  return (
    <div className="-mx-1 overflow-x-auto">
      <table className="w-full min-w-[480px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-border">
            {headers.map((h) => (
              <th
                key={h}
                className="px-3 py-3 text-left text-sm font-semibold text-foreground first:pl-0 last:pr-0"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b border-border last:border-b-0">
              {row.map((cell, j) => (
                <Cell key={j}>{cell !== '' && cell != null ? String(cell) : ''}</Cell>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

const FLIGHT_PRICES_HEADERS = ['Время', 'Ми-2', 'B737']
const FLIGHT_PRICES_ROWS: string[][] = [
  ['30 минут', '170 BYN', '170 BYN'],
  ['60 минут', '300 BYN', '300 BYN'],
  ['90 минут', '', '400 BYN'],
  ['120 минут', '', '450 BYN'],
]

const CERT_PRICES_HEADERS = ['Время', 'Ми-2', 'B737', 'Ми-2 + B737']
const CERT_PRICES_ROWS: string[][] = [
  ['30 минут', '170 BYN', '170 BYN', ''],
  ['60 минут', '300 BYN', '300 BYN', '300 BYN'],
  ['90 минут', '', '400 BYN', ''],
  ['120 минут', '', '450 BYN', ''],
]

const PROMO_HEADERS = ['Название', 'Скидка', 'Начало и конец акции', 'Тип продукта']
const PROMO_ROWS: string[][] = [
  ['День рождения', '15%', '12.11.2025 - 17.02.2027', 'Boeing'],
  ['Счастливые минуты', '10%', '12.11.2025 - 17.02.2027', 'Ми-2'],
  ['Студенческая скидка', '?', '12.11.2025 - 17.02.2027', 'На все услуги'],
]

function SectionCard({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <Card className="border-border/80 shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-4 pt-6">
        <CardTitle className="text-base font-semibold text-foreground">{title}</CardTitle>
        <Button type="button" variant="secondary" size="sm" className="shrink-0 font-medium">
          Изменить
        </Button>
      </CardHeader>
      <CardContent className="pb-6">{children}</CardContent>
    </Card>
  )
}

export default function AdminPricesPromosPage() {
  return (
    <div className="flex w-full min-w-0 flex-col gap-6">
      <SectionCard title="Цены - Ми-2 / B737">
        <PriceTable headers={FLIGHT_PRICES_HEADERS} rows={FLIGHT_PRICES_ROWS} />
      </SectionCard>

      <SectionCard title="Цены на сертификаты">
        <PriceTable headers={CERT_PRICES_HEADERS} rows={CERT_PRICES_ROWS} />
      </SectionCard>

      <SectionCard title="Акции">
        <PriceTable headers={PROMO_HEADERS} rows={PROMO_ROWS} />
      </SectionCard>
    </div>
  )
}
