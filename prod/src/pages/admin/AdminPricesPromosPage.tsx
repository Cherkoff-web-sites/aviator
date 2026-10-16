import * as React from 'react'
import { ChevronDown, Plus, Trash2, X } from 'lucide-react'
import ConfirmDialog from '@/components/admin/ConfirmDialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useLiveData } from '@/hooks/useLiveData'
import { apiFetch, type ApiPriceRow, type ApiPromo } from '@/lib/api'
import { useAdminAuth } from '@/contexts/AdminAuthContext'
import { useAdminUndo } from '@/contexts/AdminUndoContext'
import { canEditBookings } from '@/lib/admin-access'
import { labelOf, PROMO_TYPE_OPTIONS, SIMULATOR_OPTIONS } from '@/lib/admin-labels'
import { durationsForSimulator, FLIGHT_DURATIONS, MI2_MAX_DURATION_MIN } from '@/lib/flight-durations'

/** Варианты для графы «Продукт» в акциях. */
const PROMO_PRODUCT_OPTIONS = SIMULATOR_OPTIONS.map((o) => ({
  id: o.value,
  label: o.label,
}))

function parseProductType(raw: string): string[] {
  const parts = raw
    .split(/[,;]/)
    .map((s) => s.trim())
    .filter(Boolean)
  const ids: string[] = []
  for (const part of parts) {
    const lower = part.toLowerCase().replace(/\s+/g, ' ')
    const hit = PROMO_PRODUCT_OPTIONS.find((o) => {
      const label = o.label.toLowerCase()
      if (lower === label) return true
      if (o.id === 'boeing-737' && (lower.includes('boeing') || lower.includes('737'))) return true
      if (o.id === 'mi-2' && (lower.includes('ми-2') || lower.includes('mi-2') || lower === 'mi2'))
        return true
      return false
    })
    if (hit && !ids.includes(hit.id)) ids.push(hit.id)
  }
  return ids
}

function formatProductType(ids: string[]): string {
  return ids
    .map((id) => PROMO_PRODUCT_OPTIONS.find((o) => o.id === id)?.label)
    .filter(Boolean)
    .join(', ')
}

function ProductTypeMultiSelect({
  value,
  onChange,
  disabled,
}: {
  value: string
  onChange: (next: string) => void
  disabled?: boolean
}) {
  const selected = React.useMemo(() => parseProductType(value), [value])

  const toggle = (id: string) => {
    const next = selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]
    onChange(formatProductType(next))
  }

  const remove = (id: string) => {
    onChange(formatProductType(selected.filter((x) => x !== id)))
  }

  if (disabled) {
    return <span className="text-sm text-foreground">{value || '—'}</span>
  }

  return (
    <div className="flex min-w-[180px] max-w-[280px] flex-col gap-1.5">
      <div className="flex flex-wrap gap-1">
        {selected.map((id) => {
          const label = PROMO_PRODUCT_OPTIONS.find((o) => o.id === id)?.label ?? id
          return (
            <span
              key={id}
              className="inline-flex items-center gap-1 rounded-md border border-border bg-muted/60 px-1.5 py-0.5 text-xs font-medium text-foreground"
            >
              {label}
              <button
                type="button"
                className="rounded-sm text-muted-foreground hover:text-foreground"
                aria-label={`Убрать ${label}`}
                onClick={() => remove(id)}
              >
                <X className="size-3" />
              </button>
            </span>
          )
        })}
        {selected.length === 0 ? (
          <span className="text-xs text-muted-foreground">Не выбрано</span>
        ) : null}
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button type="button" variant="outline" size="sm" className="h-8 w-full justify-between gap-2 px-2 text-xs">
            <span>Добавить тренажёр</span>
            <ChevronDown className="size-3.5 opacity-60" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-48">
          {PROMO_PRODUCT_OPTIONS.map((o) => (
            <DropdownMenuCheckboxItem
              key={o.id}
              checked={selected.includes(o.id)}
              onCheckedChange={() => toggle(o.id)}
              onSelect={(e) => e.preventDefault()}
            >
              {o.label}
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

function EditablePriceTable({
  title,
  rows,
  onSave,
  canEdit,
  defaultSlug = 'boeing-737',
}: {
  title: string
  rows: ApiPriceRow[]
  onSave: (rows: ApiPriceRow[], previous: ApiPriceRow[]) => Promise<void>
  canEdit: boolean
  defaultSlug?: string
}) {
  const [local, setLocal] = React.useState(rows)
  const [deleteId, setDeleteId] = React.useState<string | null>(null)
  const [saveOpen, setSaveOpen] = React.useState(false)
  const [busy, setBusy] = React.useState(false)
  React.useEffect(() => setLocal(rows), [rows])

  const dirty = JSON.stringify(local) !== JSON.stringify(rows)
  const deleteRow = local.find((r) => r.id === deleteId)

  const addRow = () => {
    setLocal((prev) => [
      ...prev,
      { id: `row-${Date.now()}`, durationMin: 30, simulatorSlug: defaultSlug, priceByn: 170 },
    ])
  }

  const confirmDelete = () => {
    if (!deleteId) return
    setLocal((prev) => prev.filter((r) => r.id !== deleteId))
    setDeleteId(null)
  }

  const confirmSave = async () => {
    setBusy(true)
    try {
      await onSave(local, rows)
      setSaveOpen(false)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card className="border-border/80 shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 pt-6">
        <CardTitle className="text-base font-semibold">{title}</CardTitle>
        <div className="flex gap-2">
          {canEdit ? (
            <>
              <Button type="button" variant="outline" size="sm" className="gap-1" onClick={addRow}>
                <Plus className="size-4" />
                Добавить
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={!dirty}
                onClick={() => setSaveOpen(true)}
              >
                Сохранить
              </Button>
            </>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="pb-6">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className="py-2 text-left">Минуты</th>
              <th className="py-2 text-left">Тренажёр</th>
              <th className="py-2 text-left">Цена BYN</th>
              {canEdit ? <th className="w-10" /> : null}
            </tr>
          </thead>
          <tbody>
            {local.map((r, i) => (
              <tr key={r.id} className="border-b last:border-0">
                <td className="py-2">
                  {canEdit ? (
                    <select
                      className="h-8 rounded-md border bg-background px-2 text-sm"
                      value={r.durationMin}
                      onChange={(e) => {
                        const next = [...local]
                        next[i] = { ...r, durationMin: Number(e.target.value) }
                        setLocal(next)
                      }}
                    >
                      {(r.simulatorSlug === 'mi-2'
                        ? durationsForSimulator('mi-2')
                        : FLIGHT_DURATIONS
                      ).map((d) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                    </select>
                  ) : (
                    r.durationMin
                  )}
                </td>
                <td className="py-2">
                  {canEdit ? (
                    <select
                      className="h-8 w-full rounded-md border bg-background px-2 text-sm"
                      value={r.simulatorSlug}
                      onChange={(e) => {
                        const simulatorSlug = e.target.value
                        const next = [...local]
                        let durationMin = r.durationMin
                        if (simulatorSlug === 'mi-2' && durationMin > MI2_MAX_DURATION_MIN) {
                          durationMin = MI2_MAX_DURATION_MIN
                        }
                        next[i] = { ...r, simulatorSlug, durationMin }
                        setLocal(next)
                      }}
                    >
                      <option value="boeing-737">boeing-737</option>
                      <option value="mi-2">mi-2</option>
                      {title.toLowerCase().includes('сертификат') ? (
                        <option value="combo">combo</option>
                      ) : null}
                    </select>
                  ) : (
                    r.simulatorSlug
                  )}
                </td>
                <td className="py-2">
                  {canEdit ? (
                    <Input
                      type="number"
                      className="h-8 w-24"
                      value={r.priceByn}
                      onChange={(e) => {
                        const next = [...local]
                        next[i] = { ...r, priceByn: Number(e.target.value) }
                        setLocal(next)
                      }}
                    />
                  ) : (
                    r.priceByn
                  )}
                </td>
                {canEdit ? (
                  <td className="py-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-8 text-destructive"
                      onClick={() => setDeleteId(r.id)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>

      <ConfirmDialog
        open={!!deleteId}
        title="Удалить строку цены?"
        description={
          deleteRow
            ? `${deleteRow.simulatorSlug}, ${deleteRow.durationMin} мин — ${deleteRow.priceByn} BYN. После сохранения изменения можно отменить вверху страницы.`
            : undefined
        }
        confirmLabel="Удалить"
        destructive
        onConfirm={confirmDelete}
        onCancel={() => setDeleteId(null)}
      />

      <ConfirmDialog
        open={saveOpen}
        title="Сохранить цены?"
        description="Текущие цены на сайте будут заменены. Действие можно отменить вверху страницы в течение минуты."
        confirmLabel="Сохранить"
        busy={busy}
        onConfirm={() => void confirmSave()}
        onCancel={() => setSaveOpen(false)}
      />
    </Card>
  )
}

export default function AdminPricesPromosPage() {
  const { session } = useAdminAuth()
  const { pushUndo } = useAdminUndo()
  const canEdit = session ? canEditBookings(session.role) : false

  const { data: flightPricesData, reload: r1 } = useLiveData(
    () => apiFetch<ApiPriceRow[]>('/api/admin/prices/flights'),
    [],
  )
  const { data: certPricesData, reload: r2 } = useLiveData(
    () => apiFetch<ApiPriceRow[]>('/api/admin/prices/certificates'),
    [],
  )
  const { data: promosData, reload: r3 } = useLiveData(
    () => apiFetch<ApiPromo[]>('/api/admin/promos'),
    [],
  )
  const flightPrices = flightPricesData ?? []
  const certPrices = certPricesData ?? []
  const promos = promosData ?? []

  const [promoLocal, setPromoLocal] = React.useState(promos)
  const [promoSaveOpen, setPromoSaveOpen] = React.useState(false)
  const [promoBusy, setPromoBusy] = React.useState(false)
  React.useEffect(() => setPromoLocal(promos), [promos])

  const promoDirty = JSON.stringify(promoLocal) !== JSON.stringify(promos)

  const savePromos = async () => {
    setPromoBusy(true)
    try {
      const previous = promos.map((p) => ({ ...p }))
      await apiFetch('/api/admin/promos', {
        method: 'PUT',
        body: JSON.stringify({ rows: promoLocal }),
      })
      pushUndo({
        label: 'Отменить сохранение акций',
        run: async () => {
          await apiFetch('/api/admin/promos', {
            method: 'PUT',
            body: JSON.stringify({ rows: previous }),
          })
          void r3()
        },
      })
      setPromoSaveOpen(false)
      void r3()
    } finally {
      setPromoBusy(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <EditablePriceTable
        title="Цены — Ми-2 / B737"
        rows={flightPrices}
        canEdit={canEdit}
        onSave={async (rows, previous) => {
          await apiFetch('/api/admin/prices/flights', {
            method: 'PUT',
            body: JSON.stringify({ rows }),
          })
          pushUndo({
            label: 'Отменить сохранение цен полётов',
            run: async () => {
              await apiFetch('/api/admin/prices/flights', {
                method: 'PUT',
                body: JSON.stringify({ rows: previous }),
              })
              void r1()
            },
          })
          void r1()
        }}
      />
      <EditablePriceTable
        title="Цены на сертификаты"
        rows={certPrices}
        canEdit={canEdit}
        defaultSlug="combo"
        onSave={async (rows, previous) => {
          await apiFetch('/api/admin/prices/certificates', {
            method: 'PUT',
            body: JSON.stringify({ rows }),
          })
          pushUndo({
            label: 'Отменить сохранение цен сертификатов',
            run: async () => {
              await apiFetch('/api/admin/prices/certificates', {
                method: 'PUT',
                body: JSON.stringify({ rows: previous }),
              })
              void r2()
            },
          })
          void r2()
        }}
      />
      <Card className="border-border/80 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 pt-6">
          <CardTitle className="text-base font-semibold">Акции</CardTitle>
          {canEdit ? (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={!promoDirty}
              onClick={() => setPromoSaveOpen(true)}
            >
              Сохранить
            </Button>
          ) : null}
        </CardHeader>
        <CardContent className="pb-6">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="py-2 text-left">Название</th>
                <th className="py-2 text-left">Скидка %</th>
                <th className="py-2 text-left">Период</th>
                <th className="py-2 text-left">Продукт</th>
                <th className="py-2 text-left">Тип</th>
                <th className="py-2 text-left">Активна</th>
              </tr>
            </thead>
            <tbody>
              {promoLocal.map((p, i) => (
                <tr key={p.id} className="border-b last:border-0">
                  <td className="py-2">
                    {canEdit ? (
                      <Input
                        className="h-8"
                        value={p.name}
                        onChange={(e) => {
                          const n = [...promoLocal]
                          n[i] = { ...p, name: e.target.value }
                          setPromoLocal(n)
                        }}
                      />
                    ) : (
                      p.name
                    )}
                  </td>
                  <td className="py-2">
                    {canEdit ? (
                      <Input
                        type="number"
                        className="h-8 w-20"
                        value={p.discountPercent}
                        onChange={(e) => {
                          const n = [...promoLocal]
                          n[i] = { ...p, discountPercent: Number(e.target.value) }
                          setPromoLocal(n)
                        }}
                      />
                    ) : (
                      `${p.discountPercent}%`
                    )}
                  </td>
                  <td className="py-2">
                    {canEdit ? (
                      <div className="flex gap-2">
                        <Input
                          className="h-8 w-32"
                          value={p.startDate}
                          onChange={(e) => {
                            const n = [...promoLocal]
                            n[i] = { ...p, startDate: e.target.value }
                            setPromoLocal(n)
                          }}
                        />
                        <Input
                          className="h-8 w-32"
                          value={p.endDate}
                          onChange={(e) => {
                            const n = [...promoLocal]
                            n[i] = { ...p, endDate: e.target.value }
                            setPromoLocal(n)
                          }}
                        />
                      </div>
                    ) : (
                      `${p.startDate} — ${p.endDate}`
                    )}
                  </td>
                  <td className="py-2 align-top">
                    <ProductTypeMultiSelect
                      value={p.productType}
                      disabled={!canEdit}
                      onChange={(productType) => {
                        const n = [...promoLocal]
                        n[i] = { ...p, productType }
                        setPromoLocal(n)
                      }}
                    />
                  </td>
                  <td className="py-2">
                    {canEdit ? (
                      <select
                        className="h-8 rounded-md border bg-background px-2 text-sm"
                        value={p.promoType}
                        onChange={(e) => {
                          const n = [...promoLocal]
                          n[i] = { ...p, promoType: e.target.value }
                          setPromoLocal(n)
                        }}
                      >
                        {PROMO_TYPE_OPTIONS.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    ) : (
                      labelOf(PROMO_TYPE_OPTIONS, p.promoType)
                    )}
                  </td>
                  <td className="py-2">
                    {canEdit ? (
                      <input
                        type="checkbox"
                        checked={p.active}
                        onChange={(e) => {
                          const n = [...promoLocal]
                          n[i] = { ...p, active: e.target.checked }
                          setPromoLocal(n)
                        }}
                      />
                    ) : p.active ? (
                      'Да'
                    ) : (
                      'Нет'
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <ConfirmDialog
        open={promoSaveOpen}
        title="Сохранить акции?"
        description="Изменения акций применятся на сайте. Действие можно отменить вверху страницы в течение минуты."
        confirmLabel="Сохранить"
        busy={promoBusy}
        onConfirm={() => void savePromos()}
        onCancel={() => setPromoSaveOpen(false)}
      />
    </div>
  )
}
