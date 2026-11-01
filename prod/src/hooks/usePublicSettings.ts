import { useLiveData } from '@/hooks/useLiveData'
import { apiFetch } from '@/lib/api'

export type PublicSettings = {
  bookingWindowMonths: number
  bookingGapMin: number
  footerSocialLinks: Record<string, string>
}

export function usePublicSettings() {
  const { data } = useLiveData(
    () => apiFetch<PublicSettings>('/api/public/settings'),
    [],
  )
  return data
}
