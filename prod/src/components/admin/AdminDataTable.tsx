import { ArrowDown, ArrowUp, ArrowUpDown, Search, X } from 'lucide-react'
import type { ReactNode } from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { cn } from '@/lib/utils'

import type { AdminColumnDef, AdminSortState } from './adminDataTableTypes'
import {
  getAutoFilterColumns,
  isColumnSortable,
  type AdminDataTableApi,
  useAdminDataTable,
} from './useAdminDataTable'

const selectClass =
  'flex h-9 w-full min-w-[140px] rounded-md border border-input bg-transparent px-2 text-sm shadow-sm'

function SortIcon({ sort, columnId }: { sort: AdminSortState; columnId: string }) {
  if (!sort || sort.id !== columnId) {
    return <ArrowUpDown className="size-3.5 opacity-40" aria-hidden />
  }
  return sort.dir === 'asc' ? (
    <ArrowUp className="size-3.5 text-foreground" aria-hidden />
  ) : (
    <ArrowDown className="size-3.5 text-foreground" aria-hidden />
  )
}

export function AdminDataTableToolbar<T>({
  table,
  columns,
  searchPlaceholder = 'Поиск…',
  trailing,
}: {
  table: AdminDataTableApi<T>
  columns: AdminColumnDef<T>[]
  searchPlaceholder?: string
  trailing?: ReactNode
}) {
  const filterColumns = table.filterColumns.length
    ? table.filterColumns
    : getAutoFilterColumns(columns)

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
      <label className="relative min-w-0 flex-1 sm:max-w-sm">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={table.query}
          onChange={(e) => table.setQuery(e.target.value)}
          placeholder={searchPlaceholder}
          className="pl-8"
          aria-label="Поиск по таблице"
        />
      </label>

      {filterColumns.map((column) => {
        const type = column.filterType ?? (column.enumOptions?.length ? 'enum' : 'text')
        if (type === 'boolean') {
          return (
            <label key={column.id} className="flex min-w-[140px] flex-col gap-1 text-xs text-muted-foreground">
              <span>{column.header}</span>
              <select
                className={selectClass}
                value={table.columnFilters[column.id] ?? ''}
                onChange={(e) => table.setColumnFilter(column.id, e.target.value)}
              >
                <option value="">Все</option>
                <option value="true">Да</option>
                <option value="false">Нет</option>
              </select>
            </label>
          )
        }
        if (type === 'enum' && column.enumOptions?.length) {
          return (
            <label key={column.id} className="flex min-w-[140px] flex-col gap-1 text-xs text-muted-foreground">
              <span>{column.header}</span>
              <select
                className={selectClass}
                value={table.columnFilters[column.id] ?? ''}
                onChange={(e) => table.setColumnFilter(column.id, e.target.value)}
              >
                <option value="">Все</option>
                {column.enumOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </label>
          )
        }
        return null
      })}

      {table.hasActiveFilters ? (
        <Button type="button" variant="outline" size="sm" onClick={table.clearFilters}>
          <X className="size-4" aria-hidden />
          Сбросить
        </Button>
      ) : null}

      <p className="text-xs text-muted-foreground sm:ml-auto">
        Показано {table.shownCount} из {table.totalCount}
      </p>

      {trailing}
    </div>
  )
}

export function AdminSortableHead<T>({
  column,
  sort,
  onToggle,
  className,
}: {
  column: AdminColumnDef<T>
  sort: AdminSortState
  onToggle: (id: string) => void
  className?: string
}) {
  const sortable = isColumnSortable(column)
  if (!sortable) {
    return (
      <TableHead className={cn(column.headerClassName, className)}>{column.header}</TableHead>
    )
  }
  return (
    <TableHead className={cn(column.headerClassName, className)}>
      <button
        type="button"
        className="inline-flex items-center gap-1.5 text-left font-medium hover:text-foreground"
        onClick={() => onToggle(column.id)}
      >
        {column.header}
        <SortIcon sort={sort} columnId={column.id} />
      </button>
    </TableHead>
  )
}

type AdminDataTableProps<T> = {
  rows: T[]
  columns: AdminColumnDef<T>[]
  rowKey: (row: T) => string
  searchPlaceholder?: string
  emptyText?: string
  toolbarTrailing?: ReactNode
  /** Пропсы строки (например highlight) */
  getRowProps?: (row: T) => React.HTMLAttributes<HTMLTableRowElement>
  className?: string
  /** Внешний scroll-wrapper, как на Dashboard */
  scrollClassName?: string
  /** Если нужно управлять хуком снаружи (например вместе с mobile cards) */
  table?: AdminDataTableApi<T>
}

function defaultCell<T>(row: T, column: AdminColumnDef<T>): ReactNode {
  if (column.cell) return column.cell(row)
  if (column.accessor == null) return null
  const value =
    typeof column.accessor === 'function' ? column.accessor(row) : row[column.accessor]
  if (value == null || value === '') return '—'
  if (typeof value === 'boolean') return value ? 'Да' : 'Нет'
  return String(value)
}

export function AdminDataTable<T>({
  rows,
  columns,
  rowKey,
  searchPlaceholder,
  emptyText = 'Нет данных',
  toolbarTrailing,
  getRowProps,
  className,
  scrollClassName,
  table: tableProp,
}: AdminDataTableProps<T>) {
  const internal = useAdminDataTable(rows, columns)
  const table = tableProp ?? internal

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      <AdminDataTableToolbar
        table={table}
        columns={columns}
        searchPlaceholder={searchPlaceholder}
        trailing={toolbarTrailing}
      />

      <div className={scrollClassName}>
        <div className="rounded-lg border bg-background">
          <Table>
            <TableHeader>
              <TableRow>
                {columns.map((column) => (
                  <AdminSortableHead
                    key={column.id}
                    column={column}
                    sort={table.sort}
                    onToggle={table.toggleSort}
                  />
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {table.processedRows.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="h-20 text-center text-muted-foreground"
                  >
                    {emptyText}
                  </TableCell>
                </TableRow>
              ) : (
                table.processedRows.map((row) => {
                  const extra = getRowProps?.(row) ?? {}
                  return (
                    <TableRow key={rowKey(row)} {...extra}>
                      {columns.map((column) => (
                        <TableCell key={column.id} className={column.className}>
                          {defaultCell(row, column)}
                        </TableCell>
                      ))}
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  )
}

export { useAdminDataTable }
export type { AdminColumnDef, AdminDataTableApi }
