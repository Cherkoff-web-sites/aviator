import * as React from 'react'
import { Plus, Search } from 'lucide-react'
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
import { cn } from '@/lib/utils'

const ACCOUNTS_PENCIL_ICON_SRC =
  '/assets/admin/certificates_pencil_icon.svg' as const

type AccountStatus = 'active' | 'inactive'

type AccountRow = {
  id: string
  fullName: string
  login: string
  phone: string
  role: string
  status: AccountStatus
  /** Подпись в колонке «Цвет» */
  colorLabel: string
  colorClassName: string
}

const ACCOUNT_ROWS: AccountRow[] = [
  {
    id: '1',
    fullName: 'Сафонов Никита Дмитриевич',
    login: '+7 800 800 70 70',
    phone: '+375 (12) 1234567',
    role: 'Пилот — ми 2',
    status: 'active',
    colorLabel: 'Синий',
    colorClassName: 'font-medium text-blue-600 dark:text-blue-400',
  },
  {
    id: '2',
    fullName: 'Сафонов Никита Дмитриевич',
    login: '+7 800 800 70 70',
    phone: '+375 (12) 1234567',
    role: 'Пилот — Boeing',
    status: 'inactive',
    colorLabel: 'Жёлтый',
    colorClassName: 'font-medium text-yellow-600 dark:text-yellow-400',
  },
  {
    id: '3',
    fullName: 'Алексий Иван Кудрявин',
    login: '+3 800 800 70 70',
    phone: '+375 (12) 1234567',
    role: 'Администратор',
    status: 'inactive',
    colorLabel: 'Красный',
    colorClassName: 'font-medium text-red-600 dark:text-red-400',
  },
  {
    id: '4',
    fullName: 'Вален Иван Валенков',
    login: '+3 800 800 70 70',
    phone: '+375 (12) 1234567',
    role: 'Владелец',
    status: 'active',
    colorLabel: 'Зелёный',
    colorClassName: 'font-medium text-green-600 dark:text-green-400',
  },
  {
    id: '5',
    fullName: 'Злат Ибрагим Иванов',
    login: '+3 800 800 70 70',
    phone: '+375 (12) 1234567',
    role: 'Пилот ми-2 и Boeing',
    status: 'active',
    colorLabel: 'Голубой',
    colorClassName: 'font-medium text-sky-500 dark:text-sky-400',
  },
]

function StatusCell({ status }: { status: AccountStatus }) {
  if (status === 'active') {
    return <span className="text-foreground">Активен</span>
  }
  return <span className="text-muted-foreground">Неактивен</span>
}

function rowMatchesQuery(row: AccountRow, q: string) {
  const needle = q.trim().toLowerCase()
  if (!needle) return true
  const hay = [
    row.fullName,
    row.login,
    row.phone,
    row.role,
    row.status === 'active' ? 'активен' : 'неактивен',
    row.colorLabel,
  ]
    .join(' ')
    .toLowerCase()
  return hay.includes(needle)
}

export default function AdminAccountsPage() {
  const [query, setQuery] = React.useState('')

  const filtered = React.useMemo(
    () => ACCOUNT_ROWS.filter((row) => rowMatchesQuery(row, query)),
    [query],
  )

  return (
    <div className="flex w-full min-w-0 flex-col gap-4">
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-9 w-full shrink-0 gap-2 sm:w-fit"
      >
        <Plus className="size-4 shrink-0" />
        Добавить новый аккаунт
      </Button>

      <div className="relative">
        <span className="pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2 text-muted-foreground">
          <Search className="size-4" aria-hidden />
        </span>
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Поиск"
          className="h-10 rounded-lg border bg-background pl-9 pr-3"
          aria-label="Поиск по аккаунтам"
        />
      </div>

      <div className="flex flex-col gap-4 rounded-lg border bg-background p-4">
        <div className="-mx-4 max-w-[calc(100vw-2rem)] overflow-x-auto sm:mx-0 sm:max-w-none">
          <Table>
            <TableHeader>
              <TableRow className="border-b bg-muted/40 hover:bg-muted/40">
                <TableHead className="w-[52px] pl-3 pr-1" />
                <TableHead className="min-w-[180px] whitespace-nowrap">ФИО</TableHead>
                <TableHead className="min-w-[140px] whitespace-nowrap">Логин</TableHead>
                <TableHead className="min-w-[150px] whitespace-nowrap">
                  Номер телефона
                </TableHead>
                <TableHead className="min-w-[140px] whitespace-nowrap">Тип</TableHead>
                <TableHead className="min-w-[100px] whitespace-nowrap">Статус</TableHead>
                <TableHead className="min-w-[88px] whitespace-nowrap">Цвет</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="pl-3 pr-1 align-middle">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-8 shrink-0"
                      aria-label="Редактировать"
                    >
                      <img
                        src={ACCOUNTS_PENCIL_ICON_SRC}
                        alt=""
                        className="size-4 object-contain"
                        width={16}
                        height={16}
                      />
                    </Button>
                  </TableCell>
                  <TableCell className="whitespace-nowrap font-semibold text-foreground">
                    {row.fullName}
                  </TableCell>
                  <TableCell className="whitespace-nowrap font-mono text-[13px]">
                    {row.login}
                  </TableCell>
                  <TableCell className="whitespace-nowrap font-mono text-[13px]">
                    {row.phone}
                  </TableCell>
                  <TableCell className="min-w-[140px] whitespace-nowrap text-sm">
                    {row.role}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-sm">
                    <StatusCell status={row.status} />
                  </TableCell>
                  <TableCell className={cn(row.colorClassName, 'whitespace-nowrap')}>
                    {row.colorLabel}
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
