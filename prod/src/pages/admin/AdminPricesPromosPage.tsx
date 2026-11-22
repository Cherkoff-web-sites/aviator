import * as React from 'react'
import { ChevronDown, Plus, Trash2, X } from 'lucide-react'
import ConfirmDialog from '@/components/admin/ConfirmDialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
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
import { formatAdminDate } from '@/lib/admin-date'
import {
  clampDurationChoice,
  durationChoicesFromList,
  filterDurationChoicesForSimulator,
  simulatorChoicesFromList,
  type DurationChoice,
  type OptionListRow,
  type SimulatorChoice,
} from '@/lib/option-list-utils'
import { SiteDateInput } from '@/components/ui/site-date-input'

type PromoProductOption = { id: string; label: string }

function parseProductType(raw: string, options: PromoProductOption[]): string[] {
  const parts = raw
    .split(/[,;]/)
    .map((s) => s.trim())
    .filter(Boolean)
  const ids: string[] = []
  for (const part of parts) {
    const lower = part.toLowerCase().replace(/\s+/g, ' ')
    const hit = options.find((o) => {
      const label = o.label.toLowerCase()
      if (lower === label || lower === o.id) return true
      if (o.id === 'boeing-737' && (lower.includes('boeing') || lower.includes('737'))) return true
      if (o.id === 'mi-2' && (lower.includes('ми-2') || lower.includes('mi-2') || lower === 'mi2'))
        return true
      if (
        o.id === 'combo' &&
        (lower.includes('combo') || lower.includes('2в1') || lower.includes('+'))
      )
        return true
      return false
    })
    if (hit && !ids.includes(hit.id)) ids.push(hit.id)
  }
  return ids
}

function formatProductType(ids: string[], options: PromoProductOption[]): string {
  return ids
    .map((id) => options.find((o) => o.id === id)?.label)
    .filter(Boolean)
    .join(', ')
}

function ProductTypeMultiSelect({
  value,
  onChange,
  disabled,
  options,
}: {
  value: string
  onChange: (next: string) => void
  disabled?: boolean
  options: PromoProductOption[]
}) {
  const selected = React.useMemo(() => parseProductType(value, options), [value, options])

  const toggle = (id: string) => {
    const next = selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]
    onChange(formatProductType(next, options))
  }

  const remove = (id: string) => {
    onChange(formatProductType(selected.filter((x) => x !== id), options))
  }

  if (disabled) {
    return <span className="text-sm text-foreground">{value || '—'}</span>
  }

  return (
    <div className="flex min-w-[180px] max-w-[280px] flex-col gap-1.5">
      <div className="flex flex-wrap gap-1">
        {selected.map((id) => {
          const label = options.find((o) => o.id === id)?.label ?? id
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
          {options.map((o) => (
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
  description,
  rows,
  onSave,
  canEdit,
  defaultSlug = 'boeing-737',
  defaultDurationMin = 30,
  defaultPriceByn = 170,
  simulatorOptions = [...SIMULATOR_OPTIONS],
  durationChoices = durationChoicesFromList(null),
  lockSimulator = false,
  showCta = true,
}: {
  title: string
  description?: string
  rows: ApiPriceRow[]
  onSave: (rows: ApiPriceRow[], previous: ApiPriceRow[]) => Promise<void>
  canEdit: boolean
  defaultSlug?: string
  defaultDurationMin?: number
  defaultPriceByn?: number
  simulatorOptions?: readonly SimulatorChoice[]
  /** Длительности из «Списки для форм» */
  durationChoices?: readonly DurationChoice[]
  /** Нельзя менять тренажёр (для отдельной таблицы комбо) */
  lockSimulator?: boolean
  /** Колонка CTA (highlighted) — нужна для полётов, на сертификатах бесполезна */
  showCta?: boolean
}) {
  const [local, setLocal] = React.useState(rows)
  const [deleteId, setDeleteId] = React.useState<string | null>(null)
  const [saveOpen, setSaveOpen] = React.useState(false)
  const [busy, setBusy] = React.useState(false)
  React.useEffect(() => setLocal(rows), [rows])

  const dirty = JSON.stringify(local) !== JSON.stringify(rows)
  const deleteRow = local.find((r) => r.id === deleteId)
  const slugLabel = (slug: string) => labelOf(simulatorOptions, slug, slug)
  const durationsForSlug = (slug: string) =>
    filterDurationChoicesForSimulator([...durationChoices], slug)

  const addRow = () => {
    const allowed = durationsForSlug(defaultSlug)
    setLocal((prev) => [
      ...prev,
      {
        id: `row-${Date.now()}`,
        durationMin: clampDurationChoice(allowed, defaultDurationMin),
        simulatorSlug: defaultSlug,
        priceByn: defaultPriceByn,
        highlighted: defaultSlug === 'combo',
      },
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
      <CardHeader className="flex flex-row items-start justify-between space-y-0 gap-3 pb-4 pt-6">
        <div className="min-w-0 space-y-1">
          <CardTitle className="text-base font-semibold">{title}</CardTitle>
          {description ? (
            <p className="text-sm font-normal text-muted-foreground">{description}</p>
          ) : null}
        </div>
        <div className="flex shrink-0 gap-2">
          {canEdit ? (
            <>
              <Button type="button" variant="outline" size="sm" className="gap-1" onClick={addRow}>
                <Plus className="size-4" />
                Добавить
              </Button>
              <Button
                type="button"
                variant={dirty ? 'default' : 'secondary'}
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
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Минуты</TableHead>
                <TableHead>Тренажёр</TableHead>
                {showCta ? <TableHead>CTA</TableHead> : null}
                <TableHead>Цена BYN</TableHead>
                {canEdit ? <TableHead className="w-10" /> : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {local.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={(canEdit ? 4 : 3) + (showCta ? 1 : 0)}
                    className="h-16 text-center text-sm text-muted-foreground"
                  >
                    Нет тарифов. {canEdit ? 'Нажмите «Добавить».' : null}
                  </TableCell>
                </TableRow>
              ) : (
                local.map((r, i) => (
                  <TableRow key={r.id}>
                    <TableCell>
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
                          {durationsForSlug(r.simulatorSlug).map((d) => (
                            <option key={d.value} value={d.value}>
                              {d.label}
                            </option>
                          ))}
                        </select>
                      ) : (
                        r.durationMin
                      )}
                    </TableCell>
                    <TableCell>
                      {canEdit && !lockSimulator ? (
                        <select
                          className="h-8 w-full rounded-md border bg-background px-2 text-sm"
                          value={r.simulatorSlug}
                          onChange={(e) => {
                            const simulatorSlug = e.target.value
                            const next = [...local]
                            next[i] = {
                              ...r,
                              simulatorSlug,
                              durationMin: clampDurationChoice(
                                durationsForSlug(simulatorSlug),
                                r.durationMin,
                              ),
                            }
                            setLocal(next)
                          }}
                        >
                          {simulatorOptions.map((o) => (
                            <option key={o.value} value={o.value}>
                              {o.label}
                            </option>
                          ))}
                        </select>
                      ) : (
                        slugLabel(r.simulatorSlug)
                      )}
                    </TableCell>
                    {showCta ? (
                      <TableCell>
                        {canEdit ? (
                          <input
                            type="checkbox"
                            className="size-4 accent-primary"
                            checked={!!r.highlighted}
                            title="Тариф по умолчанию (CTA) на сайте"
                            onChange={(e) => {
                              const next = local.map((row, j) =>
                                row.simulatorSlug === r.simulatorSlug
                                  ? { ...row, highlighted: j === i ? e.target.checked : false }
                                  : row,
                              )
                              setLocal(next)
                            }}
                          />
                        ) : r.highlighted ? (
                          'да'
                        ) : (
                          '—'
                        )}
                      </TableCell>
                    ) : null}
                    <TableCell>
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
                    </TableCell>
                    {canEdit ? (
                      <TableCell>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="size-8 text-destructive"
                          onClick={() => setDeleteId(r.id)}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </TableCell>
                    ) : null}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      <ConfirmDialog
        open={!!deleteId}
        title="Удалить строку цены?"
        description={
          deleteRow
            ? `${slugLabel(deleteRow.simulatorSlug)}, ${deleteRow.durationMin} мин — ${deleteRow.priceByn} BYN. После сохранения изменения можно отменить вверху страницы.`
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
  const { data: optionLists } = useLiveData(
    () =>
      apiFetch<{
        duration: OptionListRow[]
        simulator: OptionListRow[]
        cert_duration: OptionListRow[]
        cert_simulator: OptionListRow[]
      }>('/api/admin/settings/option-lists'),
    [],
  )
  const flightPrices = flightPricesData ?? []
  const certPrices = certPricesData ?? []
  const promos = promosData ?? []
  const comboCertPrices = React.useMemo(
    () => certPrices.filter((r) => r.simulatorSlug === 'combo'),
    [certPrices],
  )
  const singleCertPrices = React.useMemo(
    () => certPrices.filter((r) => r.simulatorSlug !== 'combo'),
    [certPrices],
  )
  const flightDurationChoices = React.useMemo(
    () => durationChoicesFromList(optionLists?.duration),
    [optionLists],
  )
  const certDurationChoices = React.useMemo(
    () => durationChoicesFromList(optionLists?.cert_duration ?? optionLists?.duration),
    [optionLists],
  )
  const flightSimOptions = React.useMemo(
    () =>
      simulatorChoicesFromList(optionLists?.simulator, [...SIMULATOR_OPTIONS]).filter(
        (s) => s.value !== 'combo',
      ),
    [optionLists],
  )
  const certSimOptions = React.useMemo(
    () =>
      simulatorChoicesFromList(optionLists?.cert_simulator, [
        ...SIMULATOR_OPTIONS,
        { value: 'combo', label: 'Boeing + Ми-2' },
      ]),
    [optionLists],
  )
  const promoProductOptions = React.useMemo<PromoProductOption[]>(
    () => flightSimOptions.map((o) => ({ id: o.value, label: o.label })),
    [flightSimOptions],
  )

  const [promoLocal, setPromoLocal] = React.useState(promos)
  const [promoSaveOpen, setPromoSaveOpen] = React.useState(false)
  const [promoBusy, setPromoBusy] = React.useState(false)
  React.useEffect(() => setPromoLocal(promos), [promos])

  const promoDirty = JSON.stringify(promoLocal) !== JSON.stringify(promos)

  const saveCertPrices = async (rows: ApiPriceRow[], previous: ApiPriceRow[], label: string) => {
    await apiFetch('/api/admin/prices/certificates', {
      method: 'PUT',
      body: JSON.stringify({ rows }),
    })
    pushUndo({
      label,
      run: async () => {
        await apiFetch('/api/admin/prices/certificates', {
          method: 'PUT',
          body: JSON.stringify({ rows: previous }),
        })
        void r2()
      },
    })
    void r2()
  }

  const savePromos = async () => {
    setPromoBusy(true)
    try {
      const previous = promos.map((p) => ({ ...p }))
      const rows = promoLocal.map((p) => ({
        ...p,
        indefinite: Boolean(p.indefinite),
        endDate: p.indefinite ? '9999-12-31' : p.endDate,
      }))
      await apiFetch('/api/admin/promos', {
        method: 'PUT',
        body: JSON.stringify({ rows }),
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
        description="Тарифы отдельных тренажёров на странице «Цены» и в бронировании. Минуты и названия — из «Настройки → Списки для форм»."
        rows={flightPrices}
        canEdit={canEdit}
        simulatorOptions={flightSimOptions}
        durationChoices={flightDurationChoices}
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
        title="Boeing + Ми-2"
        description="Цена блока «2в1» на странице «Цены» и сертификата на оба тренажёра (30 + 30 мин)."
        rows={comboCertPrices}
        canEdit={canEdit}
        defaultSlug="combo"
        defaultDurationMin={60}
        defaultPriceByn={370}
        lockSimulator
        showCta={false}
        simulatorOptions={certSimOptions}
        durationChoices={certDurationChoices}
        onSave={async (comboRows, previousCombo) => {
          const next = [...singleCertPrices, ...comboRows]
          const previous = [...singleCertPrices, ...previousCombo]
          await saveCertPrices(next, previous, 'Отменить сохранение цены комбо')
        }}
      />
      <EditablePriceTable
        title="Цены на сертификаты"
        description="Сертификаты на один тренажёр. Boeing + Ми-2 редактируется в блоке выше."
        rows={singleCertPrices}
        canEdit={canEdit}
        defaultSlug="boeing-737"
        showCta={false}
        simulatorOptions={flightSimOptions}
        durationChoices={certDurationChoices}
        onSave={async (rows, previousSingle) => {
          const next = [...rows, ...comboCertPrices]
          const previous = [...previousSingle, ...comboCertPrices]
          await saveCertPrices(next, previous, 'Отменить сохранение цен сертификатов')
        }}
      />
      <Card className="border-border/80 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 pt-6">
          <CardTitle className="text-base font-semibold">Акции</CardTitle>
          {canEdit ? (
            <Button
              type="button"
              variant={promoDirty ? 'default' : 'secondary'}
              size="sm"
              disabled={!promoDirty}
              onClick={() => setPromoSaveOpen(true)}
            >
              Сохранить
            </Button>
          ) : null}
        </CardHeader>
        <CardContent className="pb-6">
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Название</TableHead>
                  <TableHead>Скидка %</TableHead>
                  <TableHead>Период</TableHead>
                  <TableHead>Бессрочно</TableHead>
                  <TableHead>Продукт</TableHead>
                  <TableHead>Тип</TableHead>
                  <TableHead>Активна</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {promoLocal.map((p, i) => (
                  <TableRow key={p.id}>
                    <TableCell>
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
                    </TableCell>
                    <TableCell>
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
                    </TableCell>
                    <TableCell>
                      {canEdit ? (
                        <div className="flex flex-wrap items-center gap-2">
                          <SiteDateInput
                            className="h-8 w-32"
                            value={p.startDate}
                            onValueChange={(startDate) => {
                              const n = [...promoLocal]
                              n[i] = { ...p, startDate }
                              setPromoLocal(n)
                            }}
                          />
                          {p.indefinite ? (
                            <span className="text-xs text-muted-foreground">— бессрочно</span>
                          ) : (
                            <SiteDateInput
                              className="h-8 w-32"
                              value={p.endDate === '9999-12-31' ? '' : p.endDate}
                              onValueChange={(endDate) => {
                                const n = [...promoLocal]
                                n[i] = { ...p, endDate, indefinite: false }
                                setPromoLocal(n)
                              }}
                            />
                          )}
                        </div>
                      ) : p.indefinite ? (
                        `${formatAdminDate(p.startDate)} — бессрочно`
                      ) : (
                        `${formatAdminDate(p.startDate)} — ${formatAdminDate(p.endDate)}`
                      )}
                    </TableCell>
                    <TableCell>
                      {canEdit ? (
                        <label className="inline-flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            className="size-4 accent-primary"
                            checked={Boolean(p.indefinite)}
                            onChange={(e) => {
                              const indefinite = e.target.checked
                              const n = [...promoLocal]
                              n[i] = {
                                ...p,
                                indefinite,
                                endDate: indefinite
                                  ? '9999-12-31'
                                  : p.endDate === '9999-12-31'
                                    ? p.startDate
                                    : p.endDate,
                              }
                              setPromoLocal(n)
                            }}
                          />
                          <span className="sr-only">Бессрочно</span>
                        </label>
                      ) : p.indefinite ? (
                        'Да'
                      ) : (
                        'Нет'
                      )}
                    </TableCell>
                    <TableCell className="align-top">
                      <ProductTypeMultiSelect
                        value={p.productType}
                        disabled={!canEdit}
                        options={promoProductOptions}
                        onChange={(productType) => {
                          const n = [...promoLocal]
                          n[i] = { ...p, productType }
                          setPromoLocal(n)
                        }}
                      />
                    </TableCell>
                    <TableCell>
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
                    </TableCell>
                    <TableCell>
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
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
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
