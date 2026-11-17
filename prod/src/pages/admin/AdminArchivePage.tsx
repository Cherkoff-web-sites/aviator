import * as React from 'react'
import { format, parseISO, isValid } from 'date-fns'
import { Archive, RotateCcw, Trash2 } from 'lucide-react'
import ConfirmDialog from '@/components/admin/ConfirmDialog'
import {
  AdminDataTable,
  type AdminColumnDef,
} from '@/components/admin/AdminDataTable'
import { Button } from '@/components/ui/button'
import { useLiveData } from '@/hooks/useLiveData'
import { useAdminAuth } from '@/contexts/AdminAuthContext'
import { apiFetch } from '@/lib/api'
import {
  labelOf,
  CERT_SIMULATOR_OPTIONS,
  ACCOUNT_ROLE_OPTIONS,
  BOOKING_STATUS_OPTIONS,
} from '@/lib/admin-labels'
import { cn } from '@/lib/utils'

type ArchiveEntry = {
  id: string
  section: string
  kind?: string
  entityId: string
  title: string
  summary: string
  payload: Record<string, unknown>
  deletedAt: string
  expiresAt: string
  deletedByName?: string
  sourcePath: string
}

type ArchiveSection = {
  key: string
  title: string
  sourcePath: string
  items: ArchiveEntry[]
}

type ArchivePayload = {
  retentionDays: number
  sections: ArchiveSection[]
  total: number
}

function fmtDate(iso: string) {
  try {
    const d = parseISO(iso)
    return isValid(d) ? format(d, 'dd.MM.yyyy HH:mm') : iso
  } catch {
    return iso
  }
}

function daysLeft(expiresAt: string) {
  const ms = new Date(expiresAt).getTime() - Date.now()
  return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)))
}

function payloadStr(p: Record<string, unknown>, key: string) {
  const v = p[key]
  if (v == null || v === '') return '—'
  return String(v)
}

export default function AdminArchivePage() {
  const { role } = useAdminAuth()
  const { data, reload } = useLiveData(
    () => apiFetch<ArchivePayload>('/api/admin/archive'),
    [role],
  )
  const [restoreId, setRestoreId] = React.useState<string | null>(null)
  const [purgeId, setPurgeId] = React.useState<string | null>(null)
  const [busy, setBusy] = React.useState(false)

  const sections = data?.sections ?? []
  const total = data?.total ?? 0

  const findEntry = (id: string | null) => {
    if (!id) return null
    for (const s of sections) {
      const hit = s.items.find((i) => i.id === id)
      if (hit) return hit
    }
    return null
  }

  const restoreTarget = findEntry(restoreId)
  const purgeTarget = findEntry(purgeId)

  const doRestore = async () => {
    if (!restoreId) return
    setBusy(true)
    try {
      await apiFetch(`/api/admin/archive/${restoreId}/restore`, { method: 'POST' })
      setRestoreId(null)
      void reload()
    } finally {
      setBusy(false)
    }
  }

  const doPurge = async () => {
    if (!purgeId) return
    setBusy(true)
    try {
      await apiFetch(`/api/admin/archive/${purgeId}`, { method: 'DELETE' })
      setPurgeId(null)
      void reload()
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex w-full min-w-0 flex-col gap-6">
      <div className="rounded-lg border bg-background p-4">
        <div className="flex items-start gap-3">
          <Archive className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
          <div>
            <h2 className="text-base font-semibold">Архив удалений</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Записи хранятся {data?.retentionDays ?? 30} дней, затем удаляются автоматически.
              Сейчас в архиве: {total}. Можно просмотреть текст и восстановить.
            </p>
          </div>
        </div>
      </div>

      {sections.map((section) => (
        <section key={section.key} className="flex flex-col gap-3 rounded-lg border bg-background p-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="text-sm font-semibold">{section.title}</h3>
            <span className="text-xs text-muted-foreground">
              {section.items.length
                ? `${section.items.length} запис.`
                : 'Пусто'}
            </span>
          </div>

          {section.items.length === 0 ? (
            <p className="text-sm text-muted-foreground">Удалённых записей из этого раздела нет.</p>
          ) : (
            <ArchiveSectionTable
              sectionKey={section.key}
              items={section.items}
              onRestore={setRestoreId}
              onPurge={setPurgeId}
            />
          )}
        </section>
      ))}

      <ConfirmDialog
        open={!!restoreTarget}
        title="Восстановить запись?"
        description={
          restoreTarget
            ? `«${restoreTarget.title}» вернётся на исходную страницу.`
            : undefined
        }
        confirmLabel="Восстановить"
        busy={busy}
        onConfirm={() => void doRestore()}
        onCancel={() => setRestoreId(null)}
      />

      <ConfirmDialog
        open={!!purgeTarget}
        title="Удалить из архива навсегда?"
        description={
          purgeTarget
            ? `«${purgeTarget.title}» будет стёрта без возможности восстановления.`
            : undefined
        }
        confirmLabel="Удалить навсегда"
        destructive
        busy={busy}
        onConfirm={() => void doPurge()}
        onCancel={() => setPurgeId(null)}
      />
    </div>
  )
}

function Actions({
  entry,
  onRestore,
  onPurge,
}: {
  entry: ArchiveEntry
  onRestore: (id: string) => void
  onPurge: (id: string) => void
}) {
  return (
    <div className="inline-flex items-center justify-end gap-0.5">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="size-8 text-muted-foreground"
        aria-label="Восстановить"
        title="Восстановить"
        onClick={() => onRestore(entry.id)}
      >
        <RotateCcw className="size-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="size-8 text-muted-foreground hover:text-destructive"
        aria-label="Удалить навсегда"
        title="Удалить навсегда"
        onClick={() => onPurge(entry.id)}
      >
        <Trash2 className="size-4" />
      </Button>
    </div>
  )
}

function archiveKindLabel(kind: string | undefined) {
  if (kind === 'flight_prices') return 'Цена полёта'
  if (kind === 'cert_prices') return 'Цена сертификата'
  if (kind === 'promos') return 'Акция'
  return kind ?? '—'
}

function metaColumns(
  onRestore: (id: string) => void,
  onPurge: (id: string) => void,
): AdminColumnDef<ArchiveEntry>[] {
  return [
    {
      id: 'deletedAt',
      header: 'Удалено',
      accessor: 'deletedAt',
      filterValue: (e) =>
        `${fmtDate(e.deletedAt)}${e.deletedByName ? ` ${e.deletedByName}` : ''}`,
      cell: (entry) => (
        <span className="whitespace-nowrap text-xs text-muted-foreground">
          {fmtDate(entry.deletedAt)}
          {entry.deletedByName ? (
            <span className="mt-0.5 block">{entry.deletedByName}</span>
          ) : null}
        </span>
      ),
    },
    {
      id: 'expiresAt',
      header: 'Осталось',
      accessor: 'expiresAt',
      filterValue: (e) => `${daysLeft(e.expiresAt)} дн.`,
      cell: (entry) => (
        <span className="whitespace-nowrap text-xs text-muted-foreground">
          {daysLeft(entry.expiresAt)} дн.
        </span>
      ),
    },
    {
      id: 'actions',
      header: '',
      sortable: false,
      filterable: false,
      headerClassName: 'w-[88px] text-right',
      cell: (entry) => <Actions entry={entry} onRestore={onRestore} onPurge={onPurge} />,
    },
  ]
}

function archiveColumnsForSection(
  sectionKey: string,
  onRestore: (id: string) => void,
  onPurge: (id: string) => void,
): AdminColumnDef<ArchiveEntry>[] {
  const tail = metaColumns(onRestore, onPurge)

  if (sectionKey === 'bookings') {
    return [
      {
        id: 'name',
        header: 'Имя',
        accessor: (e) => payloadStr(e.payload, 'name'),
        className: 'font-semibold',
      },
      { id: 'phone', header: 'Телефон', accessor: (e) => payloadStr(e.payload, 'phone') },
      {
        id: 'datetime',
        header: 'Дата / время',
        accessor: (e) => payloadStr(e.payload, 'date'),
        filterValue: (e) => {
          const p = e.payload
          return `${payloadStr(p, 'date')} ${payloadStr(p, 'startTime')} ${payloadStr(p, 'endTime')}`
        },
        cell: (entry) => {
          const p = entry.payload
          return (
            <span className="whitespace-nowrap text-sm">
              {payloadStr(p, 'date')} {payloadStr(p, 'startTime')}–{payloadStr(p, 'endTime')}
            </span>
          )
        },
      },
      {
        id: 'simulator',
        header: 'Тренажёр',
        accessor: (e) => String(e.payload.simulatorSlug ?? ''),
        filterValue: (e) =>
          e.payload.simulatorSlug === 'mi-2' ? 'Ми-2' : 'Boeing 737',
        cell: (entry) =>
          entry.payload.simulatorSlug === 'mi-2' ? 'Ми-2' : 'Boeing 737',
      },
      {
        id: 'status',
        header: 'Статус',
        accessor: (e) => String(e.payload.status ?? ''),
        filterType: 'enum',
        enumOptions: [...BOOKING_STATUS_OPTIONS],
        filterValue: (e) => labelOf(BOOKING_STATUS_OPTIONS, String(e.payload.status ?? '')),
        cell: (entry) => payloadStr(entry.payload, 'status'),
      },
      {
        id: 'comment',
        header: 'Комментарий',
        accessor: (e) => payloadStr(e.payload, 'comment'),
        className: 'max-w-[200px] text-sm',
      },
      ...tail,
    ]
  }

  if (sectionKey === 'certificates') {
    return [
      {
        id: 'number',
        header: 'Номер',
        accessor: (e) => payloadStr(e.payload, 'number'),
        className: 'font-medium',
      },
      { id: 'fullName', header: 'ФИО', accessor: (e) => payloadStr(e.payload, 'fullName') },
      { id: 'phone', header: 'Телефон', accessor: (e) => payloadStr(e.payload, 'phone') },
      {
        id: 'durationMin',
        header: 'Минуты',
        accessor: (e) => payloadStr(e.payload, 'durationMin'),
        filterType: 'number',
      },
      {
        id: 'simulator',
        header: 'Тренажёр',
        accessor: (e) => String(e.payload.simulatorSlug ?? ''),
        filterType: 'enum',
        enumOptions: [...CERT_SIMULATOR_OPTIONS],
        filterValue: (e) => labelOf(CERT_SIMULATOR_OPTIONS, String(e.payload.simulatorSlug ?? '')),
        cell: (entry) => labelOf(CERT_SIMULATOR_OPTIONS, String(entry.payload.simulatorSlug ?? '')),
      },
      {
        id: 'period',
        header: 'Период',
        accessor: (e) => payloadStr(e.payload, 'validFrom'),
        filterValue: (e) =>
          `${payloadStr(e.payload, 'validFrom')} ${payloadStr(e.payload, 'validTo')}`,
        cell: (entry) => (
          <span className="text-sm">
            {payloadStr(entry.payload, 'validFrom')} — {payloadStr(entry.payload, 'validTo')}
          </span>
        ),
      },
      ...tail,
    ]
  }

  if (sectionKey === 'waiting_room') {
    return [
      {
        id: 'date',
        header: 'Дата',
        accessor: (e) => payloadStr(e.payload, 'date'),
        className: 'whitespace-nowrap',
      },
      {
        id: 'line',
        header: 'Текст',
        accessor: (e) => payloadStr(e.payload, 'line'),
        className: 'max-w-[420px] text-sm leading-snug',
      },
      ...tail,
    ]
  }

  if (sectionKey === 'staff_shifts') {
    return [
      {
        id: 'pilot',
        header: 'Пилот',
        accessor: (e) => payloadStr(e.payload, 'userName'),
        filterValue: (e) =>
          payloadStr(e.payload, 'userName') !== '—' ? payloadStr(e.payload, 'userName') : e.title,
        cell: (entry) => {
          const p = entry.payload
          return payloadStr(p, 'userName') !== '—' ? payloadStr(p, 'userName') : entry.title
        },
        className: 'font-medium',
      },
      { id: 'date', header: 'Дата', accessor: (e) => payloadStr(e.payload, 'date') },
      {
        id: 'simulator',
        header: 'Тренажёр',
        accessor: (e) => String(e.payload.simulatorSlug ?? ''),
        filterValue: (e) =>
          e.payload.simulatorSlug === 'mi-2' ? 'Ми-2' : 'Boeing 737',
        cell: (entry) =>
          entry.payload.simulatorSlug === 'mi-2' ? 'Ми-2' : 'Boeing 737',
      },
      ...tail,
    ]
  }

  if (sectionKey === 'accounts') {
    return [
      {
        id: 'fullName',
        header: 'ФИО',
        accessor: (e) => payloadStr(e.payload, 'fullName'),
        className: 'font-semibold',
      },
      {
        id: 'login',
        header: 'Логин',
        accessor: (e) => payloadStr(e.payload, 'login'),
        className: 'font-mono text-[13px]',
      },
      {
        id: 'role',
        header: 'Роль',
        accessor: (e) => String(e.payload.role ?? ''),
        filterType: 'enum',
        enumOptions: [...ACCOUNT_ROLE_OPTIONS],
        filterValue: (e) => labelOf(ACCOUNT_ROLE_OPTIONS, String(e.payload.role ?? '')),
        cell: (entry) => labelOf(ACCOUNT_ROLE_OPTIONS, String(entry.payload.role ?? '')),
      },
      { id: 'phone', header: 'Телефон', accessor: (e) => payloadStr(e.payload, 'phone') },
      ...tail,
    ]
  }

  if (sectionKey === 'prices_promos') {
    return [
      {
        id: 'kind',
        header: 'Тип',
        accessor: (e) => e.kind ?? '',
        filterValue: (e) => archiveKindLabel(e.kind),
        cell: (entry) => (
          <span className="whitespace-nowrap text-sm">{archiveKindLabel(entry.kind)}</span>
        ),
      },
      {
        id: 'title',
        header: 'Название / строка',
        accessor: 'title',
        className: 'font-medium',
      },
      {
        id: 'summary',
        header: 'Детали',
        accessor: 'summary',
        className: 'max-w-[280px] text-sm',
      },
      ...tail,
    ]
  }

  return [
    {
      id: 'title',
      header: 'Запись',
      accessor: 'title',
      className: cn('whitespace-nowrap font-medium'),
    },
    {
      id: 'summary',
      header: 'Текст / детали',
      accessor: 'summary',
      className: 'max-w-[360px] text-sm leading-snug',
    },
    ...tail,
  ]
}

function ArchiveSectionTable({
  sectionKey,
  items,
  onRestore,
  onPurge,
}: {
  sectionKey: string
  items: ArchiveEntry[]
  onRestore: (id: string) => void
  onPurge: (id: string) => void
}) {
  const columns = React.useMemo(
    () => archiveColumnsForSection(sectionKey, onRestore, onPurge),
    [sectionKey, onRestore, onPurge],
  )

  return (
    <AdminDataTable
      rows={items}
      columns={columns}
      rowKey={(row) => row.id}
      searchPlaceholder="Поиск по разделу"
      emptyText="Ничего не найдено"
      scrollClassName="-mx-4 max-w-[calc(100vw-2rem)] overflow-x-auto sm:mx-0 sm:max-w-none"
    />
  )
}
