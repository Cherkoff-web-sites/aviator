import * as React from 'react'
import { Plus } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { useLiveData } from '@/hooks/useLiveData'
import { apiFetch } from '@/lib/api'

const GALLERY_SECTIONS = [
  { id: 'boeing-737', title: 'Boeing 737NG' },
  { id: 'mi-2', title: 'Ми-2' },
  { id: 'summer-school', title: 'Летняя школа' },
] as const

type Document = { key: string; title: string; content: string }
type Contacts = { phone: string; email: string; hours: string }

function GallerySectionCard({
  slug,
  title,
  onReload,
}: {
  slug: string
  title: string
  onReload: () => void
}) {
  const { data: urlsData } = useLiveData(
    () => apiFetch<string[]>(`/api/admin/settings/gallery/${slug}`),
    [slug],
  )
  const urls = urlsData ?? []
  const [url, setUrl] = React.useState('')

  const addPhoto = async () => {
    if (!url.trim()) return
    await apiFetch(`/api/admin/settings/gallery/${slug}`, {
      method: 'POST',
      body: JSON.stringify({ url: url.trim() }),
    })
    setUrl('')
    onReload()
  }

  return (
    <Card className="border-border/80 shadow-sm">
      <CardHeader className="flex flex-col gap-4 space-y-0 pb-4 pt-6 sm:flex-row sm:items-center sm:justify-between">
        <CardTitle className="text-base font-semibold text-foreground">{title}</CardTitle>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          <Input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="URL изображения"
            className="h-9"
          />
          <Button type="button" variant="outline" size="sm" className="h-9 shrink-0 gap-2" onClick={() => void addPhoto()}>
            <Plus className="size-4 shrink-0" />
            Добавить фото
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pb-6">
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 md:grid-cols-8 md:gap-3">
          {urls.length === 0
            ? Array.from({ length: 8 }, (_, i) => (
                <div key={i} className="aspect-square w-full rounded-md bg-muted" />
              ))
            : urls.map((src, i) => (
                <img key={`${src}-${i}`} src={src} alt="" className="aspect-square w-full rounded-md object-cover" />
              ))}
        </div>
      </CardContent>
    </Card>
  )
}

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
  const [galleryVersion, setGalleryVersion] = React.useState(0)

  const { data: optionListsData, reload: reloadOptionLists } = useLiveData(
    () =>
      apiFetch<{
        duration: { id: string; value: string; label: string; sortOrder: number }[]
        simulator: { id: string; value: string; label: string; sortOrder: number }[]
      }>('/api/admin/settings/option-lists'),
    [],
  )
  const [durationList, setDurationList] = React.useState(optionListsData?.duration ?? [])
  const [simulatorList, setSimulatorList] = React.useState(optionListsData?.simulator ?? [])
  React.useEffect(() => {
    if (optionListsData) {
      setDurationList(optionListsData.duration)
      setSimulatorList(optionListsData.simulator)
    }
  }, [optionListsData])

  const saveOptionList = async (key: 'duration' | 'simulator', rows: typeof durationList) => {
    await apiFetch(`/api/admin/settings/option-lists/${key}`, {
      method: 'PUT',
      body: JSON.stringify({ rows }),
    })
    void reloadOptionLists()
  }

  React.useEffect(() => {
    if (contacts) setContactForm(contacts)
  }, [contacts])

  const saveDoc = async () => {
    if (!editDoc) return
    await apiFetch(`/api/admin/settings/documents/${editDoc.key}`, {
      method: 'PATCH',
      body: JSON.stringify({ content: editDoc.content }),
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
          <CardTitle className="text-base font-semibold text-foreground">Документы</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 pb-6 text-sm text-foreground">
          {documents.map((doc) => (
            <p key={doc.key}>
              {doc.title} —{' '}
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
              <textarea
                className="min-h-[120px] w-full rounded-md border bg-background p-2 text-sm"
                value={editDoc.content}
                onChange={(e) => setEditDoc({ ...editDoc, content: e.target.value })}
              />
              <div className="flex gap-2">
                <Button type="button" size="sm" onClick={() => void saveDoc()}>
                  Сохранить
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
          <CardTitle className="text-base font-semibold text-foreground">Контакты и галерея</CardTitle>
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

      {GALLERY_SECTIONS.map((section) => (
        <GallerySectionCard
          key={`${section.id}-${galleryVersion}`}
          slug={section.id}
          title={section.title}
          onReload={() => setGalleryVersion((t) => t + 1)}
        />
      ))}

      <Card className="border-border/80 shadow-sm">
        <CardHeader className="space-y-0 pb-4 pt-6">
          <CardTitle className="text-base font-semibold text-foreground">
            Списки для форм (длительность, тренажёры)
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-6 pb-6">
          <div>
            <p className="mb-2 text-sm font-medium">Длительность полёта</p>
            <div className="flex flex-col gap-2">
              {durationList.map((item, i) => (
                <Input
                  key={item.id}
                  value={item.label}
                  onChange={(e) => {
                    const next = [...durationList]
                    next[i] = { ...item, label: e.target.value }
                    setDurationList(next)
                  }}
                />
              ))}
            </div>
            <Button
              type="button"
              size="sm"
              className="mt-2"
              onClick={() => void saveOptionList('duration', durationList)}
            >
              Сохранить длительности
            </Button>
          </div>
          <div>
            <p className="mb-2 text-sm font-medium">Тренажёры</p>
            <div className="flex flex-col gap-2">
              {simulatorList.map((item, i) => (
                <Input
                  key={item.id}
                  value={item.label}
                  onChange={(e) => {
                    const next = [...simulatorList]
                    next[i] = { ...item, label: e.target.value }
                    setSimulatorList(next)
                  }}
                />
              ))}
            </div>
            <Button
              type="button"
              size="sm"
              className="mt-2"
              onClick={() => void saveOptionList('simulator', simulatorList)}
            >
              Сохранить тренажёры
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
