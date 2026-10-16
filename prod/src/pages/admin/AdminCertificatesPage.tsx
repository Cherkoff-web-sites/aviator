import * as React from 'react'
import { format, addMonths, isValid, parseISO } from 'date-fns'
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
import AdminFormModal from '@/components/admin/AdminFormModal'
import ConfirmDialog from '@/components/admin/ConfirmDialog'
import { useHighlightRow } from '@/hooks/useHighlightRow'
import { useLiveData } from '@/hooks/useLiveData'
import { apiFetch, type ApiCertificate } from '@/lib/api'
import { useAdminAuth } from '@/contexts/AdminAuthContext'
import { useAdminUndo } from '@/contexts/AdminUndoContext'
import { canEditBookings } from '@/lib/admin-access'
import PaymentMethodIcon from '@/components/admin/PaymentMethodIcon'
import {
  CERTIFICATE_STATUS_OPTIONS,
  CERT_SIMULATOR_OPTIONS,
  labelOf,
  PAYMENT_METHOD_OPTIONS,
} from '@/lib/admin-labels'
import { durationsForSimulator, FLIGHT_DURATIONS } from '@/lib/flight-durations'
import {
  certificateUrgency,
  defaultDesignForSim,
  designMeta,
  designOptionsForSim,
  URGENCY_BADGE_CLASS,
  type CertificateDesignColor,
} from '@/lib/certificate-design'
import { cn } from '@/lib/utils'

const PENCIL = '/assets/admin/certificates_pencil_icon.svg'

const selectClass =
  'mt-1 flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-sm'

export default function AdminCertificatesPage() {
  const [query, setQuery] = React.useState('')
  const [formOpen, setFormOpen] = React.useState(false)
  const [editId, setEditId] = React.useState<string | null>(null)
  const [saveConfirmOpen, setSaveConfirmOpen] = React.useState(false)
  const [deleteTarget, setDeleteTarget] = React.useState<ApiCertificate | null>(null)
  const [actionBusy, setActionBusy] = React.useState(false)
  const { session } = useAdminAuth()
  const { pushUndo } = useAdminUndo()
  const canEdit = session ? canEditBookings(session.role) : false

  const { data, reload } = useLiveData(
    () => apiFetch<ApiCertificate[]>('/api/admin/certificates'),
    [],
  )
  const rows = data ?? []
  const { rowProps } = useHighlightRow(data !== null)

  const [form, setForm] = React.useState({
    number: '',
    phone: '',
    fullName: '',
    durationMin: 30,
    paymentMethod: 'OFFLINE' as 'ONLINE' | 'OFFLINE',
    paymentStatus: 'PAID' as const,
    validFrom: format(new Date(), 'yyyy-MM-dd'),
    validTo: format(addMonths(new Date(), 3), 'yyyy-MM-dd'),
    simulatorSlug: 'boeing-737',
    designColor: 'silver' as CertificateDesignColor,
    status: 'ACTIVE',
    comment: '',
  })

  const designOptions = designOptionsForSim(form.simulatorSlug)

  const durationOptions =
    form.simulatorSlug === 'combo'
      ? ([60] as const)
      : form.simulatorSlug === 'mi-2'
        ? durationsForSimulator('mi-2')
        : FLIGHT_DURATIONS

  const filtered = rows.filter((r) => {
    const q = query.trim().toLowerCase()
    if (!q) return true
    const urgency = certificateUrgency(r.validTo, r.status)
    return [
      r.number,
      r.phone,
      r.fullName,
      r.simulatorSlug,
      labelOf(CERTIFICATE_STATUS_OPTIONS, r.status),
      urgency.label,
    ]
      .join(' ')
      .toLowerCase()
      .includes(q)
  })

  const openCreate = () => {
    setEditId(null)
    setForm({
      number: '',
      phone: '',
      fullName: '',
      durationMin: 30,
      paymentMethod: 'OFFLINE',
      paymentStatus: 'PAID',
      validFrom: format(new Date(), 'yyyy-MM-dd'),
      validTo: format(addMonths(new Date(), 3), 'yyyy-MM-dd'),
      simulatorSlug: 'boeing-737',
      designColor: defaultDesignForSim('boeing-737'),
      status: 'ACTIVE',
      comment: '',
    })
    setFormOpen(true)
  }

  const openEdit = (row: ApiCertificate) => {
    setEditId(row.id)
    const allowed = designOptionsForSim(row.simulatorSlug)
    const raw = row.designColor as CertificateDesignColor | undefined
    const designColor = allowed.some((o) => o.value === raw)
      ? (raw as CertificateDesignColor)
      : defaultDesignForSim(row.simulatorSlug)
    setForm({
      number: row.number,
      phone: row.phone,
      fullName: row.fullName,
      durationMin: row.durationMin,
      paymentMethod: row.paymentMethod ?? 'OFFLINE',
      paymentStatus: 'PAID',
      validFrom: row.validFrom,
      validTo: row.validTo,
      simulatorSlug: row.simulatorSlug,
      designColor,
      status: row.status,
      comment: row.comment,
    })
    setFormOpen(true)
  }

  const save = async () => {
    setActionBusy(true)
    try {
      const payload = {
        ...form,
        paymentStatus: 'PAID' as const,
        paymentMethod: (editId ? form.paymentMethod : 'OFFLINE') as 'ONLINE' | 'OFFLINE',
        designColor: form.designColor,
      }
      if (editId) {
        const previous = rows.find((r) => r.id === editId)
        await apiFetch(`/api/admin/certificates/${editId}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        })
        if (previous) {
          pushUndo({
            label: `Отменить изменение сертификата «${previous.number}»`,
            run: async () => {
              await apiFetch(`/api/admin/certificates/${previous.id}`, {
                method: 'PATCH',
                body: JSON.stringify({ ...previous, paymentStatus: 'PAID' }),
              })
              void reload()
            },
          })
        }
      } else {
        const created = await apiFetch<ApiCertificate>('/api/admin/certificates', {
          method: 'POST',
          body: JSON.stringify(payload),
        })
        pushUndo({
          label: `Отменить создание сертификата «${created.number}»`,
          run: async () => {
            await apiFetch(`/api/admin/certificates/${created.id}`, { method: 'DELETE' })
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

  const remove = async () => {
    if (!deleteTarget) return
    setActionBusy(true)
    try {
      const snapshot = deleteTarget
      await apiFetch(`/api/admin/certificates/${snapshot.id}`, { method: 'DELETE' })
      pushUndo({
        label: `Отменить удаление сертификата «${snapshot.number}»`,
        run: async () => {
          await apiFetch('/api/admin/certificates', {
            method: 'POST',
            body: JSON.stringify(snapshot),
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

      <p className="text-xs text-muted-foreground">
        Статус по сроку: зелёный (&gt;30 дн.), жёлтый (≤30), красный (≤7 или просрочен) — для обзвона.
        Фон строки — цвет бланка тренажёра.
      </p>

      <AdminFormModal
        open={formOpen}
        title={editId ? 'Редактировать сертификат' : 'Новый сертификат'}
        onClose={() => setFormOpen(false)}
      >
        <div className="grid gap-3 sm:grid-cols-2">
          {(
            [
              ['number', 'Номер'],
              ['fullName', 'ФИО'],
              ['phone', 'Телефон'],
              ['validFrom', 'С', 'date'],
              ['validTo', 'По', 'date'],
              ['comment', 'Комментарий'],
            ] as const
          ).map(([key, label, type]) => (
            <label key={key} className="text-sm">
              <span className="text-muted-foreground">{label}</span>
              <Input
                type={type ?? 'text'}
                className="mt-1 h-9"
                value={String(form[key as keyof typeof form] ?? '')}
                onChange={(e) => {
                  const value = e.target.value
                  if (key === 'validFrom') {
                    const from = parseISO(value)
                    setForm((f) => ({
                      ...f,
                      validFrom: value,
                      validTo:
                        value && isValid(from)
                          ? format(addMonths(from, 3), 'yyyy-MM-dd')
                          : f.validTo,
                    }))
                    return
                  }
                  setForm((f) => ({ ...f, [key]: value }))
                }}
              />
            </label>
          ))}
          <label className="text-sm">
            <span className="text-muted-foreground">Тренажёр</span>
            <select
              className={selectClass}
              value={form.simulatorSlug}
              onChange={(e) => {
                const simulatorSlug = e.target.value
                const nextColors = designOptionsForSim(simulatorSlug)
                setForm((f) => ({
                  ...f,
                  simulatorSlug,
                  durationMin:
                    simulatorSlug === 'combo'
                      ? 60
                      : f.durationMin > 60 && simulatorSlug === 'mi-2'
                        ? 60
                        : f.durationMin,
                  // Цвет только из палитры нового тренажёра
                  designColor: nextColors.some((o) => o.value === f.designColor)
                    ? f.designColor
                    : defaultDesignForSim(simulatorSlug),
                }))
              }}
            >
              {CERT_SIMULATOR_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            <span className="text-muted-foreground">Минуты</span>
            <select
              className={selectClass}
              value={form.durationMin}
              onChange={(e) => setForm((f) => ({ ...f, durationMin: Number(e.target.value) }))}
            >
              {durationOptions.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </label>
          <div className="text-sm sm:col-span-2">
            <span className="text-muted-foreground">Цвет бланка</span>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Только цвета для выбранного тренажёра. Смените тренажёр — откроются другие варианты.
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {designOptions.map((o) => {
                const selected = form.designColor === o.value
                return (
                  <button
                    key={o.value}
                    type="button"
                    className={cn(
                      'inline-flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-sm transition-colors',
                      selected
                        ? 'border-foreground ring-1 ring-foreground'
                        : 'border-border hover:bg-muted/50',
                    )}
                    style={{ backgroundColor: o.rowBg }}
                    onClick={() => setForm((f) => ({ ...f, designColor: o.value }))}
                  >
                    <span
                      className="inline-block size-3.5 shrink-0 rounded-full border border-black/15"
                      style={{ backgroundColor: o.swatch }}
                    />
                    {o.label}
                  </button>
                )
              })}
            </div>
          </div>
          <label className="text-sm">
            <span className="text-muted-foreground">Статус</span>
            <select
              className={selectClass}
              value={form.status}
              onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
            >
              {CERTIFICATE_STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            <span className="text-muted-foreground">Способ оплаты</span>
            {editId ? (
              <select
                className={selectClass}
                value={form.paymentMethod}
                onChange={(e) =>
                  setForm((f) => ({ ...f, paymentMethod: e.target.value as 'ONLINE' | 'OFFLINE' }))
                }
              >
                {PAYMENT_METHOD_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            ) : (
              <p className="mt-1 flex h-9 items-center text-sm text-foreground">
                В офисе
                <span className="ml-2 text-xs text-muted-foreground">(для сертификатов из админки)</span>
              </p>
            )}
          </label>
          <p className="text-sm font-medium text-emerald-700 sm:col-span-2">
            Оплата: всегда оплачен
          </p>
          <div className="flex gap-2 sm:col-span-2">
            <Button type="button" onClick={() => setSaveConfirmOpen(true)}>
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
        title={editId ? 'Сохранить изменения?' : 'Создать сертификат?'}
        description={
          editId
            ? `Сертификат «${form.number || 'без номера'}» будет обновлён. Действие можно отменить вверху страницы.`
            : 'Будет создан новый сертификат. Действие можно отменить вверху страницы.'
        }
        confirmLabel="Сохранить"
        busy={actionBusy}
        onConfirm={() => void save()}
        onCancel={() => setSaveConfirmOpen(false)}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        title="Удалить сертификат?"
        description={
          deleteTarget
            ? `Сертификат «${deleteTarget.number}» (${deleteTarget.fullName}) будет удалён. Действие можно отменить вверху страницы.`
            : undefined
        }
        confirmLabel="Удалить"
        destructive
        busy={actionBusy}
        onConfirm={() => void remove()}
        onCancel={() => setDeleteTarget(null)}
      />

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
              <TableHead>Срок / статус</TableHead>
              {canEdit ? <TableHead className="w-24" /> : null}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((row) => {
              const urgency = certificateUrgency(row.validTo, row.status)
              const design = designMeta(row.designColor || defaultDesignForSim(row.simulatorSlug))
              const props = rowProps(row.id)
              return (
                <TableRow
                  key={row.id}
                  data-highlight-id={props['data-highlight-id']}
                  className={cn(props.className)}
                >
                  <TableCell className="font-medium">{row.number}</TableCell>
                  <TableCell>{row.phone}</TableCell>
                  <TableCell>{row.fullName}</TableCell>
                  <TableCell>{row.durationMin}</TableCell>
                  <TableCell>
                    <span className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-700">
                      Оплачен
                      <PaymentMethodIcon method={row.paymentMethod} />
                    </span>
                  </TableCell>
                  <TableCell>
                    {row.validFrom} — {row.validTo}
                  </TableCell>
                  <TableCell>
                    <span
                      className="inline-flex items-center gap-1.5 rounded-md px-2 py-1"
                      style={{ backgroundColor: design.rowBg }}
                      title={design.label}
                    >
                      <span
                        className="inline-block size-2.5 shrink-0 rounded-full border border-black/10"
                        style={{ backgroundColor: design.swatch }}
                      />
                      {labelOf(CERT_SIMULATOR_OPTIONS, row.simulatorSlug)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span
                      className={cn(
                        'inline-flex rounded-md border px-2 py-0.5 text-xs font-semibold',
                        URGENCY_BADGE_CLASS[urgency.tone],
                      )}
                    >
                      {urgency.label}
                    </span>
                    {!urgency.expired &&
                    row.status !== 'ACTIVE' &&
                    row.status !== 'PARTIAL' ? (
                      <span className="mt-1 block text-[11px] text-muted-foreground">
                        {labelOf(CERTIFICATE_STATUS_OPTIONS, row.status)}
                      </span>
                    ) : null}
                  </TableCell>
                  {canEdit ? (
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="size-8"
                          onClick={() => openEdit(row)}
                        >
                          <img src={PENCIL} alt="" className="size-4" width={16} height={16} />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="size-8 text-destructive"
                          onClick={() => setDeleteTarget(row)}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </TableCell>
                  ) : null}
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
