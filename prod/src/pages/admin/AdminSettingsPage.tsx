import * as React from 'react'

import AdminSiteImagesEditor from '@/components/admin/AdminSiteImagesEditor'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { useLiveData } from '@/hooks/useLiveData'
import { apiFetch } from '@/lib/api'
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

  const saveGeneral = async () => {
    await apiFetch('/api/admin/settings', {
      method: 'PATCH',
      body: JSON.stringify({ bookingGapMin: gapMin, footerSocialLinks: socialLinks }),
    })
    void reloadGeneral()
  }

  type OptionRow = { id: string; value: string; label: string; sortOrder: number }
  type OptionListKey = 'duration' | 'simulator' | 'cert_duration' | 'cert_simulator'

  const { data: optionListsData, reload: reloadOptionLists } = useLiveData(
    () =>
      apiFetch<Record<OptionListKey, OptionRow[]>>('/api/admin/settings/option-lists'),
    [],
  )
  const [durationList, setDurationList] = React.useState<OptionRow[]>([])
  const [simulatorList, setSimulatorList] = React.useState<OptionRow[]>([])
  const [certDurationList, setCertDurationList] = React.useState<OptionRow[]>([])
  const [certSimulatorList, setCertSimulatorList] = React.useState<OptionRow[]>([])
  React.useEffect(() => {
    if (optionListsData) {
      setDurationList(optionListsData.duration ?? [])
      setSimulatorList(optionListsData.simulator ?? [])
      setCertDurationList(optionListsData.cert_duration ?? [])
      setCertSimulatorList(optionListsData.cert_simulator ?? [])
    }
  }, [optionListsData])

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
          <label className="text-sm">
            <span className="text-muted-foreground">Пауза между полётами на одном тренажёре (мин)</span>
            <Input
              type="number"
              min={0}
              max={120}
              className="mt-1 h-9 max-w-[8rem]"
              value={gapMin}
              onChange={(e) => setGapMin(Math.max(0, Number(e.target.value) || 0))}
            />
            <span className="mt-1 block text-xs text-muted-foreground">
              Для клиентов на сайте: после полёта до 15:00 следующий слот не раньше 15:00 + пауза.
              В админке можно ставить любое время начала; блокируется только пересечение полётов.
            </span>
          </label>
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
          </div>
          <Button type="button" size="sm" className="w-fit" onClick={() => void saveGeneral()}>
            Сохранить
          </Button>
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

      <AdminSiteImagesEditor />

      <Card className="border-border/80 shadow-sm">
        <CardHeader className="space-y-0 pb-4 pt-6">
          <CardTitle className="text-base font-semibold text-foreground">
            Списки для форм (бронь и сертификаты)
          </CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            value — техническое значение (минуты или slug), label — текст в выпадающем списке.
            График работы и блокировки дат — в разделе «Настройка графика работы».
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
              {
                title: 'Сертификаты: длительность',
                key: 'cert_duration' as const,
                rows: certDurationList,
                setRows: setCertDurationList,
                prefix: 'cd',
                valuePlaceholder: '60',
              },
              {
                title: 'Сертификаты: тренажёры / продукт',
                key: 'cert_simulator' as const,
                rows: certSimulatorList,
                setRows: setCertSimulatorList,
                prefix: 'cs',
                valuePlaceholder: 'combo',
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
    </div>
  )
}
