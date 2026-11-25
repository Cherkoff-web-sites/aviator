import * as React from 'react'
import { Link } from 'react-router-dom'
import { ImageIcon } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { useLiveData } from '@/hooks/useLiveData'
import { apiFetch } from '@/lib/api'
import { clipCertificateSeriesCode } from '@/lib/certificate-design'
import { FOOTER_SOCIAL_ICONS } from '@/data/socialAssets'

type Document = { key: string; title: string; content: string }
type Contacts = { phone: string; email: string; hours: string }

export default function AdminSettingsPage() {
  const { data: documentsData, reload: reloadDocs } = useLiveData(
    () => apiFetch<Document[]>('/api/admin/settings/documents'),
    [],
  )
  const documents = documentsData ?? []
  const { data: contacts, reload: reloadContacts } = useLiveData(
    () => apiFetch<Contacts>('/api/admin/settings/contacts'),
    [],
  )
  const [editDoc, setEditDoc] = React.useState<Document | null>(null)
  const [editContacts, setEditContacts] = React.useState(false)
  const [contactForm, setContactForm] = React.useState<Contacts>({
    phone: '',
    email: '',
    hours: '',
  })
  const { data: generalSettings, reload: reloadGeneral } = useLiveData(
    () =>
      apiFetch<{
        bookingWindowMonths: number
        bookingGapMin: number
        footerSocialLinks: Record<string, string>
      }>('/api/admin/settings'),
    [],
  )
  const [gapMin, setGapMin] = React.useState(15)
  const [socialLinks, setSocialLinks] = React.useState<Record<string, string>>({})
  React.useEffect(() => {
    if (generalSettings) {
      setGapMin(generalSettings.bookingGapMin)
      setSocialLinks(generalSettings.footerSocialLinks ?? {})
    }
  }, [generalSettings])

  const saveGap = async () => {
    await apiFetch('/api/admin/settings', {
      method: 'PATCH',
      body: JSON.stringify({ bookingGapMin: gapMin }),
    })
    void reloadGeneral()
  }

  const saveSocial = async () => {
    await apiFetch('/api/admin/settings', {
      method: 'PATCH',
      body: JSON.stringify({ footerSocialLinks: socialLinks }),
    })
    void reloadGeneral()
  }

  type OptionRow = { id: string; value: string; label: string; sortOrder: number }
  type OptionListKey = 'duration' | 'simulator' | 'cert_duration' | 'cert_simulator'
  type CertDesignRow = {
    id: string
    key: string
    label: string
    code: string
    simulatorSlug: string
    durationMin: number
    swatch: string
    rowBg: string
    sortOrder: number
    active: boolean
  }

  const { data: optionListsData, reload: reloadOptionLists } = useLiveData(
    () =>
      apiFetch<Record<OptionListKey, OptionRow[]>>('/api/admin/settings/option-lists'),
    [],
  )
  const { data: certDesignsData, reload: reloadCertDesigns } = useLiveData(
    () => apiFetch<CertDesignRow[]>('/api/admin/settings/certificate-designs'),
    [],
  )
  const [durationList, setDurationList] = React.useState<OptionRow[]>([])
  const [simulatorList, setSimulatorList] = React.useState<OptionRow[]>([])
  const [certDurationList, setCertDurationList] = React.useState<OptionRow[]>([])
  const [certSimulatorList, setCertSimulatorList] = React.useState<OptionRow[]>([])
  const [certDesigns, setCertDesigns] = React.useState<CertDesignRow[]>([])
  React.useEffect(() => {
    if (optionListsData) {
      setDurationList(optionListsData.duration ?? [])
      setSimulatorList(optionListsData.simulator ?? [])
      setCertDurationList(optionListsData.cert_duration ?? [])
      setCertSimulatorList(optionListsData.cert_simulator ?? [])
    }
  }, [optionListsData])
  React.useEffect(() => {
    if (certDesignsData) setCertDesigns(certDesignsData)
  }, [certDesignsData])

  const saveOptionList = async (key: OptionListKey, rows: OptionRow[]) => {
    const normalized = rows.map((r, i) => ({
      ...r,
      value: r.value.trim(),
      label: r.label.trim() || r.value.trim(),
      sortOrder: i + 1,
    }))
    await apiFetch(`/api/admin/settings/option-lists/${key}`, {
      method: 'PUT',
      body: JSON.stringify({ rows: normalized }),
    })
    void reloadOptionLists()
  }

  const saveCertDesigns = async () => {
    const normalized = certDesigns.map((r, i) => {
      const code =
        clipCertificateSeriesCode(r.code.trim().replace(/^№\s*/, '')) || `X${i + 1}-`
      const key =
        r.key.trim() ||
        code
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '') ||
        `design-${i + 1}`
      return {
        ...r,
        key,
        label: code,
        code,
        simulatorSlug: r.simulatorSlug.trim() || 'boeing-737',
        durationMin:
          typeof r.durationMin === 'number' && r.durationMin > 0
            ? Math.round(r.durationMin)
            : 60,
        sortOrder: i + 1,
        active: r.active !== false,
      }
    })
    await apiFetch('/api/admin/settings/certificate-designs', {
      method: 'PUT',
      body: JSON.stringify({ rows: normalized }),
    })
    void reloadCertDesigns()
  }

  const addOptionRow = (
    setter: React.Dispatch<React.SetStateAction<OptionRow[]>>,
    prefix: string,
  ) => {
    setter((rows) => [
      ...rows,
      {
        id: `${prefix}-${Date.now()}`,
        value: '',
        label: '',
        sortOrder: rows.length + 1,
      },
    ])
  }

  const addCertDesign = () => {
    setCertDesigns((rows) => [
      ...rows,
      {
        id: `cd-${Date.now()}`,
        key: `custom-${rows.length + 1}`,
        label: 'NEW-',
        code: 'NEW-',
        simulatorSlug: 'boeing-737',
        durationMin: 60,
        swatch: '#64748b',
        rowBg: '#e2e8f0',
        sortOrder: rows.length + 1,
        active: true,
      },
    ])
  }

  React.useEffect(() => {
    if (contacts) setContactForm(contacts)
  }, [contacts])

  const saveDoc = async () => {
    if (!editDoc) return
    await apiFetch(`/api/admin/settings/documents/${editDoc.key}`, {
      method: 'PATCH',
      body: JSON.stringify({ title: editDoc.title, content: editDoc.content }),
    })
    setEditDoc(null)
    void reloadDocs()
  }

  const saveContacts = async () => {
    await apiFetch('/api/admin/settings/contacts', {
      method: 'PUT',
      body: JSON.stringify(contactForm),
    })
    setEditContacts(false)
    void reloadContacts()
  }

  return (
    <div className="flex w-full min-w-0 flex-col gap-6">
      <Card className="border-border/80 shadow-sm">
        <CardHeader className="space-y-0 pb-4 pt-6">
          <CardTitle className="text-base font-semibold text-foreground">Бронирование и подвал сайта</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 pb-6">
          <div className="text-sm">
            <span className="text-muted-foreground">Пауза между полётами на одном тренажёре (мин)</span>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <Input
                type="number"
                min={0}
                max={120}
                className="h-9 max-w-[8rem]"
                value={gapMin}
                onChange={(e) => setGapMin(Math.max(0, Number(e.target.value) || 0))}
              />
              <Button type="button" size="sm" onClick={() => void saveGap()}>
                Сохранить
              </Button>
            </div>
            <span className="mt-1 block text-xs text-muted-foreground">
              Шаг слотов = длительность полёта + эта пауза. Влияет на сайт и на список «Время начала»
              в модалке «Новая запись».
            </span>
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">Ссылки соцсетей в подвале</p>
            <p className="mt-1 text-xs text-muted-foreground">
              После «Сохранить» ссылки сразу на сайте (подвал, контакты, мобильное меню). Пустое
              поле — ссылка по умолчанию.
            </p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {FOOTER_SOCIAL_ICONS.map((s) => (
                <label key={s.label} className="text-sm">
                  <span className="text-muted-foreground">{s.label}</span>
                  <Input
                    className="mt-1 h-9"
                    value={socialLinks[s.label] ?? ''}
                    placeholder={s.href}
                    onChange={(e) =>
                      setSocialLinks((prev) => ({ ...prev, [s.label]: e.target.value }))
                    }
                  />
                </label>
              ))}
            </div>
            <Button type="button" size="sm" className="mt-3 w-fit" onClick={() => void saveSocial()}>
              Сохранить ссылки
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/80 shadow-sm">
        <CardHeader className="space-y-0 pb-4 pt-6">
          <CardTitle className="text-base font-semibold text-foreground">Документы сайта</CardTitle>
          <p className="pt-1 text-xs text-muted-foreground">
            Текст публикуется на /documents/… Ссылки: https://… или [текст](https://…). Заголовки:{' '}
            <code className="rounded bg-muted px-1">##</code> и <code className="rounded bg-muted px-1">###</code>,
            списки: строки с <code className="rounded bg-muted px-1">- </code>.
          </p>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 pb-6 text-sm text-foreground">
          {documents.map((doc) => (
            <p key={doc.key}>
              {doc.title}{' '}
              <span className="text-muted-foreground">({doc.key})</span> —{' '}
              <button
                type="button"
                className="font-medium text-blue-600 underline-offset-2 hover:underline dark:text-blue-400"
                onClick={() => setEditDoc({ ...doc })}
              >
                редактировать
              </button>
            </p>
          ))}
          {editDoc ? (
            <div className="mt-2 flex flex-col gap-2 rounded-lg border p-3">
              <Input
                value={editDoc.title}
                onChange={(e) => setEditDoc({ ...editDoc, title: e.target.value })}
                placeholder="Заголовок страницы"
              />
              <textarea
                className="min-h-[320px] w-full rounded-md border bg-background p-3 font-mono text-xs leading-relaxed"
                value={editDoc.content}
                onChange={(e) => setEditDoc({ ...editDoc, content: e.target.value })}
              />
              <div className="flex gap-2">
                <Button type="button" size="sm" onClick={() => void saveDoc()}>
                  Опубликовать
                </Button>
                <Button type="button" size="sm" variant="outline" onClick={() => setEditDoc(null)}>
                  Отмена
                </Button>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card className="border-border/80 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-4 pt-6">
          <CardTitle className="text-base font-semibold text-foreground">Контакты</CardTitle>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="shrink-0 font-medium"
            onClick={() => setEditContacts((v) => !v)}
          >
            {editContacts ? 'Отмена' : 'Изменить'}
          </Button>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 pb-6 text-sm text-foreground">
          {editContacts ? (
            <div className="grid gap-2 sm:grid-cols-3">
              <Input
                value={contactForm.phone}
                onChange={(e) => setContactForm((c) => ({ ...c, phone: e.target.value }))}
                placeholder="Телефон"
              />
              <Input
                value={contactForm.email}
                onChange={(e) => setContactForm((c) => ({ ...c, email: e.target.value }))}
                placeholder="Email"
              />
              <Input
                value={contactForm.hours}
                onChange={(e) => setContactForm((c) => ({ ...c, hours: e.target.value }))}
                placeholder="Время работы"
              />
              <Button type="button" className="sm:col-span-3 sm:w-fit" onClick={() => void saveContacts()}>
                Сохранить контакты
              </Button>
            </div>
          ) : (
            <>
              <p>
                <span className="text-muted-foreground">Телефон:</span> {contacts?.phone}
              </p>
              <p>
                <span className="text-muted-foreground">Email:</span> {contacts?.email}
              </p>
              <p>
                <span className="text-muted-foreground">Время:</span> {contacts?.hours}
              </p>
            </>
          )}
        </CardContent>
      </Card>

      <Card className="border-border/80 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 gap-3 pb-4 pt-6">
          <div className="min-w-0 space-y-1">
            <CardTitle className="text-base font-semibold text-foreground">
              Медиа сайта
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Фото героя, слайдеров, блоков цен и галерей — на отдельной странице, чтобы не
              загромождать настройки.
            </p>
          </div>
          <Button type="button" variant="default" size="sm" className="shrink-0 gap-2" asChild>
            <Link to="/admin/settings/media">
              <ImageIcon className="size-4" aria-hidden />
              Открыть медиа
            </Link>
          </Button>
        </CardHeader>
      </Card>

      <Card className="border-border/80 shadow-sm">
        <CardHeader className="space-y-0 pb-4 pt-6">
          <CardTitle className="text-base font-semibold text-foreground">
            Списки для форм (бронь и сертификаты)
          </CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            Параметры услуг: длительности (можно 15, 35…) и названия тренажёров. После
            «Сохранить» сразу на сайте и в «Цены и акции». value — минуты или slug
            (boeing-737, mi-2, combo), label — текст на кнопках.
          </p>
        </CardHeader>
        <CardContent className="flex flex-col gap-8 pb-6">
          {(
            [
              {
                title: 'Бронь: длительность',
                key: 'duration' as const,
                rows: durationList,
                setRows: setDurationList,
                prefix: 'd',
                valuePlaceholder: '30',
              },
              {
                title: 'Бронь: тренажёры',
                key: 'simulator' as const,
                rows: simulatorList,
                setRows: setSimulatorList,
                prefix: 's',
                valuePlaceholder: 'boeing-737',
              },
            ] as const
          ).map((block) => (
            <div key={block.key}>
              <p className="mb-2 text-sm font-medium">{block.title}</p>
              <div className="flex flex-col gap-2">
                {block.rows.map((item, i) => (
                  <div key={item.id} className="flex flex-wrap items-center gap-2">
                    <Input
                      className="h-9 max-w-[8rem] font-mono text-sm"
                      value={item.value}
                      placeholder={block.valuePlaceholder}
                      onChange={(e) => {
                        const next = [...block.rows]
                        next[i] = { ...item, value: e.target.value }
                        block.setRows(next)
                      }}
                    />
                    <Input
                      className="h-9 min-w-[12rem] flex-1"
                      value={item.label}
                      placeholder="Подпись в списке"
                      onChange={(e) => {
                        const next = [...block.rows]
                        next[i] = { ...item, label: e.target.value }
                        block.setRows(next)
                      }}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-destructive"
                      onClick={() => block.setRows(block.rows.filter((_, j) => j !== i))}
                    >
                      Удалить
                    </Button>
                  </div>
                ))}
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => addOptionRow(block.setRows, block.prefix)}
                >
                  Добавить
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => void saveOptionList(block.key, block.rows)}
                >
                  Сохранить
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="border-border/80 shadow-sm">
        <CardHeader className="space-y-0 pb-4 pt-6">
          <CardTitle className="text-base font-semibold text-foreground">
            Сертификаты: серии, тренажёр, длительность
          </CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            Серия (например EB-B737NG-) — название бланка. К ней привязаны тренажёр, минуты и
            цвет. В полном номере считаются только буквы и цифры — максимум 13; тире не входят в
            лимит. В серии оставляем запас минимум на одну цифру.
          </p>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 pb-6">
          {certDesigns.map((row, i) => (
            <div
              key={row.id}
              className="flex flex-col gap-2 rounded-lg border border-border p-3 sm:flex-row sm:flex-wrap sm:items-end"
            >
              <label className="text-xs sm:min-w-[11rem] sm:flex-1">
                <span className="text-muted-foreground">Серия (название)</span>
                <Input
                  className="mt-1 h-9 font-mono text-sm uppercase"
                  value={row.code}
                  maxLength={24}
                  placeholder="EB-B737NG-"
                  onChange={(e) => {
                    const code = clipCertificateSeriesCode(e.target.value)
                    const next = [...certDesigns]
                    next[i] = {
                      ...row,
                      code,
                      label: code,
                      key:
                        code
                          .toLowerCase()
                          .replace(/[^a-z0-9]+/g, '-')
                          .replace(/^-|-$/g, '') || row.key,
                    }
                    setCertDesigns(next)
                  }}
                />
              </label>
              <label className="text-xs sm:w-[9rem]">
                <span className="text-muted-foreground">Тренажёр</span>
                <select
                  className="mt-1 flex h-9 w-full rounded-md border bg-background px-2 text-sm"
                  value={row.simulatorSlug}
                  onChange={(e) => {
                    const next = [...certDesigns]
                    next[i] = { ...row, simulatorSlug: e.target.value }
                    setCertDesigns(next)
                  }}
                >
                  {(certSimulatorList.length
                    ? certSimulatorList
                    : [
                        { value: 'boeing-737', label: 'Boeing 737' },
                        { value: 'mi-2', label: 'Ми-2' },
                        { value: 'combo', label: 'Boeing + Ми-2' },
                      ]
                  ).map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label || o.value}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-xs sm:w-[6rem]">
                <span className="text-muted-foreground">Минуты</span>
                <Input
                  className="mt-1 h-9 font-mono text-sm"
                  inputMode="numeric"
                  value={String(row.durationMin ?? 60)}
                  onChange={(e) => {
                    const n = Number(e.target.value.replace(/\D/g, '')) || 0
                    const next = [...certDesigns]
                    next[i] = { ...row, durationMin: n }
                    setCertDesigns(next)
                  }}
                />
              </label>
              <label className="text-xs sm:w-[5.5rem]">
                <span className="text-muted-foreground">Цвет бланка</span>
                <Input
                  type="color"
                  className="mt-1 h-9 w-full cursor-pointer p-1"
                  value={/^#[0-9a-fA-F]{6}$/.test(row.swatch) ? row.swatch : '#64748b'}
                  onChange={(e) => {
                    const next = [...certDesigns]
                    next[i] = { ...row, swatch: e.target.value, rowBg: e.target.value + '55' }
                    setCertDesigns(next)
                  }}
                />
              </label>
              <label className="flex h-9 items-center gap-2 text-xs sm:pb-0">
                <input
                  type="checkbox"
                  className="size-4 accent-primary"
                  checked={row.active !== false}
                  onChange={(e) => {
                    const next = [...certDesigns]
                    next[i] = { ...row, active: e.target.checked }
                    setCertDesigns(next)
                  }}
                />
                Активен
              </label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-destructive"
                onClick={() => setCertDesigns(certDesigns.filter((_, j) => j !== i))}
              >
                Удалить
              </Button>
            </div>
          ))}
          <div className="mt-2 flex flex-col gap-3 border-t border-border pt-4">
            <p className="text-sm font-medium">Сертификаты: длительность (список для форм)</p>
            <p className="text-xs text-muted-foreground">
              Дополнительный справочник минут для цен/подарочной формы. Основная длительность серии
              задаётся в таблице выше.
            </p>
            <div className="flex flex-col gap-2">
              {certDurationList.map((item, i) => (
                <div key={item.id} className="flex flex-wrap items-center gap-2">
                  <Input
                    className="h-9 max-w-[8rem] font-mono text-sm"
                    value={item.value}
                    placeholder="60"
                    onChange={(e) => {
                      const next = [...certDurationList]
                      next[i] = { ...item, value: e.target.value }
                      setCertDurationList(next)
                    }}
                  />
                  <Input
                    className="h-9 min-w-[12rem] flex-1"
                    value={item.label}
                    placeholder="Подпись"
                    onChange={(e) => {
                      const next = [...certDurationList]
                      next[i] = { ...item, label: e.target.value }
                      setCertDurationList(next)
                    }}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-destructive"
                    onClick={() =>
                      setCertDurationList(certDurationList.filter((_, j) => j !== i))
                    }
                  >
                    Удалить
                  </Button>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => addOptionRow(setCertDurationList, 'cd')}
              >
                Добавить длительность
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => void saveOptionList('cert_duration', certDurationList)}
              >
                Сохранить длительности
              </Button>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 pt-2">
            <Button type="button" size="sm" variant="outline" onClick={addCertDesign}>
              Добавить серию
            </Button>
            <Button type="button" size="sm" onClick={() => void saveCertDesigns()}>
              Сохранить серии
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
