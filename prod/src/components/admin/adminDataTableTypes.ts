import type { ReactNode } from 'react'

export type AdminFilterType = 'text' | 'enum' | 'number' | 'date' | 'boolean'

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
  className?: string
  headerClassName?: string
  /** Не показывать в авто-фильтрах колонок (только глобальный поиск) */
  hideColumnFilter?: boolean
}

export type AdminSortState = { id: string; dir: 'asc' | 'desc' } | null

export type AdminColumnFilterState = Record<string, string>
