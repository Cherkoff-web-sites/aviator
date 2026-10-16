import * as React from 'react'
import { format, parseISO, isValid } from 'date-fns'
import { Archive, RotateCcw, Trash2 } from 'lucide-react'
import ConfirmDialog from '@/components/admin/ConfirmDialog'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useLiveData } from '@/hooks/useLiveData'
import { useAdminAuth } from '@/contexts/AdminAuthContext'
import { apiFetch } from '@/lib/api'
import { labelOf, CERT_SIMULATOR_OPTIONS, ACCOUNT_ROLE_OPTIONS } from '@/lib/admin-labels'
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
            <div className="-mx-4 max-w-[calc(100vw-2rem)] overflow-x-auto sm:mx-0 sm:max-w-none">
              <ArchiveSectionTable
                sectionKey={section.key}
                items={section.items}
                onRestore={setRestoreId}
                onPurge={setPurgeId}
              />
            </div>
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

function MetaCells({ entry }: { entry: ArchiveEntry }) {
  return (
    <>
      <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
        {fmtDate(entry.deletedAt)}
        {entry.deletedByName ? (
          <span className="mt-0.5 block">{entry.deletedByName}</span>
        ) : null}
      </TableCell>
      <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
        {daysLeft(entry.expiresAt)} дн.
      </TableCell>
    </>
  )
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
  if (sectionKey === 'bookings') {
    return (
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/40 hover:bg-muted/40">
            <TableHead>Имя</TableHead>
            <TableHead>Телефон</TableHead>
            <TableHead>Дата / время</TableHead>
            <TableHead>Тренажёр</TableHead>
            <TableHead>Статус</TableHead>
            <TableHead>Комментарий</TableHead>
            <TableHead>Удалено</TableHead>
            <TableHead>Осталось</TableHead>
            <TableHead className="w-[88px] text-right" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((entry) => {
            const p = entry.payload
            return (
              <TableRow key={entry.id}>
                <TableCell className="font-semibold">{payloadStr(p, 'name')}</TableCell>
                <TableCell>{payloadStr(p, 'phone')}</TableCell>
                <TableCell className="whitespace-nowrap text-sm">
                  {payloadStr(p, 'date')} {payloadStr(p, 'startTime')}–{payloadStr(p, 'endTime')}
                </TableCell>
                <TableCell>
                  {p.simulatorSlug === 'mi-2' ? 'Ми-2' : 'Boeing 737'}
                </TableCell>
                <TableCell>{payloadStr(p, 'status')}</TableCell>
                <TableCell className="max-w-[200px] text-sm">{payloadStr(p, 'comment')}</TableCell>
                <MetaCells entry={entry} />
                <TableCell className="text-right">
                  <Actions entry={entry} onRestore={onRestore} onPurge={onPurge} />
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    )
  }

  if (sectionKey === 'certificates') {
    return (
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/40 hover:bg-muted/40">
            <TableHead>Номер</TableHead>
            <TableHead>ФИО</TableHead>
            <TableHead>Телефон</TableHead>
            <TableHead>Минуты</TableHead>
            <TableHead>Тренажёр</TableHead>
            <TableHead>Период</TableHead>
            <TableHead>Удалено</TableHead>
            <TableHead>Осталось</TableHead>
            <TableHead className="w-[88px] text-right" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((entry) => {
            const p = entry.payload
            return (
              <TableRow key={entry.id}>
                <TableCell className="font-medium">{payloadStr(p, 'number')}</TableCell>
                <TableCell>{payloadStr(p, 'fullName')}</TableCell>
                <TableCell>{payloadStr(p, 'phone')}</TableCell>
                <TableCell>{payloadStr(p, 'durationMin')}</TableCell>
                <TableCell>
                  {labelOf(CERT_SIMULATOR_OPTIONS, String(p.simulatorSlug ?? ''))}
                </TableCell>
                <TableCell className="text-sm">
                  {payloadStr(p, 'validFrom')} — {payloadStr(p, 'validTo')}
                </TableCell>
                <MetaCells entry={entry} />
                <TableCell className="text-right">
                  <Actions entry={entry} onRestore={onRestore} onPurge={onPurge} />
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    )
  }

  if (sectionKey === 'waiting_room') {
    return (
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/40 hover:bg-muted/40">
            <TableHead>Дата</TableHead>
            <TableHead>Текст</TableHead>
            <TableHead>Удалено</TableHead>
            <TableHead>Осталось</TableHead>
            <TableHead className="w-[88px] text-right" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((entry) => (
            <TableRow key={entry.id}>
              <TableCell className="whitespace-nowrap">{payloadStr(entry.payload, 'date')}</TableCell>
              <TableCell className="max-w-[420px] text-sm leading-snug">
                {payloadStr(entry.payload, 'line')}
              </TableCell>
              <MetaCells entry={entry} />
              <TableCell className="text-right">
                <Actions entry={entry} onRestore={onRestore} onPurge={onPurge} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    )
  }

  if (sectionKey === 'staff_shifts') {
    return (
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/40 hover:bg-muted/40">
            <TableHead>Пилот</TableHead>
            <TableHead>Дата</TableHead>
            <TableHead>Тренажёр</TableHead>
            <TableHead>Удалено</TableHead>
            <TableHead>Осталось</TableHead>
            <TableHead className="w-[88px] text-right" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((entry) => {
            const p = entry.payload
            return (
              <TableRow key={entry.id}>
                <TableCell className="font-medium">
                  {payloadStr(p, 'userName') !== '—'
                    ? payloadStr(p, 'userName')
                    : entry.title}
                </TableCell>
                <TableCell>{payloadStr(p, 'date')}</TableCell>
                <TableCell>
                  {p.simulatorSlug === 'mi-2' ? 'Ми-2' : 'Boeing 737'}
                </TableCell>
                <MetaCells entry={entry} />
                <TableCell className="text-right">
                  <Actions entry={entry} onRestore={onRestore} onPurge={onPurge} />
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    )
  }

  if (sectionKey === 'accounts') {
    return (
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/40 hover:bg-muted/40">
            <TableHead>ФИО</TableHead>
            <TableHead>Логин</TableHead>
            <TableHead>Роль</TableHead>
            <TableHead>Телефон</TableHead>
            <TableHead>Удалено</TableHead>
            <TableHead>Осталось</TableHead>
            <TableHead className="w-[88px] text-right" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((entry) => {
            const p = entry.payload
            return (
              <TableRow key={entry.id}>
                <TableCell className="font-semibold">{payloadStr(p, 'fullName')}</TableCell>
                <TableCell className="font-mono text-[13px]">{payloadStr(p, 'login')}</TableCell>
                <TableCell>
                  {labelOf(ACCOUNT_ROLE_OPTIONS, String(p.role ?? ''))}
                </TableCell>
                <TableCell>{payloadStr(p, 'phone')}</TableCell>
                <MetaCells entry={entry} />
                <TableCell className="text-right">
                  <Actions entry={entry} onRestore={onRestore} onPurge={onPurge} />
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    )
  }

  if (sectionKey === 'prices_promos') {
    return (
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/40 hover:bg-muted/40">
            <TableHead>Тип</TableHead>
            <TableHead>Название / строка</TableHead>
            <TableHead>Детали</TableHead>
            <TableHead>Удалено</TableHead>
            <TableHead>Осталось</TableHead>
            <TableHead className="w-[88px] text-right" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((entry) => {
            const kindLabel =
              entry.kind === 'flight_prices'
                ? 'Цена полёта'
                : entry.kind === 'cert_prices'
                  ? 'Цена сертификата'
                  : entry.kind === 'promos'
                    ? 'Акция'
                    : entry.kind ?? '—'
            return (
              <TableRow key={entry.id}>
                <TableCell className="whitespace-nowrap text-sm">{kindLabel}</TableCell>
                <TableCell className="font-medium">{entry.title}</TableCell>
                <TableCell className="max-w-[280px] text-sm">{entry.summary}</TableCell>
                <MetaCells entry={entry} />
                <TableCell className="text-right">
                  <Actions entry={entry} onRestore={onRestore} onPurge={onPurge} />
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    )
  }

  // maintenance + schedule_settings
  return (
    <Table>
      <TableHeader>
        <TableRow className="bg-muted/40 hover:bg-muted/40">
          <TableHead>Запись</TableHead>
          <TableHead>Текст / детали</TableHead>
          <TableHead>Удалено</TableHead>
          <TableHead>Осталось</TableHead>
          <TableHead className="w-[88px] text-right" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((entry) => (
          <TableRow key={entry.id}>
            <TableCell className={cn('font-medium whitespace-nowrap')}>{entry.title}</TableCell>
            <TableCell className="max-w-[360px] text-sm leading-snug">{entry.summary}</TableCell>
            <MetaCells entry={entry} />
            <TableCell className="text-right">
              <Actions entry={entry} onRestore={onRestore} onPurge={onPurge} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
