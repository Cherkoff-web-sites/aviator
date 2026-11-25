import * as React from 'react'
import { format, parseISO } from 'date-fns'
import { ru } from 'date-fns/locale'
import { MoreHorizontal, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import AdminFormModal from '@/components/admin/AdminFormModal'
import ConfirmDialog from '@/components/admin/ConfirmDialog'
import {
  AdminDataTable,
  type AdminColumnDef,
} from '@/components/admin/AdminDataTable'
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
import {
  durationChoicesFromList,
  simulatorChoicesFromList,
  type OptionListRow,
} from '@/lib/option-list-utils'
import {
  allDesignOptions,
  buildCertificateNumber,
  certificateUrgency,
  defaultCertificateValidToIso,
  defaultDesignForSim,
  designMeta,
  designOptionsForSim,
  maxDigitsForCode,
  parseCertificateParts,
  URGENCY_BADGE_CLASS,
  type CertificateDesignColor,
} from '@/lib/certificate-design'
import { useCertificateDesigns } from '@/hooks/useCertificateDesigns'
import { useServerClock } from '@/contexts/ServerClockContext'
import { sanitizeCertificateDigitsInput } from '@/lib/fieldInput'
import { formatAdminDate } from '@/lib/admin-date'
import { cn } from '@/lib/utils'

const PENCIL = '/assets/admin/certificates_pencil_icon.svg'

const selectClass =
  'mt-1 flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-sm'

/** bump: trigger deploy */
export default function AdminCertificatesPage() {
  const [formOpen, setFormOpen] = React.useState(false)
  const [editId, setEditId] = React.useState<string | null>(null)
  const [saveConfirmOpen, setSaveConfirmOpen] = React.useState(false)
  const [saveError, setSaveError] = React.useState('')
  const [deleteTarget, setDeleteTarget] = React.useState<ApiCertificate | null>(null)
  const [actionBusy, setActionBusy] = React.useState(false)
  const { session } = useAdminAuth()
  const { pushUndo } = useAdminUndo()
  const { now: serverNow } = useServerClock()
  const canEdit = session ? canEditBookings(session.role) : false
  const todayKey = format(serverNow, 'yyyy-MM-dd')

  const { data, reload } = useLiveData(
    () => apiFetch<ApiCertificate[]>('/api/admin/certificates'),
    [],
  )
  const rows = data ?? []
  const { rowProps } = useHighlightRow(data !== null)

  const [form, setForm] = React.useState({
    number: '',
    phone: '',
    email: '',
    fullName: '',
    durationMin: 30,
    paymentMethod: 'OFFLINE' as 'ONLINE' | 'OFFLINE',
    paymentStatus: 'PAID' as const,
    validFrom: format(new Date(), 'yyyy-MM-dd'),
    validTo: defaultCertificateValidToIso(format(new Date(), 'yyyy-MM-dd')),
    simulatorSlug: 'boeing-737',
    designColor: 'es-b737ng' as CertificateDesignColor,
    status: 'ACTIVE',
    comment: '',
  })

  const { designs: certDesignRows } = useCertificateDesigns(true)
  const seriesOptions = allDesignOptions(certDesignRows)

  const { data: optionLists } = useLiveData(
    () =>
      apiFetch<{
        cert_duration: OptionListRow[]
        cert_simulator: OptionListRow[]
        duration: OptionListRow[]
      }>('/api/admin/settings/option-lists'),
    [],
  )
  const certSimOptions = React.useMemo(
    () =>
      simulatorChoicesFromList(optionLists?.cert_simulator, [...CERT_SIMULATOR_OPTIONS]),
    [optionLists],
  )

  const numberParts = React.useMemo(
    () => parseCertificateParts(form.number, certDesignRows),
    [form.number, certDesignRows],
  )

  const loadNextNumber = async (simulatorSlug: string, designColor: CertificateDesignColor) => {
    const { number } = await apiFetch<{ number: string }>(
      `/api/admin/certificates/next-number?simulatorSlug=${encodeURIComponent(simulatorSlug)}&designColor=${encodeURIComponent(designColor)}`,
    )
    return number
  }

  const applyNumberParts = (code: string, digits: string) => {
    setForm((f) => ({ ...f, number: buildCertificateNumber(code, digits) }))
  }

  const openCreate = () => {
    setEditId(null)
    setSaveError('')
    const first = seriesOptions[0]
    const designColor = first?.value ?? defaultDesignForSim('boeing-737', certDesignRows)
    const simulatorSlug = first?.simulatorSlug ?? 'boeing-737'
    const durationMin =
      typeof first?.durationMin === 'number' && first.durationMin > 0 ? first.durationMin : 60
    setForm({
      number: '',
      phone: '',
      email: '',
      fullName: '',
      durationMin,
      paymentMethod: 'OFFLINE',
      paymentStatus: 'PAID',
      validFrom: format(new Date(), 'yyyy-MM-dd'),
      validTo: defaultCertificateValidToIso(format(new Date(), 'yyyy-MM-dd')),
      simulatorSlug,
      designColor,
      status: 'ACTIVE',
      comment: '',
    })
    setFormOpen(true)
    void loadNextNumber(simulatorSlug, designColor).then((number) =>
      setForm((f) => (f.number ? f : { ...f, number })),
    )
  }

  const openEdit = (row: ApiCertificate) => {
    setEditId(row.id)
    setSaveError('')
    const allowed = designOptionsForSim(row.simulatorSlug, certDesignRows)
    const raw = row.designColor as CertificateDesignColor | undefined
    const designColor = allowed.some((o) => o.value === raw)
      ? (raw as CertificateDesignColor)
      : defaultDesignForSim(row.simulatorSlug, certDesignRows)
    setForm({
      number: row.number,
      phone: row.phone,
      email: row.email ?? '',
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

  const durationFilterOptions = React.useMemo(() => {
    const fromList = durationChoicesFromList(
      optionLists?.cert_duration ?? optionLists?.duration,
    ).map((d) => d.value)
    const set = new Set<number>(fromList)
    for (const row of rows) set.add(row.durationMin)
    return [...set]
      .sort((a, b) => a - b)
      .map((d) => ({ value: String(d), label: `${d} мин` }))
  }, [rows, optionLists])

  const columns: AdminColumnDef<ApiCertificate>[] = [
    {
      id: 'number',
      header: 'Номер',
      accessor: 'number',
      filterLabel: 'Серия номера',
      filterType: 'enum',
      enumOptions: seriesOptions.map((o) => ({
        value: o.code,
        label: o.code,
      })),
      filterMatch: (r) =>
        designMeta(
          r.designColor || defaultDesignForSim(r.simulatorSlug, certDesignRows),
          certDesignRows,
        ).code,
      filterValue: (r) => r.number,
      className: 'font-medium',
    },
    { id: 'phone', header: 'Телефон', accessor: 'phone', sortable: false },
    { id: 'email', header: 'Email', accessor: (r) => r.email ?? '' },
    { id: 'fullName', header: 'ФИО', accessor: 'fullName' },
    {
      id: 'durationMin',
      header: '',
      filterLabel: 'Минуты',
      accessor: 'durationMin',
      filterType: 'enum',
      enumOptions: durationFilterOptions,
      filterMatch: (r) => String(r.durationMin),
      headerClassName: 'w-12 px-2 text-center',
      className: 'px-2 text-center tabular-nums',
    },
    {
      id: 'method',
      header: '',
      filterLabel: 'Способ',
      accessor: (r) => r.paymentMethod ?? 'OFFLINE',
      filterType: 'enum',
      enumOptions: [...PAYMENT_METHOD_OPTIONS],
      filterValue: (r) => labelOf(PAYMENT_METHOD_OPTIONS, r.paymentMethod ?? 'OFFLINE'),
      headerClassName: 'w-10 px-2 text-center',
      className: 'px-2 text-center',
      cell: (row) => <PaymentMethodIcon method={row.paymentMethod} />,
    },
    {
      id: 'period',
      header: 'Период',
      accessor: (r) => r.validFrom,
      filterValue: (r) =>
        `${formatAdminDate(r.validFrom)} ${formatAdminDate(r.validTo)}`,
      cell: (row) => (
        <>
          {formatAdminDate(row.validFrom)} — {formatAdminDate(row.validTo)}
        </>
      ),
    },
    {
      id: 'simulatorSlug',
      header: 'Тренажёр',
      filterLabel: 'Тип сертификата',
      accessor: 'simulatorSlug',
      filterType: 'enum',
      enumOptions: certSimOptions,
      filterValue: (r) => labelOf(certSimOptions, r.simulatorSlug),
      cell: (row) => {
        const design = designMeta(
          row.designColor || defaultDesignForSim(row.simulatorSlug, certDesignRows),
          certDesignRows,
        )
        return (
          <span
            className="inline-flex items-center gap-1.5 rounded-md px-2 py-1"
            style={{ backgroundColor: design.rowBg }}
            title={design.label}
          >
            <span
              className="inline-block size-2.5 shrink-0 rounded-full border border-black/10"
              style={{ backgroundColor: design.swatch }}
            />
            {labelOf(certSimOptions, row.simulatorSlug)}
          </span>
        )
      },
    },
    {
      id: 'status',
      header: 'Срок / статус',
      filterLabel: 'Статус',
      accessor: 'status',
      filterType: 'enum',
      enumOptions: [...CERTIFICATE_STATUS_OPTIONS],
      // ACTIVE + прошедшая дата (по серверным/демо-часам) → EXPIRED
      filterMatch: (r) => {
        if (r.status === 'CANCELLED' || r.status === 'USED' || r.status === 'PARTIAL') {
          return r.status
        }
        if (r.status === 'PENDING_CONFIRMATION') return r.status
        if (r.status === 'EXPIRED' || r.validTo < todayKey) return 'EXPIRED'
        return r.status || 'ACTIVE'
      },
      filterValue: (r) => certificateUrgency(r.validTo, r.status, serverNow).label,
      cell: (row) => {
        const display = certificateUrgency(row.validTo, row.status, serverNow)
        return (
          <div className="flex flex-col gap-1">
            <span className="text-xs text-muted-foreground">
              {formatAdminDate(row.validFrom)} – {formatAdminDate(row.validTo)}
            </span>
            <span
              className={cn(
                'inline-flex w-fit rounded-md border px-2 py-0.5 text-xs font-semibold',
                URGENCY_BADGE_CLASS[display.tone],
              )}
            >
              {display.label}
            </span>
          </div>
        )
      },
    },
    ...(canEdit
      ? ([
          {
            id: 'actions',
            header: '',
            sortable: false,
            filterable: false,
            headerClassName: 'w-10 text-right pr-2',
            cell: (row: ApiCertificate) => (
              <div className="flex justify-end">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="size-8">
                      <MoreHorizontal className="size-4" />
                      <span className="sr-only">Ещё</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => openEdit(row)}>
                      <img src={PENCIL} alt="" className="size-4" width={16} height={16} />
                      Редактировать
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-destructive focus:bg-destructive/10 focus:text-destructive"
                      onClick={() => setDeleteTarget(row)}
                    >
                      <Trash2 className="size-4" />
                      Удалить
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ),
          },
        ] satisfies AdminColumnDef<ApiCertificate>[])
      : []),
  ]

  const save = async () => {
    setActionBusy(true)
    setSaveError('')
    try {
      const payload = {
        ...form,
        number: form.number.trim(),
        paymentStatus: 'PAID' as const,
        paymentMethod: (editId ? form.paymentMethod : 'OFFLINE') as 'ONLINE' | 'OFFLINE',
        designColor: form.designColor,
      }
      if (!payload.number) {
        setSaveError('Укажите номер сертификата')
        setSaveConfirmOpen(false)
        return
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
    } catch (err) {
      const msg =
        err instanceof Error && err.message.trim()
          ? err.message
          : 'Не удалось сохранить сертификат'
      setSaveError(msg)
      setSaveConfirmOpen(false)
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

      <p className="text-xs text-muted-foreground">
        Статус по сроку: зелёный (&gt;30 дн.), жёлтый (≤30), красный (≤7 или просрочен) — для обзвона.
        Фон строки — цвет бланка тренажёра. Клик по заголовку — сортировка; поиск и фильтры — над таблицей.
      </p>

      <AdminFormModal
        open={formOpen}
        title={editId ? 'Редактировать сертификат' : 'Новый сертификат'}
        onClose={() => setFormOpen(false)}
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="text-sm sm:col-span-2">
            <span className="text-muted-foreground">
              {editId ? 'Номер' : 'Серия + номер (макс. 13 букв/цифр, тире не считаются)'}
            </span>
            <div className="mt-1 flex items-center gap-1.5">
              <select
                className="h-9 min-w-[10rem] flex-1 rounded-md border bg-background px-2 text-sm font-mono"
                value={numberParts.code}
                onChange={(e) => {
                  const code = e.target.value
                  const design = seriesOptions.find((o) => o.code === code)
                  const simulatorSlug = design?.simulatorSlug ?? form.simulatorSlug
                  const durationMin =
                    typeof design?.durationMin === 'number' && design.durationMin > 0
                      ? design.durationMin
                      : form.durationMin
                  const designColor = design?.value ?? form.designColor
                  setForm((f) => ({
                    ...f,
                    designColor,
                    simulatorSlug,
                    durationMin,
                  }))
                  if (!editId) {
                    void loadNextNumber(simulatorSlug, designColor).then((number) =>
                      setForm((f) => ({ ...f, number })),
                    )
                  } else {
                    applyNumberParts(code, numberParts.digits)
                  }
                }}
              >
                {seriesOptions.map((o) => (
                  <option key={o.value} value={o.code}>
                    {o.code}
                  </option>
                ))}
              </select>
              <Input
                className="h-9 w-[6.5rem] font-mono"
                inputMode="numeric"
                value={numberParts.digits}
                title="Можно изменить вручную; дубликаты не сохранятся"
                onChange={(e) => {
                  applyNumberParts(
                    numberParts.code,
                    sanitizeCertificateDigitsInput(
                      e.target.value,
                      maxDigitsForCode(numberParts.code),
                    ),
                  )
                }}
              />
            </div>
            {!editId ? (
              <p className="mt-1 text-xs text-muted-foreground">
                Серия задаёт тренажёр, минуты и цвет бланка. Номер подставляется следующий
                свободный — можно поправить вручную.
              </p>
            ) : null}
            {saveError ? (
              <p className="mt-1.5 text-sm font-medium text-destructive">{saveError}</p>
            ) : null}
          </div>
          {(
            [
              ['fullName', 'ФИО'],
              ['phone', 'Телефон'],
              ['email', 'Email'],
              ['comment', 'Комментарий'],
            ] as const
          ).map(([key, label]) => (
            <label key={key} className="text-sm">
              <span className="text-muted-foreground">{label}</span>
              <Input
                className="mt-1 h-9"
                value={String(form[key as keyof typeof form] ?? '')}
                onChange={(e) => {
                  const value = e.target.value
                  setForm((f) => ({ ...f, [key]: value }))
                }}
              />
            </label>
          ))}
          <div className="text-sm sm:col-span-2">
            <span className="text-muted-foreground">Срок действия</span>
            <p className="mt-1 text-xs text-muted-foreground">
              Выберите дату начала в календаре. Дата окончания — автоматически +90 дней (~3 месяца).
            </p>
            <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-start">
              <Calendar
                mode="single"
                locale={ru}
                selected={form.validFrom ? parseISO(form.validFrom) : undefined}
                onSelect={(d) => {
                  if (!d) return
                  const validFrom = format(d, 'yyyy-MM-dd')
                  setForm((f) => ({
                    ...f,
                    validFrom,
                    validTo: defaultCertificateValidToIso(validFrom),
                  }))
                }}
                className="w-fit max-w-full rounded-lg border"
              />
              <div className="flex min-w-[12rem] flex-col gap-2 rounded-lg border bg-muted/30 p-3 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">С</p>
                  <p className="font-medium tabular-nums">{formatAdminDate(form.validFrom)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">По (авто)</p>
                  <p className="font-medium tabular-nums">{formatAdminDate(form.validTo)}</p>
                </div>
              </div>
            </div>
          </div>
          <div className="text-sm">
            <span className="text-muted-foreground">Тренажёр</span>
            <p className="mt-1 flex h-9 items-center rounded-md border bg-muted/40 px-3 text-sm">
              {certSimOptions.find((o) => o.value === form.simulatorSlug)?.label ??
                form.simulatorSlug}
            </p>
          </div>
          <div className="text-sm">
            <span className="text-muted-foreground">Минуты</span>
            <p className="mt-1 flex h-9 items-center rounded-md border bg-muted/40 px-3 text-sm font-mono">
              {form.durationMin} мин
            </p>
          </div>
          <div className="text-sm sm:col-span-2">
            <span className="text-muted-foreground">Цвет бланка</span>
            <div className="mt-2 inline-flex items-center gap-2 rounded-md border border-border px-2.5 py-1.5 text-sm"
              style={{
                backgroundColor:
                  designMeta(form.designColor, certDesignRows).rowBg,
              }}
            >
              <span
                className="inline-block size-3.5 shrink-0 rounded-full border border-black/15"
                style={{
                  backgroundColor: designMeta(form.designColor, certDesignRows).swatch,
                }}
              />
              {designMeta(form.designColor, certDesignRows).code}
            </div>
          </div>
          <label className="text-sm">
            <span className="text-muted-foreground">Статус</span>
            <select
              className={selectClass}
              value={form.status}
              onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
            >
              {CERTIFICATE_STATUS_OPTIONS.filter((o) =>
                editId ? true : o.value !== 'PENDING_CONFIRMATION',
              ).map((o) => (
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
                При посещении
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

      <AdminDataTable
        rows={rows}
        columns={columns}
        rowKey={(row) => row.id}
        searchPlaceholder="Поиск по номеру, телефону или ФИО"
        emptyText="Сертификаты не найдены"
        getRowProps={(row) => {
          const props = rowProps(row.id)
          return {
            'data-highlight-id': props['data-highlight-id'],
            className: props.className,
          }
        }}
      />
    </div>
  )
}
