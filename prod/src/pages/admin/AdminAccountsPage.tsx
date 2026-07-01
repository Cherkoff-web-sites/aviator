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
import { useLiveData } from '@/hooks/useLiveData'
import { apiFetch, type AdminUser } from '@/lib/api'
import { cn } from '@/lib/utils'

const ACCOUNTS_PENCIL_ICON_SRC = '/assets/admin/certificates_pencil_icon.svg' as const

function roleLabel(user: AdminUser) {
  if (user.role === 'ADMIN') return 'Администратор'
  if (user.role === 'MANAGER') return 'Менеджер'
  const sims = user.pilotSimulators
    .map((s) => (s === 'boeing-737' ? 'Boeing' : s === 'mi-2' ? 'Ми-2' : s))
    .join(' + ')
  return sims ? `Пилот — ${sims}` : 'Пилот'
}

export default function AdminAccountsPage() {
  const [query, setQuery] = React.useState('')
  const [formOpen, setFormOpen] = React.useState(false)
  const [editId, setEditId] = React.useState<string | null>(null)
  const [form, setForm] = React.useState({
    fullName: '',
    login: '',
    phone: '',
    role: 'PILOT' as AdminUser['role'],
    isActive: true,
    color: '#2563eb',
    pilotSimulators: ['boeing-737'] as string[],
  })

  const { data, reload } = useLiveData(
    () => apiFetch<AdminUser[]>('/api/admin/accounts'),
    [],
  )
  const rows = data ?? []

  const filtered = rows.filter((row) => {
    const q = query.trim().toLowerCase()
    if (!q) return true
    return [row.fullName, row.login, row.phone, roleLabel(row)].join(' ').toLowerCase().includes(q)
  })

  const openCreate = () => {
    setEditId(null)
    setForm({
      fullName: '',
      login: '',
      phone: '',
      role: 'PILOT',
      isActive: true,
      color: '#2563eb',
      pilotSimulators: ['boeing-737'],
    })
    setFormOpen(true)
  }

  const openEdit = (row: AdminUser) => {
    setEditId(row.id)
    setForm({
      fullName: row.fullName,
      login: row.login,
      phone: row.phone,
      role: row.role,
      isActive: row.isActive,
      color: row.color,
      pilotSimulators: row.pilotSimulators,
    })
    setFormOpen(true)
  }

  const save = async () => {
    if (editId) {
      await apiFetch(`/api/admin/accounts/${editId}`, { method: 'PATCH', body: JSON.stringify(form) })
    } else {
      await apiFetch('/api/admin/accounts', { method: 'POST', body: JSON.stringify(form) })
    }
    setFormOpen(false)
    void reload()
  }

  return (
    <div className="flex w-full min-w-0 flex-col gap-4">
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-9 w-full shrink-0 gap-2 sm:w-fit"
        onClick={openCreate}
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

      {formOpen ? (
        <div className="grid gap-2 rounded-lg border bg-background p-4 sm:grid-cols-2">
          {(
            [
              ['fullName', 'ФИО'],
              ['login', 'Логин'],
              ['phone', 'Телефон'],
              ['role', 'Роль'],
              ['color', 'Цвет (hex)'],
            ] as const
          ).map(([key, label]) => (
            <label key={key} className="text-sm">
              <span className="text-muted-foreground">{label}</span>
              <Input
                className="mt-1 h-9"
                value={String(form[key] ?? '')}
                onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
              />
            </label>
          ))}
          <div className="flex gap-2 sm:col-span-2">
            <Button type="button" onClick={() => void save()}>
              Сохранить
            </Button>
            <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>
              Отмена
            </Button>
          </div>
        </div>
      ) : null}

      <div className="flex flex-col gap-4 rounded-lg border bg-background p-4">
        <div className="-mx-4 max-w-[calc(100vw-2rem)] overflow-x-auto sm:mx-0 sm:max-w-none">
          <Table>
            <TableHeader>
              <TableRow className="border-b bg-muted/40 hover:bg-muted/40">
                <TableHead className="w-[52px] pl-3 pr-1" />
                <TableHead className="min-w-[180px] whitespace-nowrap">ФИО</TableHead>
                <TableHead className="min-w-[140px] whitespace-nowrap">Логин</TableHead>
                <TableHead className="min-w-[150px] whitespace-nowrap">Номер телефона</TableHead>
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
                      onClick={() => openEdit(row)}
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
                  <TableCell className="whitespace-nowrap font-mono text-[13px]">{row.login}</TableCell>
                  <TableCell className="whitespace-nowrap font-mono text-[13px]">{row.phone}</TableCell>
                  <TableCell className="min-w-[140px] whitespace-nowrap text-sm">{roleLabel(row)}</TableCell>
                  <TableCell className="whitespace-nowrap text-sm">
                    {row.isActive ? (
                      <span className="text-foreground">Активен</span>
                    ) : (
                      <span className="text-muted-foreground">Неактивен</span>
                    )}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    <span
                      className={cn('inline-flex items-center gap-2 font-medium')}
                      style={{ color: row.color }}
                    >
                      <span
                        className="inline-block size-3 rounded-full"
                        style={{ backgroundColor: row.color }}
                      />
                      {row.color}
                    </span>
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
