/** Утилиты для списков из «Настройки → Списки для форм» (бронь / сертификаты). */

export type OptionListRow = {
  id: string
  value: string
  label: string
  sortOrder: number
}

export type DurationChoice = { value: number; label: string }
export type SimulatorChoice = { value: string; label: string }

const DEFAULT_DURATIONS = [30, 60, 90, 120]
export const MI2_MAX_DURATION_MIN = 60

export function sortedOptionRows(rows: OptionListRow[] | null | undefined): OptionListRow[] {
  return [...(rows ?? [])]
    .filter((r) => String(r.value ?? '').trim())
    .sort(
      (a, b) =>
        (a.sortOrder ?? 0) - (b.sortOrder ?? 0) ||
        String(a.label).localeCompare(String(b.label), 'ru'),
    )
}

export function simulatorChoicesFromList(
  rows: OptionListRow[] | null | undefined,
  fallback: SimulatorChoice[],
): SimulatorChoice[] {
  const fromList = sortedOptionRows(rows).map((r) => ({
    value: r.value.trim(),
    label: (r.label || r.value).trim(),
  }))
  return fromList.length > 0 ? fromList : fallback
}

export function durationChoicesFromList(
  rows: OptionListRow[] | null | undefined,
  fallback: number[] = DEFAULT_DURATIONS,
): DurationChoice[] {
  const fromList = sortedOptionRows(rows)
    .map((r) => {
      const value = Number(r.value)
      return {
        value,
        label: (r.label || `${r.value} минут`).trim(),
      }
    })
    .filter((d) => Number.isFinite(d.value) && d.value > 0)
  if (fromList.length > 0) return fromList
  return fallback.map((value) => ({ value, label: `${value} минут` }))
}

/** Ограничения по тренажёру: Ми-2 ≤ 60, combo — обычно 60. */
export function filterDurationChoicesForSimulator(
  choices: DurationChoice[],
  simulatorSlug: string,
): DurationChoice[] {
  if (simulatorSlug === 'combo' || simulatorSlug === 'both') {
    const sixty = choices.filter((d) => d.value === 60)
    return sixty.length > 0 ? sixty : choices.slice(0, 1)
  }
  if (simulatorSlug === 'mi-2') {
    return choices.filter((d) => d.value <= MI2_MAX_DURATION_MIN)
  }
  return choices
}

export function clampDurationChoice(
  choices: DurationChoice[],
  durationMin: number,
): number {
  if (!choices.length) return durationMin > 0 ? durationMin : 30
  if (choices.some((d) => d.value === durationMin)) return durationMin
  // Ближайшая доступная длительность (не «последняя в списке» — иначе 15→120 и цена 0).
  let best = choices[0]!.value
  let bestDist = Math.abs(best - durationMin)
  for (const c of choices) {
    const dist = Math.abs(c.value - durationMin)
    if (dist < bestDist) {
      best = c.value
      bestDist = dist
    }
  }
  return best
}

export function labelForOption(
  rows: OptionListRow[] | null | undefined,
  value: string,
  fallback?: string,
): string {
  const hit = sortedOptionRows(rows).find((r) => r.value === value)
  return hit?.label || fallback || value
}
