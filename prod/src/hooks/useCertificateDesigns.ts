import { useLiveData } from '@/hooks/useLiveData'
import { apiFetch } from '@/lib/api'
import type { CertificateDesignRow } from '@/lib/certificate-design'

export function useCertificateDesigns(admin = false) {
  const { data, reload } = useLiveData(
    () =>
      apiFetch<CertificateDesignRow[]>(
        admin ? '/api/admin/settings/certificate-designs' : '/api/public/certificate-designs',
      ),
    [admin],
  )
  return { designs: data ?? [], reload }
}
