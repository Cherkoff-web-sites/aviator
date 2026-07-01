import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

/** Слаг страницы тренажёра; для брони полёта в модалке используются Boeing / Ми-2. */
export type BookingSimulatorSlug = 'boeing-737' | 'mi-2' | 'avia-school'

export type BookingOpenPayload = {
  simulatorSlug?: BookingSimulatorSlug | null
  durationMin?: 30 | 60 | 90 | 120 | null
}

type BookingModalContextValue = {
  isOpen: boolean
  payload: BookingOpenPayload | null
  openBooking: (payload?: BookingOpenPayload) => void
  closeBooking: () => void
}

const BookingModalContext = createContext<BookingModalContextValue | null>(null)

export function BookingModalProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)
  const [payload, setPayload] = useState<BookingOpenPayload | null>(null)

  const openBooking = useCallback((next?: BookingOpenPayload) => {
    setPayload(next ?? {})
    setIsOpen(true)
  }, [])

  const closeBooking = useCallback(() => {
    setIsOpen(false)
    setPayload(null)
  }, [])

  const value = useMemo(
    () => ({
      isOpen,
      payload,
      openBooking,
      closeBooking,
    }),
    [closeBooking, isOpen, openBooking, payload],
  )

  return (
    <BookingModalContext.Provider value={value}>{children}</BookingModalContext.Provider>
  )
}

export function useBookingModal() {
  const ctx = useContext(BookingModalContext)
  if (!ctx) {
    throw new Error('useBookingModal должен вызываться внутри BookingModalProvider')
  }
  return ctx
}
