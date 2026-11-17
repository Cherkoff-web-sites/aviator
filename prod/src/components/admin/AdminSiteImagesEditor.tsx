import * as React from 'react'

import { SiteImageSlot } from '@/components/admin/SiteImageSlot'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { DEFAULT_SITE_IMAGES, type GallerySlideImage, type SiteImages } from '@/data/siteImages'
import { useLiveData } from '@/hooks/useLiveData'
import { apiFetch } from '@/lib/api'

const SIM_LABELS: Record<keyof SiteImages['simulators'], string> = {
  'boeing-737': 'Boeing 737NG',
  'mi-2': 'Ми-2',
  'avia-school': 'Авиашкола',
}

const SECTION_LABELS = ['Секция 1', 'Секция 2', 'Секция 3'] as const
const SLIDER_LABELS = ['Слайдер 1', 'Слайдер 2', 'Слайдер 3'] as const

function GallerySlideEditor({
  slide,
  baseline,
  index,
  onChange,
  onRemove,
  onSave,
  saving,
}: {
  slide: GallerySlideImage
  baseline?: GallerySlideImage
  index: number
  onChange: (next: GallerySlideImage) => void
  onRemove: () => void
  onSave: () => void
  saving: boolean
}) {
  const slideDirty =
    !baseline ||
    baseline.src !== slide.src ||
    baseline.alt !== slide.alt ||
    Boolean(baseline.badge360OnThumb) !== Boolean(slide.badge360OnThumb) ||
    (baseline.panoramaSrc ?? '') !== (slide.panoramaSrc ?? '')

  return (
    <div
      className={[
        'rounded-lg border border-border/80 p-3',
        slideDirty ? 'ring-2 ring-[#0075FF]/35' : '',
      ].join(' ')}
    >
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium">Слайд {index + 1}</p>
        <div className="flex flex-wrap items-center gap-2">
          {slideDirty ? (
            <Button type="button" size="sm" className="h-8" disabled={saving} onClick={onSave}>
              {saving ? 'Сохранение…' : 'Сохранить медиа'}
            </Button>
          ) : null}
          <Button type="button" variant="ghost" size="sm" className="h-8 text-destructive" onClick={onRemove}>
            Удалить
          </Button>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <SiteImageSlot
          label="Превью"
          value={slide.src}
          baseline={baseline?.src ?? ''}
          onChange={(src) => onChange({ ...slide, src })}
          onSave={onSave}
          saving={saving}
          aspect="square"
        />
        <div className="flex flex-col gap-3">
          <label className="text-sm">
            <span className="text-muted-foreground">Подпись (alt)</span>
            <Input
              className="mt-1 h-9"
              value={slide.alt}
              onChange={(e) => onChange({ ...slide, alt: e.target.value })}
            />
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={Boolean(slide.badge360OnThumb)}
              onChange={(e) =>
                onChange({
                  ...slide,
                  badge360OnThumb: e.target.checked,
                  panoramaSrc: e.target.checked ? slide.panoramaSrc || '' : undefined,
                })
              }
            />
            Бейдж 360° на превью
          </label>
          {slide.badge360OnThumb ? (
            <SiteImageSlot
              label="Панорама 360°"
              hint="equirectangular JPEG"
              value={slide.panoramaSrc ?? ''}
              baseline={baseline?.panoramaSrc ?? ''}
              onChange={(panoramaSrc) => onChange({ ...slide, panoramaSrc })}
              onSave={onSave}
              saving={saving}
            />
          ) : null}
        </div>
      </div>
    </div>
  )
}

export default function AdminSiteImagesEditor() {
  const { data, reload } = useLiveData(
    () => apiFetch<SiteImages>('/api/admin/settings/site-images'),
    [],
  )
  const [draft, setDraft] = React.useState<SiteImages>(DEFAULT_SITE_IMAGES)
  const [saving, setSaving] = React.useState(false)
  const [savedAt, setSavedAt] = React.useState<string | null>(null)

  const baseline = data ?? DEFAULT_SITE_IMAGES

  React.useEffect(() => {
    if (data) setDraft(structuredClone(data))
  }, [data])

  const dirty = React.useMemo(
    () => JSON.stringify(draft) !== JSON.stringify(baseline),
    [draft, baseline],
  )

  const save = async () => {
    setSaving(true)
    try {
      const next = await apiFetch<SiteImages>('/api/admin/settings/site-images', {
        method: 'PUT',
        body: JSON.stringify(draft),
      })
      setDraft(structuredClone(next))
      setSavedAt(new Date().toLocaleTimeString())
      void reload()
    } finally {
      setSaving(false)
    }
  }

  const setHero = (key: keyof SiteImages['heroes'], url: string) => {
    setDraft((d) => ({ ...d, heroes: { ...d.heroes, [key]: url } }))
  }

  const setSimField = <K extends keyof SiteImages['simulators']>(
    slug: K,
    patch: Partial<SiteImages['simulators'][K]>,
  ) => {
    setDraft((d) => ({
      ...d,
      simulators: {
        ...d.simulators,
        [slug]: { ...d.simulators[slug], ...patch },
      },
    }))
  }

  const slotSave = {
    onSave: () => void save(),
    saving,
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-foreground">Медиа сайта</h2>
          <p className="mt-1 max-w-2xl text-xs text-muted-foreground">
            Каждый слот независим. После замены фото кнопка «Сохранить медиа» появляется рядом со
            слотом.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {savedAt ? <span className="text-xs text-muted-foreground">Сохранено {savedAt}</span> : null}
          {dirty ? (
            <Button type="button" size="sm" disabled={saving} onClick={() => void save()}>
              {saving ? 'Сохранение…' : 'Сохранить медиа'}
            </Button>
          ) : null}
        </div>
      </div>

      <Card className="border-border/80 shadow-sm">
        <CardHeader className="space-y-0 pb-4 pt-6">
          <CardTitle className="text-base font-semibold">Главные фоны</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 pb-6 sm:grid-cols-2 lg:grid-cols-4">
          <SiteImageSlot
            label="Лендинг (первый экран)"
            value={draft.heroes.landing}
            baseline={baseline.heroes.landing}
            onChange={(url) => setHero('landing', url)}
            {...slotSave}
          />
          <SiteImageSlot
            label="Главная — Ми-2"
            value={draft.heroes.homeMi2}
            baseline={baseline.heroes.homeMi2}
            onChange={(url) => setHero('homeMi2', url)}
            {...slotSave}
          />
          <SiteImageSlot
            label="Главная — Boeing"
            value={draft.heroes.homeBoeing}
            baseline={baseline.heroes.homeBoeing}
            onChange={(url) => setHero('homeBoeing', url)}
            {...slotSave}
          />
          <SiteImageSlot
            label="Главная — Авиашкола"
            value={draft.heroes.homeSchool}
            baseline={baseline.heroes.homeSchool}
            onChange={(url) => setHero('homeSchool', url)}
            {...slotSave}
          />
        </CardContent>
      </Card>

      {(Object.keys(SIM_LABELS) as (keyof SiteImages['simulators'])[]).map((slug) => {
        const set = draft.simulators[slug]
        const baseSet = baseline.simulators[slug]
        return (
          <Card key={slug} className="border-border/80 shadow-sm">
            <CardHeader className="space-y-0 pb-4 pt-6">
              <CardTitle className="text-base font-semibold">Тренажёр: {SIM_LABELS[slug]}</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4 pb-6">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <SiteImageSlot
                  label="Hero страницы"
                  value={set.hero}
                  baseline={baseSet.hero}
                  onChange={(hero) => setSimField(slug, { hero })}
                  {...slotSave}
                />
                <SiteImageSlot
                  label="Фон тарифов"
                  value={set.pricingBackground}
                  baseline={baseSet.pricingBackground}
                  onChange={(pricingBackground) => setSimField(slug, { pricingBackground })}
                  {...slotSave}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                {SECTION_LABELS.map((label, i) => (
                  <SiteImageSlot
                    key={label}
                    label={label}
                    value={set.sections[i]}
                    baseline={baseSet.sections[i]}
                    onChange={(url) => {
                      const sections = [...set.sections] as [string, string, string]
                      sections[i] = url
                      setSimField(slug, { sections })
                    }}
                    {...slotSave}
                  />
                ))}
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                {SLIDER_LABELS.map((label, i) => (
                  <SiteImageSlot
                    key={label}
                    label={label}
                    value={set.photoSlider[i]}
                    baseline={baseSet.photoSlider[i]}
                    onChange={(url) => {
                      const photoSlider = [...set.photoSlider] as [string, string, string]
                      photoSlider[i] = url
                      setSimField(slug, { photoSlider })
                    }}
                    {...slotSave}
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        )
      })}

      <Card className="border-border/80 shadow-sm">
        <CardHeader className="space-y-0 pb-4 pt-6">
          <CardTitle className="text-base font-semibold">Комбо 2в1 — фон тарифа</CardTitle>
        </CardHeader>
        <CardContent className="pb-6 sm:max-w-sm">
          <SiteImageSlot
            label="Фон блока «Полёт 2в1»"
            value={draft.comboPricingBackground}
            baseline={baseline.comboPricingBackground}
            onChange={(comboPricingBackground) => setDraft((d) => ({ ...d, comboPricingBackground }))}
            {...slotSave}
          />
        </CardContent>
      </Card>

      {(['boeing-737', 'mi-2'] as const).map((slug) => (
        <Card key={`gallery-${slug}`} className="border-border/80 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-4 pt-6">
            <CardTitle className="text-base font-semibold">
              Галерея: {SIM_LABELS[slug]}
            </CardTitle>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                setDraft((d) => ({
                  ...d,
                  gallery: {
                    ...d.gallery,
                    [slug]: [
                      ...d.gallery[slug],
                      { src: '', alt: `Новый слайд ${d.gallery[slug].length + 1}` },
                    ],
                  },
                }))
              }
            >
              Добавить слайд
            </Button>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 pb-6">
            {draft.gallery[slug].map((slide, index) => (
              <GallerySlideEditor
                key={`${slug}-${index}`}
                slide={slide}
                baseline={baseline.gallery[slug][index]}
                index={index}
                onSave={() => void save()}
                saving={saving}
                onChange={(next) =>
                  setDraft((d) => {
                    const list = [...d.gallery[slug]]
                    list[index] = next
                    return { ...d, gallery: { ...d.gallery, [slug]: list } }
                  })
                }
                onRemove={() =>
                  setDraft((d) => ({
                    ...d,
                    gallery: {
                      ...d.gallery,
                      [slug]: d.gallery[slug].filter((_, i) => i !== index),
                    },
                  }))
                }
              />
            ))}
          </CardContent>
        </Card>
      ))}

      {dirty ? (
        <div className="sticky bottom-3 z-10 flex justify-end">
          <Button
            type="button"
            disabled={saving}
            className="shadow-lg"
            onClick={() => void save()}
          >
            {saving ? 'Сохранение…' : 'Сохранить медиа'}
          </Button>
        </div>
      ) : null}
    </div>
  )
}
