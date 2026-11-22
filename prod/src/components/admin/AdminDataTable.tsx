import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronDown,
  ListFilter,
  Search,
  X,
} from 'lucide-react'
import type { ReactNode } from 'react'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { sanitizeTimeHmInput } from '@/lib/fieldInput'
import { cn } from '@/lib/utils'

import type { AdminColumnDef, AdminEnumOption, AdminSortState } from './adminDataTableTypes'
import {
  getAutoFilterColumns,
  isColumnSortable,
  type AdminDataTableApi,
  useAdminDataTable,
} from './useAdminDataTable'

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

function AdminMultiFilter({
  label,
  options,
  selected,
  onToggle,
}: {
  label: string
  options: AdminEnumOption[]
  selected: string[]
  onToggle: (value: string) => void
}) {
  const count = selected.length
  const summary =
    count === 0
      ? 'Все'
      : count === 1
        ? (options.find((o) => o.value === selected[0])?.label ?? selected[0])
        : `Выбрано: ${count}`

  return (
    <div className="relative min-w-[10.5rem] shrink-0 grow basis-[10.5rem] sm:max-w-[14rem]">
      <span className="pointer-events-none absolute bottom-full left-0 mb-1 text-xs leading-none text-muted-foreground">
        {label}
      </span>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="outline"
            className="h-9 w-full justify-between gap-2 px-2.5 font-normal"
            aria-label={label}
          >
            <span className="truncate text-left text-sm">{summary}</span>
            <ChevronDown className="size-3.5 shrink-0 opacity-60" aria-hidden />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="max-h-72 min-w-[11.5rem] overflow-y-auto">
          {options.map((opt) => (
            <DropdownMenuCheckboxItem
              key={opt.value}
              checked={selected.includes(opt.value)}
              onCheckedChange={() => onToggle(opt.value)}
              onSelect={(e) => e.preventDefault()}
            >
              {opt.label}
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

function AdminTimeRangeFilter({
  label,
  from,
  to,
  onChange,
}: {
  label: string
  from: string
  to: string
  onChange: (patch: { from?: string; to?: string }) => void
}) {
  return (
    <div className="relative min-w-[14rem] shrink-0 grow basis-[14rem]">
      <span className="pointer-events-none absolute bottom-full left-0 mb-1 text-xs leading-none text-muted-foreground">
        {label}
      </span>
      <div className="flex h-9 items-center gap-1.5">
        <span className="shrink-0 text-xs text-muted-foreground">с</span>
        <Input
          type="text"
          inputMode="numeric"
          placeholder="ЧЧ:ММ"
          value={from}
          onChange={(e) => onChange({ from: sanitizeTimeHmInput(e.target.value) })}
          className="h-9 min-w-0 flex-1 px-2 tabular-nums"
          aria-label={`${label}: с`}
        />
        <span className="shrink-0 text-xs text-muted-foreground">по</span>
        <Input
          type="text"
          inputMode="numeric"
          placeholder="ЧЧ:ММ"
          value={to}
          onChange={(e) => onChange({ to: sanitizeTimeHmInput(e.target.value) })}
          className="h-9 min-w-0 flex-1 px-2 tabular-nums"
          aria-label={`${label}: по`}
        />
      </div>
    </div>
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
  const filtersVisible = table.filtersOpen

  return (
    <div className="flex flex-col gap-3 pt-5">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <label className="relative w-full min-w-[16rem] max-w-sm shrink-0 sm:w-[18rem]">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={table.query}
            onChange={(e) => table.setQuery(e.target.value)}
            placeholder={searchPlaceholder}
            className="pl-8"
            aria-label="Поиск по таблице"
          />
        </label>

        {filterColumns.length > 0 ? (
          <Button
            type="button"
            variant={filtersVisible || table.hasColumnFilters ? 'default' : 'outline'}
            size="icon"
            className="relative size-9 shrink-0"
            aria-label={filtersVisible ? 'Скрыть фильтры' : 'Показать фильтры'}
            aria-expanded={filtersVisible}
            onClick={() => table.setFiltersOpen(!filtersVisible)}
          >
            <ListFilter className="size-4" aria-hidden />
            {table.hasColumnFilters ? (
              <span className="absolute -right-0.5 -top-0.5 size-2 rounded-full bg-amber-400 ring-2 ring-background" />
            ) : null}
          </Button>
        ) : null}

        {table.hasActiveFilters ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="shrink-0"
            onClick={table.clearFilters}
          >
            <X className="size-4" aria-hidden />
            Сбросить
          </Button>
        ) : null}

        <p className="text-xs text-muted-foreground sm:ml-auto">
          Показано {table.shownCount} из {table.totalCount}
        </p>

        {trailing}
      </div>

      {filtersVisible && filterColumns.length > 0 ? (
        <div className="flex w-full flex-wrap items-end gap-x-3 gap-y-7 border-t border-border/60 pt-7">
          {filterColumns.map((column) => {
            const type = column.filterType ?? (column.enumOptions?.length ? 'enum' : 'text')
            const filterLabel = column.filterLabel || column.header || column.id
            const selected = table.columnFilters[column.id] ?? []

            if (type === 'timeRange') {
              const range = table.columnRanges[column.id] ?? { from: '', to: '' }
              return (
                <AdminTimeRangeFilter
                  key={column.id}
                  label={filterLabel}
                  from={range.from}
                  to={range.to}
                  onChange={(patch) => table.setColumnRange(column.id, patch)}
                />
              )
            }
            if (type === 'boolean') {
              return (
                <AdminMultiFilter
                  key={column.id}
                  label={filterLabel}
                  options={[
                    { value: 'true', label: 'Да' },
                    { value: 'false', label: 'Нет' },
                  ]}
                  selected={selected}
                  onToggle={(value) => table.toggleColumnFilterValue(column.id, value)}
                />
              )
            }
            if (type === 'enum' && column.enumOptions?.length) {
              return (
                <AdminMultiFilter
                  key={column.id}
                  label={filterLabel}
                  options={column.enumOptions}
                  selected={selected}
                  onToggle={(value) => table.toggleColumnFilterValue(column.id, value)}
                />
              )
            }
            return null
          })}
        </div>
      ) : null}
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
        aria-label={column.header ? undefined : `Сортировать: ${column.id}`}
        className={cn(
          'inline-flex items-center gap-1.5 font-medium hover:text-foreground',
          column.header ? 'text-left' : 'w-full justify-center',
        )}
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
