import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

import type { GiftCertProductChoice } from '../components/booking/bookingPricing'

export type GiftCertificateOpenPayload = {
  /** Предвыбор тренажёра в модалке */
  product?: GiftCertProductChoice
}

type GiftCertificateModalContextValue = {
  isOpen: boolean
  payload: GiftCertificateOpenPayload | null
  openGiftCertificate: (payload?: GiftCertificateOpenPayload) => void
  closeGiftCertificate: () => void
}

const GiftCertificateModalContext = createContext<GiftCertificateModalContextValue | null>(null)

export function GiftCertificateModalProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)
  const [payload, setPayload] = useState<GiftCertificateOpenPayload | null>(null)

  const openGiftCertificate = useCallback((next?: GiftCertificateOpenPayload) => {
    setPayload(next ?? {})
    setIsOpen(true)
  }, [])

  const closeGiftCertificate = useCallback(() => {
    setIsOpen(false)
    setPayload(null)
  }, [])

  const value = useMemo(
    () => ({
      isOpen,
      payload,
      openGiftCertificate,
      closeGiftCertificate,
    }),
    [closeGiftCertificate, isOpen, openGiftCertificate, payload],
  )

  return (
    <GiftCertificateModalContext.Provider value={value}>
      {children}
    </GiftCertificateModalContext.Provider>
  )
}

export function useGiftCertificateModal() {
  const ctx = useContext(GiftCertificateModalContext)
  if (!ctx) {
    throw new Error('useGiftCertificateModal: провайдер не подключён')
  }
  return ctx
}
