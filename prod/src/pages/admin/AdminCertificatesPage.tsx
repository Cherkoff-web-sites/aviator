import * as React from 'react'
import { format, addDays } from 'date-fns'
import { Search, Trash2 } from 'lucide-react'
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
import { apiFetch, type ApiCertificate } from '@/lib/api'
import { useAdminAuth } from '@/contexts/AdminAuthContext'
import { canEditBookings } from '@/lib/admin-access'

const PENCIL = '/assets/admin/certificates_pencil_icon.svg'

export default function AdminCertificatesPage() {
  const [query, setQuery] = React.useState('')
  const [formOpen, setFormOpen] = React.useState(false)
  const [editId, setEditId] = React.useState<string | null>(null)
  const { session } = useAdminAuth()
  const canEdit = session ? canEditBookings(session.role) : false

  const { data, reload } = useLiveData(
    () => apiFetch<ApiCertificate[]>('/api/admin/certificates'),
    [],
  )
  const rows = data ?? []

  const [form, setForm] = React.useState({
    number: '',
    phone: '',
    fullName: '',
    durationMin: 30,
    paymentStatus: 'UNPAID' as 'PAID' | 'UNPAID',
    validFrom: format(new Date(), 'yyyy-MM-dd'),
    validTo: format(addDays(new Date(), 90), 'yyyy-MM-dd'),
    simulatorSlug: 'boeing-737',
    status: 'ACTIVE',
    comment: '',
  })

  const filtered = rows.filter((r) => {
    const q = query.trim().toLowerCase()
    if (!q) return true
    return [r.number, r.phone, r.fullName, r.simulatorSlug].join(' ').toLowerCase().includes(q)
  })

  const openCreate = () => {
    setEditId(null)
    setForm({
      number: '',
      phone: '',
      fullName: '',
      durationMin: 30,
      paymentStatus: 'UNPAID',
      validFrom: format(new Date(), 'yyyy-MM-dd'),
      validTo: format(addDays(new Date(), 90), 'yyyy-MM-dd'),
      simulatorSlug: 'boeing-737',
      status: 'ACTIVE',
      comment: '',
    })
    setFormOpen(true)
  }

  const openEdit = (row: ApiCertificate) => {
    setEditId(row.id)
    setForm({
      number: row.number,
      phone: row.phone,
      fullName: row.fullName,
      durationMin: row.durationMin,
      paymentStatus: row.paymentStatus,
      validFrom: row.validFrom,
      validTo: row.validTo,
      simulatorSlug: row.simulatorSlug,
      status: row.status,
      comment: row.comment,
    })
    setFormOpen(true)
  }

  const save = async () => {
    if (editId) {
      await apiFetch(`/api/admin/certificates/${editId}`, { method: 'PATCH', body: JSON.stringify(form) })
    } else {
      await apiFetch('/api/admin/certificates', { method: 'POST', body: JSON.stringify(form) })
    }
    setFormOpen(false)
    void reload()
  }

  const remove = async (id: string) => {
    await apiFetch(`/api/admin/certificates/${id}`, { method: 'DELETE' })
    void reload()
  }

  return (
    <div className="flex w-full min-w-0 flex-col gap-4">
      {canEdit ? (
        <Button type="button" variant="outline" size="sm" className="h-9 w-fit gap-2" onClick={openCreate}>
          <img src={PENCIL} alt="" className="size-4" width={16} height={16} />
          Добавить новый сертификат
        </Button>
      ) : null}

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Поиск по номеру или телефону"
          className="h-10 pl-9"
        />
      </div>

      {formOpen ? (
        <div className="grid gap-2 rounded-lg border bg-background p-4 sm:grid-cols-2">
          {(
            [
              ['number', 'Номер'],
              ['fullName', 'ФИО'],
              ['phone', 'Телефон'],
              ['simulatorSlug', 'Тренажёр'],
              ['durationMin', 'Минуты', 'number'],
              ['status', 'Статус'],
              ['validFrom', 'С'],
              ['validTo', 'По'],
              ['comment', 'Комментарий'],
            ] as const
          ).map(([key, label, type]) => (
            <label key={key} className="text-sm">
              <span className="text-muted-foreground">{label}</span>
              <Input
                type={type ?? 'text'}
                className="mt-1 h-9"
                value={String(form[key as keyof typeof form] ?? '')}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    [key]: type === 'number' ? Number(e.target.value) : e.target.value,
                  }))
                }
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

      <div className="rounded-lg border bg-background p-2 sm:p-4">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Номер</TableHead>
              <TableHead>Телефон</TableHead>
              <TableHead>ФИО</TableHead>
              <TableHead>Минуты</TableHead>
              <TableHead>Оплата</TableHead>
              <TableHead>Период</TableHead>
              <TableHead>Тренажёр</TableHead>
              <TableHead>Статус</TableHead>
              {canEdit ? <TableHead className="w-24" /> : null}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((row) => (
              <TableRow key={row.id}>
                <TableCell className="font-medium">{row.number}</TableCell>
                <TableCell>{row.phone}</TableCell>
                <TableCell>{row.fullName}</TableCell>
                <TableCell>{row.durationMin}</TableCell>
                <TableCell>{row.paymentStatus === 'PAID' ? 'Оплачен' : 'Не оплачен'}</TableCell>
                <TableCell>
                  {row.validFrom} — {row.validTo}
                </TableCell>
                <TableCell>{row.simulatorSlug}</TableCell>
                <TableCell>{row.status}</TableCell>
                {canEdit ? (
                  <TableCell>
                    <div className="flex gap-1">
                      <Button type="button" variant="ghost" size="icon" className="size-8" onClick={() => openEdit(row)}>
                        <img src={PENCIL} alt="" className="size-4" width={16} height={16} />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-8 text-destructive"
                        onClick={() => void remove(row.id)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </TableCell>
                ) : null}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
