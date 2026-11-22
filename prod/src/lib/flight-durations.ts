import {
  clampDurationChoice,
  durationChoicesFromList,
  filterDurationChoicesForSimulator,
  MI2_MAX_DURATION_MIN,
  type OptionListRow,
} from '@/lib/option-list-utils'

/** Фоллбек, если списки из настроек ещё не загрузились. */
export const FLIGHT_DURATIONS = [30, 60, 90, 120] as const
export type FlightDurationMin = number

export { MI2_MAX_DURATION_MIN }

export function durationsForSimulator(
  simulatorSlug: string,
  optionRows?: OptionListRow[] | null,
): number[] {
  const choices = filterDurationChoicesForSimulator(
    durationChoicesFromList(optionRows, [...FLIGHT_DURATIONS]),
    simulatorSlug,
  )
  return choices.map((c) => c.value)
}

export function clampDurationForSimulator(
  simulatorSlug: string,
  durationMin: number,
  optionRows?: OptionListRow[] | null,
): FlightDurationMin {
  const choices = filterDurationChoicesForSimulator(
    durationChoicesFromList(optionRows, [...FLIGHT_DURATIONS]),
    simulatorSlug,
  )
  return clampDurationChoice(choices, durationMin)
}
