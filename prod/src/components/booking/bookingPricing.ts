import type { BookingSimulatorSlug } from '../../contexts/BookingModalContext'

const BOEING: Record<30 | 60 | 90 | 120, number> = {
  30: 170,
  60: 300,
  90: 400,
  120: 450,
}

const MI2: Record<30 | 60 | 90 | 120, number> = {
  30: 200,
  60: 350,
  90: 480,
  120: 600,
}

export function getBookingPriceByn(
  aircraft: 'boeing-737' | 'mi-2',
  durationMin: 30 | 60 | 90 | 120,
  pageSlug?: BookingSimulatorSlug | null,
): number {
  if (pageSlug === 'mi-2' || aircraft === 'mi-2') {
    return MI2[durationMin]
  }
  return BOEING[durationMin]
}

export type GiftCertProductChoice = 'boeing-737' | 'mi-2' | 'both'

export function getGiftCertificatePriceByn(
  product: GiftCertProductChoice,
  durationMin: 30 | 60 | 90 | 120,
): number {
  if (product === 'mi-2') return MI2[durationMin]
  if (product === 'boeing-737') return BOEING[durationMin]
  return BOEING[durationMin] + MI2[durationMin]
}
