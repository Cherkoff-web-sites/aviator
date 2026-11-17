import { useLiveData } from '@/hooks/useLiveData'
import { apiFetch } from '@/lib/api'

export type PublicOptionRow = {
  id: string
  value: string
  label: string
  sortOrder: number
}

export type PublicOptionLists = {
  duration: PublicOptionRow[]
  simulator: PublicOptionRow[]
  cert_duration: PublicOptionRow[]
  cert_simulator: PublicOptionRow[]
}

export function usePublicOptionLists() {
  const { data } = useLiveData(
    () => apiFetch<PublicOptionLists>('/api/public/option-lists'),
    [],
  )
  return data
}
