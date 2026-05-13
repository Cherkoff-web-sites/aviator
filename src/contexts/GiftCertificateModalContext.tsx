import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

type GiftCertificateModalContextValue = {
  isOpen: boolean
  openGiftCertificate: () => void
  closeGiftCertificate: () => void
}

const GiftCertificateModalContext = createContext<GiftCertificateModalContextValue | null>(null)

export function GiftCertificateModalProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)

  const openGiftCertificate = useCallback(() => setIsOpen(true), [])
  const closeGiftCertificate = useCallback(() => setIsOpen(false), [])

  const value = useMemo(
    () => ({
      isOpen,
      openGiftCertificate,
      closeGiftCertificate,
    }),
    [closeGiftCertificate, isOpen, openGiftCertificate],
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
