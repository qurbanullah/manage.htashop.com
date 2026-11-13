import { useMutation } from '@tanstack/react-query'
import { ChevronDown, FileDown, Loader2, Pencil, RotateCcw } from 'lucide-react'
import { useState } from 'react'
import { type QuoteDetail, type QuoteResponse, quotesApi } from '@/api/quotes'
import { formatDateTime, formatMoney } from '@/components/quotes/format'
import { QuoteLogisticsSummary } from '@/components/quotes/QuoteLogisticsSummary'
import { QuoteResponseStatusBadge } from '@/components/quotes/QuoteStatusBadge'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/Toaster'
import { cn } from '@/lib/utils'

interface RevisionsProps {
  quote: QuoteDetail
  onEditDraft: (draft: QuoteResponse) => void
  onChanged: () => void
}

export function QuoteRevisions({ quote, onEditDraft, onChanged }: RevisionsProps) {
  const { success: showSuccess, error: showError } = useToast()
  const [openUuid, setOpenUuid] = useState<string | null>(quote.responses[0]?.uuid ?? null)
  const [generatingUuid, setGeneratingUuid] = useState<string | null>(null)

  const resend = useMutation({
    mutationFn: (uuid: string) => quotesApi.resend(quote.uuid, uuid),
    onSuccess: () => {
      showSuccess('Email queued', 'The revision will be delivered shortly.')
      onChanged()
    },
    onError: (error: Error) => showError('Could not resend', error.message),
  })

  const handleDownloadPdf = async (response: QuoteResponse) => {
    setGeneratingUuid(response.uuid)

    try {
      const document = await quotesApi.quotationPdf(quote.uuid, response.uuid)

      if (document.download_url) {
        window.open(document.download_url, '_blank', 'noopener,noreferrer')
      } else {
        showError('PDF ready', 'The file was generated but no download URL is configured.')
      }
    } catch (error) {
      showError('Could not generate the PDF', (error as Error).message)
    } finally {
      setGeneratingUuid(null)
    }
  }

  if (quote.responses.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-8 text-center dark:border-gray-700 dark:bg-gray-800">
        <p className="font-medium text-gray-900 text-sm dark:text-white">No quote revisions yet</p>
        <p className="mt-1 text-gray-500 text-sm dark:text-gray-400">
          Compose the first reply to send pricing to the customer.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {quote.responses.map((response) => (
        <RevisionCard
          key={response.uuid}
          response={response}
          open={openUuid === response.uuid}
          onToggle={() => setOpenUuid(openUuid === response.uuid ? null : response.uuid)}
          onEditDraft={onEditDraft}
          onResend={() => resend.mutate(response.uuid)}
          resending={resend.isPending}
          onDownloadPdf={() => void handleDownloadPdf(response)}
          downloading={generatingUuid === response.uuid}
          pdfBusy={generatingUuid !== null}
        />
      ))}
    </div>
  )
}

interface RevisionCardProps {
  response: QuoteResponse
  open: boolean
  onToggle: () => void
  onEditDraft: (draft: QuoteResponse) => void
  onResend: () => void
  resending: boolean
  onDownloadPdf: () => void
  downloading: boolean
  pdfBusy: boolean
}

function RevisionCard({
  response,
  open,
  onToggle,
  onEditDraft,
  onResend,
  resending,
  onDownloadPdf,
  downloading,
  pdfBusy,
}: RevisionCardProps) {
  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left hover:bg-gray-50 dark:hover:bg-gray-700/40"
      >
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-gray-900 text-sm dark:text-white">
              Revision {response.revision}
            </span>
            <QuoteResponseStatusBadge status={response.status} label={response.status_label} />
            {response.is_expired && (
              <span className="font-medium text-red-600 text-xs dark:text-red-400">Expired</span>
            )}
          </div>
          <p className="mt-1 truncate text-gray-600 text-sm dark:text-gray-300">
            {response.subject}
          </p>
          <p className="mt-0.5 text-gray-500 text-xs dark:text-gray-400">
            {formatMoney(response.total_amount, response.currency)}
            {response.sent_at ? ` · sent ${formatDateTime(response.sent_at)}` : ' · not sent'}
            {response.sender ? ` · ${response.sender.name}` : ''}
          </p>
        </div>
        <ChevronDown
          className={cn(
            'h-4 w-4 shrink-0 text-gray-400 transition-transform',
            open ? 'rotate-180' : ''
          )}
        />
      </button>

      {open && (
        <div className="border-gray-200 border-t px-5 py-4 dark:border-gray-700">
          <p className="whitespace-pre-line text-gray-700 text-sm dark:text-gray-300">
            {response.message}
          </p>

          {response.items && response.items.length > 0 && (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-gray-200 border-b text-left text-gray-500 text-xs uppercase tracking-wide dark:border-gray-700 dark:text-gray-400">
                    <th className="pb-2">Item</th>
                    <th className="pb-2 text-right">Qty</th>
                    <th className="pb-2 text-right">Unit price</th>
                    <th className="pb-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60">
                  {response.items.map((item) => (
                    <tr key={`${response.uuid}-${item.name}-${item.quantity}`}>
                      <td className="py-2">
                        <p className="font-medium text-gray-900 dark:text-white">{item.name}</p>
                        {item.sku && <p className="text-gray-400 text-xs">SKU {item.sku}</p>}
                      </td>
                      <td className="py-2 text-right text-gray-700 dark:text-gray-300">
                        {item.quantity}
                      </td>
                      <td className="py-2 text-right text-gray-700 dark:text-gray-300">
                        {formatMoney(item.unit_price, response.currency)}
                      </td>
                      <td className="py-2 text-right font-medium text-gray-900 dark:text-white">
                        {formatMoney(item.line_total, response.currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
            <Row label="Subtotal" value={formatMoney(response.subtotal, response.currency)} />
            <Row
              label="Discount"
              value={formatMoney(response.discount_amount, response.currency)}
            />
            <Row label="Tax" value={formatMoney(response.tax_amount, response.currency)} />
            <Row
              label="Shipping"
              value={formatMoney(response.shipping_amount, response.currency)}
            />
            <Row
              label="Total"
              value={formatMoney(response.total_amount, response.currency)}
              strong
            />
            <Row
              label="Valid until"
              value={response.expires_at ? formatDateTime(response.expires_at) : '—'}
            />
          </div>

          {response.terms && (
            <div className="mt-4 rounded-lg bg-gray-50 p-3 text-gray-600 text-xs dark:bg-gray-900/40 dark:text-gray-300">
              {response.terms}
            </div>
          )}

          <QuoteLogisticsSummary response={response} />

          <div className="mt-4 flex flex-wrap justify-end gap-2">
            <Button variant="outline" size="sm" onClick={onDownloadPdf} disabled={pdfBusy}>
              {downloading ? (
                <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
              ) : (
                <FileDown className="mr-1 h-3.5 w-3.5" />
              )}
              Download PDF
            </Button>
            {response.status === 'draft' && (
              <Button variant="outline" size="sm" onClick={() => onEditDraft(response)}>
                <Pencil className="mr-1 h-3.5 w-3.5" /> Edit draft
              </Button>
            )}
            {response.status !== 'draft' && (
              <Button variant="outline" size="sm" onClick={onResend} disabled={resending}>
                {resending ? (
                  <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <RotateCcw className="mr-1 h-3.5 w-3.5" />
                )}
                Resend
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-gray-500 dark:text-gray-400">{label}</span>
      <span
        className={cn('text-gray-900 dark:text-white', strong ? 'font-semibold' : 'font-medium')}
      >
        {value}
      </span>
    </div>
  )
}
