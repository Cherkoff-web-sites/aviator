import type { ReactNode } from 'react'

export type AdminFilterType = 'text' | 'enum' | 'number' | 'date' | 'boolean' | 'timeRange'

export type AdminEnumOption = { value: string; label: string }

export type AdminColumnDef<T> = {
  id: string
  header: string
  /** Значение для сортировки / поиска / фильтров */
  accessor?: keyof T | ((row: T) => unknown)
  cell?: (row: T) => ReactNode
  /** По умолчанию true, если есть accessor */
  sortable?: boolean
  /** По умолчанию true, если есть accessor */
  filterable?: boolean
  filterType?: AdminFilterType
  enumOptions?: AdminEnumOption[]
  /** Явная строка для глобального поиска; иначе String(accessor) */
  filterValue?: (row: T) => string
  /**
   * Значение для сравнения с enum/boolean-фильтром.
   * Если не задано — берётся accessor (удобно, когда в ячейке другое, чем ключ фильтра).
   */
  filterMatch?: (row: T) => string
  className?: string
  headerClassName?: string
  /** Не показывать в авто-фильтрах колонок (только глобальный поиск) */
  hideColumnFilter?: boolean
  /** Подпись над селектом фильтра; если пусто — берётся header */
  filterLabel?: string
}

export type AdminSortState = { id: string; dir: 'asc' | 'desc' } | null

/** Мультивыбор значений фильтра по id колонки */
export type AdminColumnFilterState = Record<string, string[]>

/** Диапазон «с / по» (время HH:MM или дата) по id колонки */
export type AdminColumnRangeState = Record<string, { from: string; to: string }>
