import {
  QUOTE_PRIORITY_OPTIONS,
  QUOTE_RESPONSE_TONES,
  QUOTE_STATUS_LABELS,
  QUOTE_STATUS_TONES,
  type QuotePriority,
  type QuoteResponseStatus,
  type QuoteStatus,
} from '@/api/quotes'
import { cn } from '@/lib/utils'

const BASE =
  'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 font-medium text-xs ring-1 ring-inset'

export function QuoteStatusBadge({
  status,
  label,
  className,
}: {
  status: QuoteStatus
  label?: string
  className?: string
}) {
  return (
    <span className={cn(BASE, QUOTE_STATUS_TONES[status] ?? QUOTE_STATUS_TONES.pending, className)}>
      {label ?? QUOTE_STATUS_LABELS[status] ?? status}
    </span>
  )
}

export function QuoteResponseStatusBadge({
  status,
  label,
  className,
}: {
  status: QuoteResponseStatus
  label?: string
  className?: string
}) {
  return (
    <span
      className={cn(BASE, QUOTE_RESPONSE_TONES[status] ?? QUOTE_RESPONSE_TONES.draft, className)}
    >
      {label ?? status}
    </span>
  )
}

const PRIORITY_TONES: Record<QuotePriority, string> = {
  low: 'bg-gray-100 text-gray-600 ring-gray-500/20 dark:bg-gray-700 dark:text-gray-300',
  normal: 'bg-sky-50 text-sky-700 ring-sky-600/20 dark:bg-sky-500/10 dark:text-sky-300',
  high: 'bg-orange-50 text-orange-700 ring-orange-600/20 dark:bg-orange-500/10 dark:text-orange-300',
  urgent: 'bg-red-50 text-red-700 ring-red-600/20 dark:bg-red-500/10 dark:text-red-300',
}

export function QuotePriorityBadge({ priority }: { priority: QuotePriority | null }) {
  if (!priority) return null

  const label =
    QUOTE_PRIORITY_OPTIONS.find((option) => option.value === priority)?.label ?? priority

  return <span className={cn(BASE, PRIORITY_TONES[priority])}>{label}</span>
}
