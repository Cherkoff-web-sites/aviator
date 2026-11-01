import { useEffect, useRef } from 'react'

import { useBookingModal } from '../contexts/BookingModalContext'
import { useGiftCertificateModal } from '../contexts/GiftCertificateModalContext'

/**
 * Одновременно открыта только одна модалка: бронь или подарок.
 * При открытии одной закрываем другую.
 */
function ModalExclusiveBridge() {
  const { isOpen: bookingOpen, closeBooking } = useBookingModal()
  const { isOpen: giftOpen, closeGiftCertificate } = useGiftCertificateModal()
  const prev = useRef({ booking: false, gift: false })

  useEffect(() => {
    const was = prev.current
    if (bookingOpen && !was.booking && giftOpen) {
      closeGiftCertificate()
    }
    if (giftOpen && !was.gift && bookingOpen) {
      closeBooking()
    }
    prev.current = { booking: bookingOpen, gift: giftOpen }
  }, [bookingOpen, giftOpen, closeBooking, closeGiftCertificate])

  return null
}

export default ModalExclusiveBridge
