import { useLiveData } from '@/hooks/useLiveData'
import { apiFetch, type ApiPriceRow } from '@/lib/api'

/** Цены сертификатов с сайта + live-обновление при правках в админке. */
export function usePublicCertPrices() {
  const { data } = useLiveData(
    () => apiFetch<ApiPriceRow[]>('/api/public/prices/certificates'),
    [],
  )
  return data ?? []
}
