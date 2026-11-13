import type { QuoteDetail } from '@/api/quotes'
import { formatDateTime, formatMoney } from '@/components/quotes/format'
import { QuoteResponseStatusBadge } from '@/components/quotes/QuoteStatusBadge'

/**
 * Commercial summary for the overview tab: the last offer the buyer received.
 */
export function QuoteBudget({ quote }: { quote: QuoteDetail }) {
  const latest = quote.latest_response

  if (!latest) {
    return (
      <p className="text-gray-500 text-sm dark:text-gray-400">
        No offer has been sent yet. Compose a reply to quote pricing for this request.
      </p>
    )
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-gray-500 text-sm dark:text-gray-400">Latest revision</span>
        <span className="font-medium text-gray-900 text-sm dark:text-white">
          #{latest.revision}
        </span>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-gray-500 text-sm dark:text-gray-400">Total</span>
        <span className="font-semibold text-gray-900 text-lg dark:text-white">
          {formatMoney(latest.total_amount, latest.currency)}
        </span>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-gray-500 text-sm dark:text-gray-400">Subtotal</span>
        <span className="font-medium text-gray-900 text-sm dark:text-white">
          {formatMoney(latest.subtotal, latest.currency)}
        </span>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-gray-500 text-sm dark:text-gray-400">Status</span>
        <QuoteResponseStatusBadge status={latest.status} label={latest.status_label} />
      </div>
      <div className="flex items-center justify-between">
        <span className="text-gray-500 text-sm dark:text-gray-400">Sent</span>
        <span className="font-medium text-gray-900 text-sm dark:text-white">
          {formatDateTime(latest.sent_at)}
        </span>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-gray-500 text-sm dark:text-gray-400">Valid until</span>
        <span className="font-medium text-gray-900 text-sm dark:text-white">
          {formatDateTime(latest.expires_at)}
        </span>
      </div>
      {latest.sender && (
        <div className="flex items-center justify-between">
          <span className="text-gray-500 text-sm dark:text-gray-400">Prepared by</span>
          <span className="font-medium text-gray-900 text-sm dark:text-white">
            {latest.sender.name}
          </span>
        </div>
      )}
    </div>
  )
}
