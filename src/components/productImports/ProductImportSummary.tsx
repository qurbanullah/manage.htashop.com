import { Download, Loader2, Play, XCircle } from 'lucide-react'
import type { ProductImportData } from '@/api/productImports'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ProductImportStatusBadge } from './ProductImportStatusBadge'

interface ProductImportSummaryProps {
  data: ProductImportData
  isCommitting: boolean
  isCancelling: boolean
  isDownloading: boolean
  onCommit: () => void
  onCancel: () => void
  onDownloadErrors: () => void
}

function formatBytes(bytes: number): string {
  if (!bytes) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: string }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50/60 px-3 py-2.5 dark:border-gray-700 dark:bg-gray-900/40">
      <div
        className={`font-semibold text-lg tabular-nums ${tone ?? 'text-gray-900 dark:text-white'}`}
      >
        {value.toLocaleString()}
      </div>
      <div className="text-[11px] text-gray-500 uppercase tracking-wide dark:text-gray-400">
        {label}
      </div>
    </div>
  )
}

const RUNNING_STATUSES = ['pending', 'parsing', 'validating', 'importing']

export function ProductImportSummary({
  data,
  isCommitting,
  isCancelling,
  isDownloading,
  onCommit,
  onCancel,
  onDownloadErrors,
}: ProductImportSummaryProps) {
  const { counts } = data
  const running = RUNNING_STATUSES.includes(data.status)
  const rejected = counts.invalid + counts.failed
  const canCommit = counts.valid > 0 && !running && data.status !== 'cancelled'
  const canCancel = running

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <CardTitle className="truncate">{data.original_filename}</CardTitle>
            <p className="mt-1 text-gray-500 text-xs dark:text-gray-400">
              {data.kind_label ?? 'Products'} · {data.format.toUpperCase()} ·{' '}
              {formatBytes(data.size_bytes)}
              {data.user?.name ? ` · uploaded by ${data.user.name}` : ''}
              {data.created_at ? ` · ${new Date(data.created_at).toLocaleString()}` : ''}
            </p>
          </div>
          <ProductImportStatusBadge status={data.status} label={data.status_label} />
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        <div>
          <div className="mb-1.5 flex items-center justify-between text-gray-500 text-xs dark:text-gray-400">
            <span>
              {counts.processed.toLocaleString()} of {counts.total.toLocaleString()} rows processed
            </span>
            <span className="font-medium tabular-nums">{data.progress}%</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
            <div
              className="h-full rounded-full bg-blue-600 transition-[width] duration-500"
              style={{ width: `${Math.min(100, Math.max(0, data.progress))}%` }}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6">
          <Stat label="Rows" value={counts.total} />
          <Stat label="Valid" value={counts.valid} tone="text-blue-600 dark:text-blue-400" />
          <Stat label="Invalid" value={counts.invalid} tone="text-red-600 dark:text-red-400" />
          <Stat label="Created" value={counts.created} tone="text-green-600 dark:text-green-400" />
          <Stat label="Updated" value={counts.updated} />
          <Stat label="Failed" value={counts.failed} tone="text-amber-600 dark:text-amber-400" />
        </div>

        {data.error_message && (
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-red-700 text-sm dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
            {data.error_message}
          </p>
        )}

        {data.options?.dry_run === true && data.status === 'completed' && (
          <p className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-blue-700 text-sm dark:border-blue-900/50 dark:bg-blue-950/40 dark:text-blue-300">
            Validation-only run. Nothing has been written yet — commit to apply the valid rows.
          </p>
        )}

        <div className="flex flex-wrap items-center gap-2">
          {canCommit && (
            <Button type="button" onClick={onCommit} disabled={isCommitting}>
              {isCommitting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Play className="mr-2 h-4 w-4" />
              )}
              Commit {counts.valid.toLocaleString()} rows
            </Button>
          )}

          {canCancel && (
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isCancelling}
              className="text-red-600 hover:text-red-700 dark:text-red-400"
            >
              {isCancelling ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <XCircle className="mr-2 h-4 w-4" />
              )}
              Cancel import
            </Button>
          )}

          {rejected > 0 && (
            <Button
              type="button"
              variant="outline"
              onClick={onDownloadErrors}
              disabled={isDownloading}
            >
              {isDownloading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Download className="mr-2 h-4 w-4" />
              )}
              Download {rejected.toLocaleString()} rejected rows
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
