import * as React from 'react'
import { Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

/**
 * Иконка карандаша (кнопка сверху и в каждой строке).
 * Замените файл своим SVG: `public/assets/admin/certificates_pencil_icon.svg`
 * → в браузере URL: `/assets/admin/certificates_pencil_icon.svg`
 */
const CERTIFICATES_PENCIL_ICON_SRC =
  '/assets/admin/certificates_pencil_icon.svg' as const

type PaymentLabel = 'paid' | 'unpaid'
type CertStatus = 'active' | 'used' | 'expired' | 'cancelled' | 'partial'

type CertificateRow = {
  id: string
  number: string
  phone: string
  fullName: string
  duration: string
  payment: PaymentLabel
  period: string
  simulator: string
  status: CertStatus
  comment: string
}

const CERTIFICATE_ROWS: CertificateRow[] = [
  {
    id: '1',
    number: '№111111',
    phone: '+375 (12) 1234567',
    fullName: 'Никита Швепс',
    duration: '30 минут',
    payment: 'paid',
    period: '01.01.25 - 01.01.26',
    simulator: 'Boeing 747',
    status: 'active',
    comment: 'Придут с ребен...',
  },
  {
    id: '2',
    number: '№222222',
    phone: '+375 (12) 1234567',
    fullName: 'Анна Смирнова',
    duration: '60 минут',
    payment: 'unpaid',
    period: '15.02.25 - 15.02.26',
    simulator: 'Ми-2',
    status: 'used',
    comment: 'Это бабушка',
  },
  {
    id: '3',
    number: '№333333',
    phone: '+375 (12) 1234567',
    fullName: 'Иван Петров',
    duration: '30 минут',
    payment: 'paid',
    period: '01.03.25 - 01.03.26',
    simulator: 'Ми-2 + Боинг',
    status: 'partial',
    comment: 'Скоро придут...',
  },
  {
    id: '4',
    number: '№444444',
    phone: '+375 (12) 1234567',
    fullName: 'Ольга Ким',
    duration: '90 минут',
    payment: 'paid',
    period: '10.11.24 - 10.11.25',
    simulator: 'Boeing 747',
    status: 'expired',
    comment: '',
  },
  {
    id: '5',
    number: '№555555',
    phone: '+375 (12) 1234567',
    fullName: 'Сергей Лев',
    duration: '30 минут',
    payment: 'unpaid',
    period: '05.06.25 - 05.06.26',
    simulator: 'Ми-2',
    status: 'cancelled',
    comment: 'Перенос по согласованию',
  },
]

function PaymentCell({ payment }: { payment: PaymentLabel }) {
  if (payment === 'paid') {
    return <span className="text-foreground">Оплачен</span>
  }
  return <span className="text-muted-foreground">Не оплачен</span>
}

function StatusBadge({ status }: { status: CertStatus }) {
  switch (status) {
    case 'active':
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-foreground">
          <span className="text-[0.95rem] leading-none" aria-hidden>
            ☀️
          </span>
          Действует
        </span>
      )
    case 'used':
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-green-100 px-2.5 py-1 text-xs font-medium text-green-900 dark:bg-green-950/60 dark:text-green-100">
          <span className="text-[0.65rem] leading-none text-green-700" aria-hidden>
            ●
          </span>
          Использовали
        </span>
      )
    case 'expired':
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-foreground">
          <span className="text-[0.95rem] leading-none" aria-hidden>
            ⓘ
          </span>
          Просрочено
        </span>
      )
    case 'cancelled':
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-foreground">
          <span className="text-[0.95rem] leading-none" aria-hidden>
            ⓘ
          </span>
          Аннулирован
        </span>
      )
    case 'partial':
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-green-100 px-2.5 py-1 text-xs font-medium text-green-900 dark:bg-green-950/60 dark:text-green-100">
          <span className="text-[0.95rem] leading-none" aria-hidden>
            ✓
          </span>
          Частично-использован
        </span>
      )
    default:
      return null
  }
}

export default function AdminCertificatesPage() {
  const [query, setQuery] = React.useState('')

  return (
    <div className="flex w-full min-w-0 flex-col gap-4">
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-9 w-full shrink-0 gap-2 sm:w-fit"
      >
        <img
          src={CERTIFICATES_PENCIL_ICON_SRC}
          alt=""
          className="size-4 shrink-0 object-contain"
          width={16}
          height={16}
        />
        Добавить новый сертификат
      </Button>

      <div className="relative">
        <span className="pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2 text-muted-foreground">
          <Search className="size-4" aria-hidden />
        </span>
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Введите номер сертификата или номер телефона"
          className="h-10 rounded-lg border bg-background pl-9 pr-3"
          aria-label="Поиск по номеру сертификата или телефона"
        />
      </div>

      <div className="rounded-lg border bg-background p-2 sm:p-4">
        <div className="-mx-2 max-w-[calc(100vw-2rem)] overflow-x-auto sm:mx-0 sm:max-w-none">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[88px] whitespace-nowrap">Номер</TableHead>
                <TableHead className="min-w-[150px] whitespace-nowrap">Телефон</TableHead>
                <TableHead className="min-w-[140px] whitespace-nowrap">
                  Имя и фамилия
                </TableHead>
                <TableHead className="min-w-[110px] whitespace-nowrap">
                  Продолжительность
                </TableHead>
                <TableHead className="min-w-[96px] whitespace-nowrap">Оплата</TableHead>
                <TableHead className="min-w-[120px] whitespace-nowrap">Период</TableHead>
                <TableHead className="min-w-[120px] whitespace-nowrap">Авиатренажер</TableHead>
                <TableHead className="min-w-[140px] whitespace-nowrap">Статус</TableHead>
                <TableHead className="min-w-[140px]">Комментарий</TableHead>
                <TableHead className="w-[52px] pr-2 text-right" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {CERTIFICATE_ROWS.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="whitespace-nowrap font-medium">{row.number}</TableCell>
                  <TableCell className="whitespace-nowrap font-mono text-[13px]">
                    {row.phone}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">{row.fullName}</TableCell>
                  <TableCell className="whitespace-nowrap text-sm">{row.duration}</TableCell>
                  <TableCell className="whitespace-nowrap text-sm">
                    <PaymentCell payment={row.payment} />
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-sm">{row.period}</TableCell>
                  <TableCell className="whitespace-nowrap text-sm">{row.simulator}</TableCell>
                  <TableCell>
                    <StatusBadge status={row.status} />
                  </TableCell>
                  <TableCell className="max-w-[200px] text-sm leading-snug text-muted-foreground">
                    {row.comment}
                  </TableCell>
                  <TableCell className="pr-2 text-right">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-8"
                      aria-label="Редактировать"
                    >
                      <img
                        src={CERTIFICATES_PENCIL_ICON_SRC}
                        alt=""
                        className="size-4 object-contain"
                        width={16}
                        height={16}
                      />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  )
}
