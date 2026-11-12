import { Search } from 'lucide-react'
import type { ProductImportPage, ProductImportRowData } from '@/api/productImports'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { type ProductImportRowStatus, ROW_STATUS_OPTIONS } from './types'

interface ProductImportRowsTableProps {
  page: ProductImportPage<ProductImportRowData>
  isLoading: boolean
  statusFilter: '' | ProductImportRowStatus
  search: string
  onStatusFilterChange: (status: '' | ProductImportRowStatus) => void
  onSearchChange: (value: string) => void
  onPageChange: (page: number) => void
}

const selectClass =
  'h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm dark:border-gray-600 dark:bg-gray-800'

const ROW_BADGE: Record<string, 'success' | 'danger' | 'warning' | 'secondary' | 'info'> = {
  imported: 'success',
  valid: 'info',
  invalid: 'danger',
  failed: 'warning',
  skipped: 'secondary',
  pending: 'secondary',
}

function errorText(errors: Record<string, string>): string {
  return Object.entries(errors)
    .map(([field, message]) => (field === 'row' ? message : `${field}: ${message}`))
    .join(' · ')
}

export function ProductImportRowsTable({
  page,
  isLoading,
  statusFilter,
  search,
  onStatusFilterChange,
  onSearchChange,
  onPageChange,
}: ProductImportRowsTableProps) {
  const { items, meta } = page

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle>Row report</CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                value={search}
                onChange={(event) => onSearchChange(event.target.value)}
                placeholder="Search external ID"
                className="h-10 w-56 pl-9"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(event) =>
                onStatusFilterChange(event.target.value as '' | ProductImportRowStatus)
              }
              className={selectClass}
              aria-label="Filter rows by status"
            >
              {ROW_STATUS_OPTIONS.map((option) => (
                <option key={option.value || 'all'} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {items.length === 0 ? (
          <p className="py-10 text-center text-gray-500 text-sm dark:text-gray-400">
            {isLoading ? 'Loading rows…' : 'No rows match this filter.'}
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">Row</TableHead>
                <TableHead>External ID</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Product</TableHead>
                <TableHead>Errors</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="text-gray-500 text-xs tabular-nums">
                    {row.row_number}
                  </TableCell>
                  <TableCell className="max-w-[14rem] truncate font-mono text-gray-900 text-xs dark:text-white">
                    {row.external_id || '—'}
                  </TableCell>
                  <TableCell>
                    <Badge variant={ROW_BADGE[row.status] ?? 'secondary'}>{row.status}</Badge>
                  </TableCell>
                  <TableCell className="max-w-[16rem] truncate text-gray-700 text-sm dark:text-gray-300">
                    {row.product?.name ?? '—'}
                  </TableCell>
                  <TableCell className="max-w-[24rem] text-xs">
                    {Object.keys(row.errors ?? {}).length > 0 ? (
                      <span className="line-clamp-2 text-red-600 dark:text-red-400">
                        {errorText(row.errors)}
                      </span>
                    ) : null}
                    {row.warnings && row.warnings.length > 0 ? (
                      <span className="block text-amber-600 dark:text-amber-400">
                        {row.warnings.join(' · ')}
                      </span>
                    ) : null}
                    {Object.keys(row.errors ?? {}).length === 0 &&
                      (row.warnings?.length ?? 0) === 0 && <span className="text-gray-400">—</span>}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        {meta.last_page > 1 && (
          <div className="mt-4 flex items-center justify-between">
            <span className="text-gray-500 text-sm dark:text-gray-400">
              Page {meta.current_page} of {meta.last_page} · {meta.total.toLocaleString()} rows
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={meta.current_page <= 1}
                onClick={() => onPageChange(meta.current_page - 1)}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={meta.current_page >= meta.last_page}
                onClick={() => onPageChange(meta.current_page + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
