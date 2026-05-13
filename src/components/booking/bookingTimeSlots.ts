/** Слоты времени для выбора в модалке (демо). */
export const BOOKING_TIME_SLOTS = [
  '12:00',
  '12:45',
  '13:25',
  '14:15',
  '15:00',
  '15:45',
  '16:30',
  '17:15',
  '18:00',
] as const

export type BookingTimeSlot = (typeof BOOKING_TIME_SLOTS)[number]
