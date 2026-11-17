import { useMemo, useState } from 'react'

import type {
  AdminColumnDef,
  AdminColumnFilterState,
  AdminSortState,
} from './adminDataTableTypes'

function getAccessorValue<T>(row: T, column: AdminColumnDef<T>): unknown {
  if (column.accessor == null) return undefined
  if (typeof column.accessor === 'function') return column.accessor(row)
  return row[column.accessor]
}

function toSearchString(value: unknown): string {
  if (value == null) return ''
  if (typeof value === 'boolean') return value ? 'true' : 'false'
  if (typeof value === 'number') return String(value)
  if (value instanceof Date) return value.toISOString()
  return String(value)
}

function getFilterText<T>(row: T, column: AdminColumnDef<T>): string {
  if (column.filterValue) return column.filterValue(row)
  return toSearchString(getAccessorValue(row, column))
}

function inferFilterType<T>(column: AdminColumnDef<T>): AdminColumnDef<T>['filterType'] {
  if (column.filterType) return column.filterType
  if (column.enumOptions?.length) return 'enum'
  return 'text'
}

function compareValues(a: unknown, b: unknown): number {
  if (a == null && b == null) return 0
  if (a == null) return -1
  if (b == null) return 1

  if (typeof a === 'number' && typeof b === 'number') return a - b
  if (typeof a === 'boolean' && typeof b === 'boolean') return Number(a) - Number(b)

  const aTime = a instanceof Date ? a.getTime() : Date.parse(String(a))
  const bTime = b instanceof Date ? b.getTime() : Date.parse(String(b))
  if (!Number.isNaN(aTime) && !Number.isNaN(bTime) && String(a).length >= 8 && String(b).length >= 8) {
    return aTime - bTime
  }

  return toSearchString(a).localeCompare(toSearchString(b), 'ru', {
    numeric: true,
    sensitivity: 'base',
  })
}

export function isColumnSortable<T>(column: AdminColumnDef<T>): boolean {
  if (column.sortable === false) return false
  return column.accessor != null || column.sortable === true
}

export function isColumnFilterable<T>(column: AdminColumnDef<T>): boolean {
  if (column.filterable === false) return false
  return column.accessor != null || column.filterValue != null || column.filterable === true
}

/** Колонки, по которым рисуются отдельные фильтры (enum / boolean). */
export function getAutoFilterColumns<T>(columns: AdminColumnDef<T>[]) {
  return columns.filter((column) => {
    if (!isColumnFilterable(column) || column.hideColumnFilter) return false
    const type = inferFilterType(column)
    return type === 'enum' || type === 'boolean'
  })
}

export function useAdminDataTable<T>(rows: T[], columns: AdminColumnDef<T>[]) {
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<AdminSortState>(null)
  const [columnFilters, setColumnFilters] = useState<AdminColumnFilterState>({})

  const filterColumns = useMemo(() => getAutoFilterColumns(columns), [columns])

  const processedRows = useMemo(() => {
    const q = query.trim().toLowerCase()

    let next = rows.filter((row) => {
      for (const column of filterColumns) {
        const selected = (columnFilters[column.id] ?? '').trim()
        if (!selected) continue
        const type = inferFilterType(column)
        const raw = getAccessorValue(row, column)
        if (type === 'boolean') {
          const boolVal = Boolean(raw)
          if (selected === 'true' && !boolVal) return false
          if (selected === 'false' && boolVal) return false
          continue
        }
        if (toSearchString(raw) !== selected) return false
      }

      if (!q) return true
      return columns.some((column) => {
        if (!isColumnFilterable(column)) return false
        return getFilterText(row, column).toLowerCase().includes(q)
      })
    })

    if (sort) {
      const column = columns.find((c) => c.id === sort.id)
      if (column && isColumnSortable(column)) {
        const dir = sort.dir === 'asc' ? 1 : -1
        next = [...next].sort(
          (a, b) => compareValues(getAccessorValue(a, column), getAccessorValue(b, column)) * dir,
        )
      }
    }

    return next
  }, [rows, columns, query, sort, columnFilters, filterColumns])

  const toggleSort = (columnId: string) => {
    const column = columns.find((c) => c.id === columnId)
    if (!column || !isColumnSortable(column)) return
    setSort((prev) => {
      if (!prev || prev.id !== columnId) return { id: columnId, dir: 'asc' }
      if (prev.dir === 'asc') return { id: columnId, dir: 'desc' }
      return null
    })
  }

  const setColumnFilter = (columnId: string, value: string) => {
    setColumnFilters((prev) => {
      const next = { ...prev }
      if (!value) delete next[columnId]
      else next[columnId] = value
      return next
    })
  }

  const clearFilters = () => {
    setQuery('')
    setColumnFilters({})
    setSort(null)
  }

  const hasActiveFilters =
    query.trim().length > 0 || Object.values(columnFilters).some(Boolean) || sort != null

  return {
    query,
    setQuery,
    sort,
    toggleSort,
    columnFilters,
    setColumnFilter,
    filterColumns,
    processedRows,
    clearFilters,
    hasActiveFilters,
    totalCount: rows.length,
    shownCount: processedRows.length,
  }
}

export type AdminDataTableApi<T> = ReturnType<typeof useAdminDataTable<T>>
