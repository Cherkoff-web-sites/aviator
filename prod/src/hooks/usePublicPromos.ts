import { useLiveData } from '@/hooks/useLiveData'
import { apiFetch, type ApiPromo } from '@/lib/api'

/** Акции с сайта + live при правках в админке. */
export function usePublicPromos() {
  const { data } = useLiveData(() => apiFetch<ApiPromo[]>('/api/public/promos'), [])
  return data ?? []
}
