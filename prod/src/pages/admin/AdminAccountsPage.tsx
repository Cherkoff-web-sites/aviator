import * as React from 'react'
import { Plus, Search, Trash2 } from 'lucide-react'
import AdminFormModal from '@/components/admin/AdminFormModal'
import ConfirmDialog from '@/components/admin/ConfirmDialog'
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
import { useAdminUndo } from '@/contexts/AdminUndoContext'
import {
  ACCOUNT_COLOR_OPTIONS,
  ACCOUNT_ROLE_OPTIONS,
  SIMULATOR_OPTIONS,
  labelOf,
} from '@/lib/admin-labels'
import { apiFetch, type AdminUser } from '@/lib/api'
import { cn } from '@/lib/utils'

const PENCIL = '/assets/admin/certificates_pencil_icon.svg'

function roleLabel(user: AdminUser) {
  if (user.role === 'ADMIN') return 'Администратор'
  if (user.role === 'MANAGER') return 'Менеджер'
  const sims = user.pilotSimulators
    .map((s) => (s === 'boeing-737' ? 'Boeing' : s === 'mi-2' ? 'Ми-2' : s))
    .join(' + ')
  return sims ? `Пилот — ${sims}` : 'Пилот'
}

function colorLabel(hex: string) {
  return labelOf(ACCOUNT_COLOR_OPTIONS, hex.toLowerCase(), hex)
}

type AccountForm = {
  fullName: string
  login: string
  phone: string
  password: string
  role: AdminUser['role']
  isActive: boolean
  color: string
  pilotSimulators: string[]
}

const emptyForm = (): AccountForm => ({
  fullName: '',
  login: '',
  phone: '',
  password: '',
  role: 'PILOT',
  isActive: true,
  color: '#2563eb',
  pilotSimulators: ['boeing-737'],
})

export default function AdminAccountsPage() {
  const [query, setQuery] = React.useState('')
  const [formOpen, setFormOpen] = React.useState(false)
  const [saveConfirmOpen, setSaveConfirmOpen] = React.useState(false)
  const [deleteTarget, setDeleteTarget] = React.useState<AdminUser | null>(null)
  const [actionBusy, setActionBusy] = React.useState(false)
  const [editId, setEditId] = React.useState<string | null>(null)
  const [editSnapshot, setEditSnapshot] = React.useState<AdminUser | null>(null)
  const [form, setForm] = React.useState<AccountForm>(emptyForm)
  const { pushUndo } = useAdminUndo()

  const { data, reload } = useLiveData(
    () => apiFetch<AdminUser[]>('/api/admin/accounts'),
    [],
  )
  const rows = data ?? []

  const filtered = rows.filter((row) => {
    const q = query.trim().toLowerCase()
    if (!q) return true
    return [row.fullName, row.login, row.phone, row.password, roleLabel(row)]
      .join(' ')
      .toLowerCase()
      .includes(q)
  })

  const openCreate = () => {
    setEditId(null)
    setEditSnapshot(null)
    setForm(emptyForm())
    setFormOpen(true)
  }

  const openEdit = (row: AdminUser) => {
    setEditId(row.id)
    setEditSnapshot(row)
    setForm({
      fullName: row.fullName,
      login: row.login,
      phone: row.phone,
      password: row.password,
      role: row.role,
      isActive: row.isActive,
      color: row.color,
      pilotSimulators: [...row.pilotSimulators],
    })
    setFormOpen(true)
  }

  const toggleSimulator = (slug: string) => {
    setForm((f) => {
      const has = f.pilotSimulators.includes(slug)
      const pilotSimulators = has
        ? f.pilotSimulators.filter((s) => s !== slug)
        : [...f.pilotSimulators, slug]
      return { ...f, pilotSimulators }
    })
  }

  const save = async () => {
    if (form.role === 'PILOT' && form.pilotSimulators.length === 0) return
    if (!editId && !form.password.trim()) return
    setActionBusy(true)
    try {
      const payload = {
        fullName: form.fullName,
        login: form.login,
        phone: form.phone,
        password: form.password,
        role: form.role,
        isActive: form.isActive,
        color: form.color,
        pilotSimulators: form.role === 'PILOT' ? form.pilotSimulators : [],
      }
      if (editId) {
        const previous = editSnapshot
        await apiFetch(`/api/admin/accounts/${editId}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        })
        if (previous) {
          pushUndo({
            label: `Отменить изменение аккаунта «${previous.fullName}»`,
            run: async () => {
              await apiFetch(`/api/admin/accounts/${previous.id}`, {
                method: 'PATCH',
                body: JSON.stringify({
                  fullName: previous.fullName,
                  login: previous.login,
                  phone: previous.phone,
                  password: previous.password,
                  role: previous.role,
                  isActive: previous.isActive,
                  color: previous.color,
                  pilotSimulators: previous.pilotSimulators,
                }),
              })
              void reload()
            },
          })
        }
      } else {
        const created = await apiFetch<AdminUser>('/api/admin/accounts', {
          method: 'POST',
          body: JSON.stringify(payload),
        })
        pushUndo({
          label: `Отменить создание аккаунта «${created.fullName}»`,
          run: async () => {
            await apiFetch(`/api/admin/accounts/${created.id}`, { method: 'DELETE' })
            void reload()
          },
        })
      }
      setFormOpen(false)
      setSaveConfirmOpen(false)
      void reload()
    } finally {
      setActionBusy(false)
    }
  }

  const removeAccount = async () => {
    if (!deleteTarget) return
    setActionBusy(true)
    const previous = deleteTarget
    try {
      await apiFetch(`/api/admin/accounts/${previous.id}`, { method: 'DELETE' })
      pushUndo({
        label: `Восстановить аккаунт «${previous.fullName}»`,
        run: async () => {
          await apiFetch('/api/admin/accounts', {
            method: 'POST',
            body: JSON.stringify({
              id: previous.id,
              fullName: previous.fullName,
              login: previous.login,
              phone: previous.phone,
              password: previous.password,
              role: previous.role,
              isActive: previous.isActive,
              color: previous.color,
              pilotSimulators: previous.pilotSimulators,
            }),
          })
          void reload()
        },
      })
      setDeleteTarget(null)
      void reload()
    } finally {
      setActionBusy(false)
    }
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

      <AdminFormModal
        open={formOpen}
        title={editId ? 'Редактировать аккаунт' : 'Новый аккаунт'}
        onClose={() => setFormOpen(false)}
      >
        <div className="grid gap-3 sm:grid-cols-2">
          {(
            [
              ['fullName', 'ФИО'],
              ['login', 'Логин'],
              ['phone', 'Телефон'],
            ] as const
          ).map(([key, label]) => (
            <label key={key} className="text-sm">
              <span className="text-muted-foreground">{label}</span>
              <Input
                className="mt-1 h-9"
                value={form[key]}
                onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
              />
            </label>
          ))}
          <label className="text-sm">
            <span className="text-muted-foreground">
              {editId ? 'Пароль' : 'Пароль (обязательно)'}
            </span>
            <Input
              className="mt-1 h-9 font-mono"
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              autoComplete="new-password"
            />
          </label>
          <label className="text-sm">
            <span className="text-muted-foreground">Роль</span>
            <select
              className="mt-1 flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-sm"
              value={form.role}
              onChange={(e) => {
                const role = e.target.value as AdminUser['role']
                setForm((f) => ({
                  ...f,
                  role,
                  pilotSimulators:
                    role === 'PILOT'
                      ? f.pilotSimulators.length
                        ? f.pilotSimulators
                        : ['boeing-737']
                      : [],
                }))
              }}
            >
              {ACCOUNT_ROLE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            <span className="text-muted-foreground">Статус</span>
            <select
              className="mt-1 flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-sm"
              value={form.isActive ? 'active' : 'inactive'}
              onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.value === 'active' }))}
            >
              <option value="active">Активен</option>
              <option value="inactive">Неактивен (заблокирован)</option>
            </select>
          </label>
          <div className="text-sm sm:col-span-2">
            <span className="text-muted-foreground">Цвет</span>
            <div className="mt-2 flex flex-wrap gap-2">
              {ACCOUNT_COLOR_OPTIONS.map((o) => {
                const selected = form.color.toLowerCase() === o.value.toLowerCase()
                return (
                  <button
                    key={o.value}
                    type="button"
                    className={cn(
                      'inline-flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-sm transition-colors',
                      selected
                        ? 'border-foreground bg-muted'
                        : 'border-border bg-background hover:bg-muted/50',
                    )}
                    onClick={() => setForm((f) => ({ ...f, color: o.value }))}
                  >
                    <span
                      className="inline-block size-3.5 shrink-0 rounded-full border border-black/10"
                      style={{ backgroundColor: o.value }}
                    />
                    {o.label}
                  </button>
                )
              })}
            </div>
          </div>
          {form.role === 'PILOT' ? (
            <div className="text-sm sm:col-span-2">
              <span className="text-muted-foreground">Тренажёры пилота</span>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Открывает в админке записи и смены только по выбранным тренажёрам. Можно один или оба.
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {SIMULATOR_OPTIONS.map((o) => {
                  const on = form.pilotSimulators.includes(o.value)
                  return (
                    <button
                      key={o.value}
                      type="button"
                      className={cn(
                        'rounded-md border px-3 py-1.5 text-sm transition-colors',
                        on
                          ? 'border-foreground bg-foreground text-background'
                          : 'border-border bg-background hover:bg-muted/50',
                      )}
                      onClick={() => toggleSimulator(o.value)}
                    >
                      {o.label}
                    </button>
                  )
                })}
              </div>
              {form.pilotSimulators.length === 0 ? (
                <p className="mt-1 text-xs text-destructive">Выберите хотя бы один тренажёр</p>
              ) : null}
            </div>
          ) : null}
          <div className="flex gap-2 sm:col-span-2">
            <Button
              type="button"
              onClick={() => setSaveConfirmOpen(true)}
              disabled={
                (form.role === 'PILOT' && form.pilotSimulators.length === 0) ||
                (!editId && !form.password.trim())
              }
            >
              Сохранить
            </Button>
            <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>
              Отмена
            </Button>
          </div>
        </div>
      </AdminFormModal>

      <ConfirmDialog
        open={saveConfirmOpen}
        title={editId ? 'Сохранить изменения аккаунта?' : 'Создать аккаунт?'}
        description="Действие можно отменить вверху страницы в течение минуты."
        confirmLabel="Сохранить"
        busy={actionBusy}
        onConfirm={() => void save()}
        onCancel={() => setSaveConfirmOpen(false)}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        title="Удалить аккаунт?"
        description={
          deleteTarget
            ? `«${deleteTarget.fullName}» (${deleteTarget.login}) будет удалён. Можно отменить вверху страницы.`
            : undefined
        }
        confirmLabel="Удалить"
        busy={actionBusy}
        onConfirm={() => void removeAccount()}
        onCancel={() => setDeleteTarget(null)}
      />

      <div className="flex flex-col gap-4 rounded-lg border bg-background p-4">
        <div className="-mx-4 max-w-[calc(100vw-2rem)] overflow-x-auto sm:mx-0 sm:max-w-none">
          <Table>
            <TableHeader>
              <TableRow className="border-b bg-muted/40 hover:bg-muted/40">
                <TableHead className="min-w-[180px] whitespace-nowrap">ФИО</TableHead>
                <TableHead className="min-w-[120px] whitespace-nowrap">Логин</TableHead>
                <TableHead className="min-w-[110px] whitespace-nowrap">Пароль</TableHead>
                <TableHead className="min-w-[140px] whitespace-nowrap">Телефон</TableHead>
                <TableHead className="min-w-[140px] whitespace-nowrap">Роль</TableHead>
                <TableHead className="min-w-[100px] whitespace-nowrap">Статус</TableHead>
                <TableHead className="min-w-[100px] whitespace-nowrap">Цвет</TableHead>
                <TableHead className="w-[88px] pr-2 text-right" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="whitespace-nowrap font-semibold text-foreground">
                    {row.fullName}
                  </TableCell>
                  <TableCell className="whitespace-nowrap font-mono text-[13px]">{row.login}</TableCell>
                  <TableCell className="whitespace-nowrap font-mono text-[13px]">
                    {row.password || '—'}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">{row.phone}</TableCell>
                  <TableCell className="min-w-[140px] whitespace-nowrap text-sm">{roleLabel(row)}</TableCell>
                  <TableCell className="whitespace-nowrap text-sm">
                    {row.isActive ? (
                      <span className="text-foreground">Активен</span>
                    ) : (
                      <span className="text-muted-foreground">Неактивен</span>
                    )}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    <span className="inline-flex items-center gap-2 font-medium" style={{ color: row.color }}>
                      <span
                        className="inline-block size-3 rounded-full"
                        style={{ backgroundColor: row.color }}
                      />
                      {colorLabel(row.color)}
                    </span>
                  </TableCell>
                  <TableCell className="pr-2 text-right">
                    <div className="inline-flex items-center justify-end gap-0.5">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-8 text-muted-foreground"
                        aria-label="Редактировать"
                        onClick={() => openEdit(row)}
                      >
                        <img src={PENCIL} alt="" className="size-4" width={16} height={16} />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-8 text-muted-foreground hover:text-destructive"
                        aria-label="Удалить"
                        onClick={() => setDeleteTarget(row)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
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
