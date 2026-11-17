import { useLiveData } from '@/hooks/useLiveData'
import { apiFetch, type ApiPriceRow } from '@/lib/api'

/** Цены полётов с сайта + live-обновление при правках в админке (в т.ч. CTA highlighted). */
export function usePublicFlightPrices() {
  const { data } = useLiveData(
    () => apiFetch<ApiPriceRow[]>('/api/public/prices/flights'),
    [],
  )
  return data ?? []
}
