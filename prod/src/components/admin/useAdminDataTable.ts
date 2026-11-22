import { useMemo, useState } from 'react'

import type {
  AdminColumnDef,
  AdminColumnFilterState,
  AdminColumnRangeState,
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

/** HH:MM → минуты от полуночи; иначе NaN */
function timeToMins(value: string): number {
  const m = /^(\d{1,2}):(\d{2})$/.exec(value.trim())
  if (!m) return Number.NaN
  const h = Number(m[1])
  const min = Number(m[2])
  if (h > 23 || min > 59) return Number.NaN
  return h * 60 + min
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

/** Колонки, по которым рисуются отдельные фильтры (enum / boolean / timeRange). */
export function getAutoFilterColumns<T>(columns: AdminColumnDef<T>[]) {
  return columns.filter((column) => {
    if (!isColumnFilterable(column) || column.hideColumnFilter) return false
    const type = inferFilterType(column)
    return type === 'enum' || type === 'boolean' || type === 'timeRange'
  })
}

function rangeIsActive(range: { from: string; to: string } | undefined): boolean {
  if (!range) return false
  return Boolean(range.from.trim() || range.to.trim())
}

export function useAdminDataTable<T>(rows: T[], columns: AdminColumnDef<T>[]) {
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<AdminSortState>(null)
  const [columnFilters, setColumnFilters] = useState<AdminColumnFilterState>({})
  const [columnRanges, setColumnRanges] = useState<AdminColumnRangeState>({})
  const [filtersOpen, setFiltersOpen] = useState(false)

  const filterColumns = useMemo(() => getAutoFilterColumns(columns), [columns])

  const processedRows = useMemo(() => {
    const q = query.trim().toLowerCase()

    let next = rows.filter((row) => {
      for (const column of filterColumns) {
        const type = inferFilterType(column)

        if (type === 'timeRange') {
          const range = columnRanges[column.id]
          if (!rangeIsActive(range)) continue
          const raw = column.filterMatch
            ? column.filterMatch(row)
            : toSearchString(getAccessorValue(row, column))
          const valueMins = timeToMins(raw)
          if (Number.isNaN(valueMins)) return false
          const fromMins = range.from.trim() ? timeToMins(range.from) : null
          const toMins = range.to.trim() ? timeToMins(range.to) : null
          if (fromMins != null && !Number.isNaN(fromMins) && valueMins < fromMins) return false
          if (toMins != null && !Number.isNaN(toMins) && valueMins > toMins) return false
          continue
        }

        const selected = columnFilters[column.id] ?? []
        if (!selected.length) continue
        const raw = getAccessorValue(row, column)
        const key = column.filterMatch
          ? column.filterMatch(row)
          : toSearchString(raw)
        if (type === 'boolean') {
          const boolKey = column.filterMatch
            ? key
            : Boolean(raw)
              ? 'true'
              : 'false'
          if (!selected.includes(boolKey)) return false
          continue
        }
        if (!selected.includes(key)) return false
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
  }, [rows, columns, query, sort, columnFilters, columnRanges, filterColumns])

  const toggleSort = (columnId: string) => {
    const column = columns.find((c) => c.id === columnId)
    if (!column || !isColumnSortable(column)) return
    setSort((prev) => {
      if (!prev || prev.id !== columnId) return { id: columnId, dir: 'asc' }
      if (prev.dir === 'asc') return { id: columnId, dir: 'desc' }
      return null
    })
  }

  const toggleColumnFilterValue = (columnId: string, value: string) => {
    setColumnFilters((prev) => {
      const cur = prev[columnId] ?? []
      const nextVals = cur.includes(value) ? cur.filter((v) => v !== value) : [...cur, value]
      const next = { ...prev }
      if (nextVals.length === 0) delete next[columnId]
      else next[columnId] = nextVals
      return next
    })
  }

  const clearColumnFilter = (columnId: string) => {
    setColumnFilters((prev) => {
      if (!(columnId in prev)) return prev
      const next = { ...prev }
      delete next[columnId]
      return next
    })
    setColumnRanges((prev) => {
      if (!(columnId in prev)) return prev
      const next = { ...prev }
      delete next[columnId]
      return next
    })
  }

  const setColumnRange = (columnId: string, patch: { from?: string; to?: string }) => {
    setColumnRanges((prev) => {
      const cur = prev[columnId] ?? { from: '', to: '' }
      const nextRange = {
        from: patch.from !== undefined ? patch.from : cur.from,
        to: patch.to !== undefined ? patch.to : cur.to,
      }
      const next = { ...prev }
      if (!nextRange.from.trim() && !nextRange.to.trim()) delete next[columnId]
      else next[columnId] = nextRange
      return next
    })
  }

  const clearFilters = () => {
    setQuery('')
    setColumnFilters({})
    setColumnRanges({})
    setSort(null)
  }

  const hasColumnFilters =
    Object.values(columnFilters).some((vals) => vals.length > 0) ||
    Object.values(columnRanges).some((range) => rangeIsActive(range))

  const hasActiveFilters =
    query.trim().length > 0 || hasColumnFilters || sort != null

  return {
    query,
    setQuery,
    sort,
    toggleSort,
    columnFilters,
    toggleColumnFilterValue,
    clearColumnFilter,
    columnRanges,
    setColumnRange,
    filterColumns,
    filtersOpen,
    setFiltersOpen,
    processedRows,
    clearFilters,
    hasActiveFilters,
    hasColumnFilters,
    totalCount: rows.length,
    shownCount: processedRows.length,
  }
}

export type AdminDataTableApi<T> = ReturnType<typeof useAdminDataTable<T>>
