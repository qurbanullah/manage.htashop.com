import { FileUp } from 'lucide-react'
import type { ProductImportData, ProductImportPage } from '@/api/productImports'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ProductImportStatusBadge } from './ProductImportStatusBadge'

interface ProductImportHistoryProps {
  page: ProductImportPage<ProductImportData>
  isLoading: boolean
  selectedUuid: string | null
  onSelect: (uuid: string) => void
  onPageChange: (page: number) => void
}

export function ProductImportHistory({
  page,
  isLoading,
  selectedUuid,
  onSelect,
  onPageChange,
}: ProductImportHistoryProps) {
  const { items, meta } = page

  return (
    <Card>
      <CardHeader>
        <CardTitle>Import history</CardTitle>
      </CardHeader>

      <CardContent>
        {items.length === 0 && !isLoading ? (
          <EmptyState
            icon={FileUp}
            title="No imports yet"
            description="Upload a CSV, XLSX or ODS file to stage your first product import."
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>File</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Rows</TableHead>
                <TableHead className="text-right">Applied</TableHead>
                <TableHead>Uploaded</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => {
                const selected = item.uuid === selectedUuid

                return (
                  <TableRow
                    key={item.uuid}
                    className={selected ? 'bg-blue-50/60 dark:bg-blue-950/30' : undefined}
                  >
                    <TableCell className="max-w-[18rem]">
                      <div className="truncate font-medium text-gray-900 dark:text-white">
                        {item.original_filename}
                      </div>
                      <div className="text-gray-400 text-xs uppercase">
                        {item.kind_label ?? 'Products'} · {item.format}
                      </div>
                    </TableCell>
                    <TableCell>
                      <ProductImportStatusBadge status={item.status} label={item.status_label} />
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      <span className="text-gray-900 dark:text-white">
                        {item.counts.total.toLocaleString()}
                      </span>
                      {item.counts.invalid > 0 && (
                        <Badge variant="danger" className="ml-2">
                          {item.counts.invalid.toLocaleString()} invalid
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      <span className="text-green-600 dark:text-green-400">
                        {item.counts.created.toLocaleString()}
                      </span>
                      <span className="text-gray-400"> created</span>
                      <span className="mx-1 text-gray-300">·</span>
                      <span className="text-blue-600 dark:text-blue-400">
                        {item.counts.updated.toLocaleString()}
                      </span>
                      <span className="text-gray-400"> updated</span>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-gray-500 text-xs dark:text-gray-400">
                      {item.created_at ? new Date(item.created_at).toLocaleString() : '—'}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        type="button"
                        variant={selected ? 'secondary' : 'outline'}
                        size="sm"
                        onClick={() => onSelect(item.uuid)}
                      >
                        {selected ? 'Viewing' : 'View'}
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        )}

        {meta.last_page > 1 && (
          <div className="mt-4 flex items-center justify-between">
            <span className="text-gray-500 text-sm dark:text-gray-400">
              Page {meta.current_page} of {meta.last_page}
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
