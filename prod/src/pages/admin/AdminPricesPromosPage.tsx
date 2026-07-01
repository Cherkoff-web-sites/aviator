import * as React from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useLiveData } from '@/hooks/useLiveData'
import { apiFetch, type ApiPriceRow, type ApiPromo } from '@/lib/api'
import { useAdminAuth } from '@/contexts/AdminAuthContext'
import { canEditBookings } from '@/lib/admin-access'

function EditablePriceTable({
  title,
  rows,
  onSave,
  canEdit,
  defaultSlug = 'boeing-737',
}: {
  title: string
  rows: ApiPriceRow[]
  onSave: (rows: ApiPriceRow[]) => Promise<void>
  canEdit: boolean
  defaultSlug?: string
}) {
  const [local, setLocal] = React.useState(rows)
  React.useEffect(() => setLocal(rows), [rows])

  const addRow = () => {
    setLocal((prev) => [
      ...prev,
      { id: `row-${Date.now()}`, durationMin: 30, simulatorSlug: defaultSlug, priceByn: 170 },
    ])
  }

  const removeRow = (id: string) => {
    setLocal((prev) => prev.filter((r) => r.id !== id))
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
              <Button type="button" variant="secondary" size="sm" onClick={() => void onSave(local)}>
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
                    <Input
                      type="number"
                      className="h-8 w-20"
                      value={r.durationMin}
                      onChange={(e) => {
                        const next = [...local]
                        next[i] = { ...r, durationMin: Number(e.target.value) }
                        setLocal(next)
                      }}
                    />
                  ) : (
                    r.durationMin
                  )}
                </td>
                <td className="py-2">
                  {canEdit ? (
                    <Input
                      className="h-8"
                      value={r.simulatorSlug}
                      onChange={(e) => {
                        const next = [...local]
                        next[i] = { ...r, simulatorSlug: e.target.value }
                        setLocal(next)
                      }}
                    />
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
                      onClick={() => removeRow(r.id)}
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
    </Card>
  )
}

export default function AdminPricesPromosPage() {
  const { session } = useAdminAuth()
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
  React.useEffect(() => setPromoLocal(promos), [promos])

  return (
    <div className="flex flex-col gap-6">
      <EditablePriceTable
        title="Цены — Ми-2 / B737"
        rows={flightPrices}
        canEdit={canEdit}
        onSave={async (rows) => {
          await apiFetch('/api/admin/prices/flights', { method: 'PUT', body: JSON.stringify({ rows }) })
          void r1()
        }}
      />
      <EditablePriceTable
        title="Цены на сертификаты"
        rows={certPrices}
        canEdit={canEdit}
        defaultSlug="combo"
        onSave={async (rows) => {
          await apiFetch('/api/admin/prices/certificates', { method: 'PUT', body: JSON.stringify({ rows }) })
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
              onClick={() =>
                void apiFetch('/api/admin/promos', {
                  method: 'PUT',
                  body: JSON.stringify({ rows: promoLocal }),
                }).then(() => r3())
              }
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
                  <td className="py-2">
                    {canEdit ? (
                      <Input
                        className="h-8"
                        value={p.productType}
                        onChange={(e) => {
                          const n = [...promoLocal]
                          n[i] = { ...p, productType: e.target.value }
                          setPromoLocal(n)
                        }}
                      />
                    ) : (
                      p.productType
                    )}
                  </td>
                  <td className="py-2">
                    {canEdit ? (
                      <Input
                        className="h-8"
                        value={p.promoType}
                        onChange={(e) => {
                          const n = [...promoLocal]
                          n[i] = { ...p, promoType: e.target.value }
                          setPromoLocal(n)
                        }}
                      />
                    ) : (
                      p.promoType
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
    </div>
  )
}
