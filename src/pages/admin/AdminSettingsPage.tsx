import { Plus } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
const GALLERY_PLACEHOLDER_COUNT = 16

const GALLERY_SECTIONS = [
  { id: 'b737', title: 'Boeing 737NG' },
  { id: 'mi2', title: 'Ми-2' },
  { id: 'summer-school', title: 'Летняя школа' },
] as const

function PhotoPlaceholderGrid({ count = GALLERY_PLACEHOLDER_COUNT }: { count?: number }) {
  return (
    <div
      className="grid grid-cols-4 gap-2 sm:grid-cols-6 md:grid-cols-8 md:gap-3"
      aria-hidden
    >
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="aspect-square w-full rounded-md bg-muted" />
      ))}
    </div>
  )
}

function GallerySectionCard({ title }: { title: string }) {
  return (
    <Card className="border-border/80 shadow-sm">
      <CardHeader className="flex flex-col gap-4 space-y-0 pb-4 pt-6 sm:flex-row sm:items-center sm:justify-between">
        <CardTitle className="text-base font-semibold text-foreground">{title}</CardTitle>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-9 w-full shrink-0 gap-2 sm:w-auto"
        >
          <Plus className="size-4 shrink-0" />
          Добавить новые фото
        </Button>
      </CardHeader>
      <CardContent className="pb-6">
        <PhotoPlaceholderGrid />
      </CardContent>
    </Card>
  )
}

export default function AdminSettingsPage() {
  return (
    <div className="flex w-full min-w-0 flex-col gap-6">
      <Card className="border-border/80 shadow-sm">
        <CardHeader className="space-y-0 pb-4 pt-6">
          <CardTitle className="text-base font-semibold text-foreground">Документы</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 pb-6 text-sm text-foreground">
          <p>
            Политика конфиденциальности —{' '}
            <button
              type="button"
              className="font-medium text-blue-600 underline-offset-2 hover:underline dark:text-blue-400"
            >
              редактировать
            </button>
          </p>
          <p>
            Договор оферты —{' '}
            <button
              type="button"
              className="font-medium text-blue-600 underline-offset-2 hover:underline dark:text-blue-400"
            >
              редактировать
            </button>
          </p>
        </CardContent>
      </Card>

      <Card className="border-border/80 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-4 pt-6">
          <CardTitle className="text-base font-semibold text-foreground">
            Контакты и галерея
          </CardTitle>
          <Button type="button" variant="secondary" size="sm" className="shrink-0 font-medium">
            Изменить
          </Button>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 pb-6 text-sm text-foreground">
          <p>
            <span className="text-muted-foreground">Телефон:</span> +375 (12) 1234567
          </p>
          <p>
            <span className="text-muted-foreground">Email:</span> info@gmail.com
          </p>
          <p>
            <span className="text-muted-foreground">Время:</span> 12:00 - 21:00 по мск
          </p>
        </CardContent>
      </Card>

      {GALLERY_SECTIONS.map((section) => (
        <GallerySectionCard key={section.id} title={section.title} />
      ))}
    </div>
  )
}
