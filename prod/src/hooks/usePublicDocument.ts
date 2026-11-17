import { useLiveData } from '@/hooks/useLiveData'
import { apiFetch } from '@/lib/api'

export type PublicDocument = {
  key: string
  title: string
  content: string
}

export function usePublicDocument(key: string) {
  return useLiveData(
    () => apiFetch<PublicDocument>(`/api/public/documents/${encodeURIComponent(key)}`),
    [key],
  )
}
