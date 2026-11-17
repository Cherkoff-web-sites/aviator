import * as React from 'react'

import { DEFAULT_SITE_IMAGES, type SiteImages } from '@/data/siteImages'
import { apiFetch } from '@/lib/api'
import { useStoreSocket } from '@/hooks/useLiveData'

let cached: SiteImages | null = null
let inflight: Promise<SiteImages> | null = null

async function fetchSiteImages(): Promise<SiteImages> {
  try {
    const data = await apiFetch<SiteImages>('/api/public/site-images')
    cached = data
    return data
  } catch {
    return cached ?? DEFAULT_SITE_IMAGES
  }
}

function loadShared(): Promise<SiteImages> {
  if (!inflight) {
    inflight = fetchSiteImages().finally(() => {
      inflight = null
    })
  }
  return inflight
}

/** Публичные медиа сайта (герои, тренажёры, галерея). Пока грузится — дефолты. */
export function useSiteImages() {
  const [images, setImages] = React.useState<SiteImages>(cached ?? DEFAULT_SITE_IMAGES)
  const [loading, setLoading] = React.useState(!cached)

  const reload = React.useCallback(async () => {
    setLoading(true)
    try {
      const next = await loadShared()
      setImages(next)
    } finally {
      setLoading(false)
    }
  }, [])

  useStoreSocket(() => {
    cached = null
    void reload()
  })

  React.useEffect(() => {
    void reload()
  }, [reload])

  return { images, loading, reload }
}
