/** Допустимые длительности полёта (минуты). */
export const FLIGHT_DURATIONS = [30, 60, 90, 120] as const
export type FlightDurationMin = (typeof FLIGHT_DURATIONS)[number]

/** Ми-2: максимальная продолжительность полёта — 60 минут. */
export const MI2_MAX_DURATION_MIN = 60

export function durationsForSimulator(simulatorSlug: string): readonly FlightDurationMin[] {
  if (simulatorSlug === 'mi-2') {
    return FLIGHT_DURATIONS.filter((d) => d <= MI2_MAX_DURATION_MIN)
  }
  return FLIGHT_DURATIONS
}

export function clampDurationForSimulator(
  simulatorSlug: string,
  durationMin: number,
): FlightDurationMin {
  const allowed = durationsForSimulator(simulatorSlug)
  if (allowed.includes(durationMin as FlightDurationMin)) {
    return durationMin as FlightDurationMin
  }
  return allowed[allowed.length - 1] ?? 30
}
