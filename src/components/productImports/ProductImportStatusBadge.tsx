import { Badge } from '@/components/ui/badge'
import type { ProductImportStatus } from './types'

const VARIANTS: Record<
  string,
  'default' | 'secondary' | 'success' | 'warning' | 'danger' | 'info'
> = {
  pending: 'secondary',
  parsing: 'info',
  validating: 'info',
  importing: 'warning',
  completed: 'success',
  completed_with_errors: 'warning',
  failed: 'danger',
  cancelled: 'secondary',
}

const FALLBACK_LABELS: Record<string, string> = {
  pending: 'Pending',
  parsing: 'Parsing file',
  validating: 'Validating rows',
  importing: 'Importing',
  completed: 'Completed',
  completed_with_errors: 'Completed with errors',
  failed: 'Failed',
  cancelled: 'Cancelled',
}

interface ProductImportStatusBadgeProps {
  status: ProductImportStatus | string
  label?: string
  className?: string
}

export function ProductImportStatusBadge({
  status,
  label,
  className,
}: ProductImportStatusBadgeProps) {
  return (
    <Badge variant={VARIANTS[status] ?? 'secondary'} className={className}>
      {label ?? FALLBACK_LABELS[status] ?? status}
    </Badge>
  )
}
