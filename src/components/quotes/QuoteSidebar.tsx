import { useMutation, useQuery } from '@tanstack/react-query'
import { Loader2, Mail, Phone, Send, User2 } from 'lucide-react'
import { useState } from 'react'
import { QUOTE_STATUS_OPTIONS, type QuoteDetail, type QuoteStatus, quotesApi } from '@/api/quotes'
import { formatDateTime } from '@/components/quotes/format'
import { QuotePriorityBadge, QuoteStatusBadge } from '@/components/quotes/QuoteStatusBadge'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/Toaster'
import { Textarea } from '@/components/ui/textarea'

/**
 * Mirrors App\Enums\QuoteStatus::TRANSITIONS so the operator is never offered a
 * move the API will reject.
 */
const TRANSITIONS: Record<QuoteStatus, QuoteStatus[]> = {
  pending: ['in_progress', 'replied', 'cancelled'],
  in_progress: ['replied', 'cancelled'],
  replied: ['in_progress', 'accepted', 'declined', 'expired', 'cancelled'],
  accepted: ['in_progress'],
  declined: ['in_progress'],
  expired: ['in_progress'],
  cancelled: ['in_progress'],
}

const REASON_REQUIRED: QuoteStatus[] = ['cancelled', 'declined']

interface QuoteSidebarProps {
  quote: QuoteDetail
  onChanged: () => void
  onReply: () => void
}

export function QuoteSidebar({ quote, onChanged, onReply }: QuoteSidebarProps) {
  const { success: showSuccess, error: showError } = useToast()

  const [targetStatus, setTargetStatus] = useState<QuoteStatus | ''>('')
  const [reason, setReason] = useState('')
  const [assigneeId, setAssigneeId] = useState<string>(
    quote.assigned_to ? String(quote.assigned_to.id) : ''
  )

  const assigneesQuery = useQuery({
    queryKey: ['quotes', 'assignees'],
    queryFn: () => quotesApi.assignees(),
    staleTime: 5 * 60_000,
  })

  const statusMutation = useMutation({
    mutationFn: ({ status, note }: { status: QuoteStatus; note?: string }) =>
      quotesApi.updateStatus(quote.uuid, status, note),
    onSuccess: (updated) => {
      showSuccess('Status updated', `Quote is now ${updated.status_label.toLowerCase()}.`)
      setTargetStatus('')
      setReason('')
      onChanged()
    },
    onError: (error: Error) => showError('Could not change the status', error.message),
  })

  const assignMutation = useMutation({
    mutationFn: (userId: number | null) => quotesApi.assign(quote.uuid, userId),
    onSuccess: (updated) => {
      showSuccess(
        'Owner updated',
        updated.assigned_to ? `Assigned to ${updated.assigned_to.name}.` : 'Quote is unassigned.'
      )
      onChanged()
    },
    onError: (error: Error) => showError('Could not assign the quote', error.message),
  })

  const statusOptions = [quote.status, ...TRANSITIONS[quote.status]]
  const requiresReason = targetStatus !== '' && REASON_REQUIRED.includes(targetStatus)

  const handleApplyStatus = () => {
    if (!targetStatus) return

    if (requiresReason && !reason.trim()) {
      showError('Reason required', 'Tell the team why this quote is being closed.')
      return
    }

    statusMutation.mutate({ status: targetStatus, note: reason.trim() || undefined })
  }

  const handleAssign = (value: string) => {
    setAssigneeId(value)
    assignMutation.mutate(value === '' ? null : Number(value))
  }

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-gray-900 text-sm dark:text-white">Status</h2>
          <QuoteStatusBadge status={quote.status} label={quote.status_label} />
        </div>
        {quote.priority && (
          <div className="mt-2">
            <QuotePriorityBadge priority={quote.priority} />
          </div>
        )}

        <div className="mt-4 space-y-3">
          <div>
            <Label htmlFor="quote-status-select">Move to</Label>
            <select
              id="quote-status-select"
              value={targetStatus}
              onChange={(event) => setTargetStatus(event.target.value as QuoteStatus | '')}
              className="h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-gray-900 text-sm dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
            >
              <option value="">Keep current status</option>
              {statusOptions
                .filter((status) => status !== quote.status)
                .map((status) => (
                  <option key={status} value={status}>
                    {QUOTE_STATUS_OPTIONS.find((option) => option.value === status)?.label ??
                      status}
                  </option>
                ))}
            </select>
          </div>

          {requiresReason && (
            <div>
              <Label htmlFor="quote-status-reason">Reason</Label>
              <Textarea
                id="quote-status-reason"
                rows={2}
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                placeholder="Required when closing a quote"
              />
            </div>
          )}

          <Button
            className="w-full"
            disabled={!targetStatus || statusMutation.isPending}
            onClick={handleApplyStatus}
          >
            {statusMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Apply status
          </Button>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
        <h2 className="font-semibold text-gray-900 text-sm dark:text-white">Owner</h2>
        <p className="mt-0.5 text-gray-500 text-xs dark:text-gray-400">
          Any team member can reply once a quote is assigned.
        </p>
        <div className="mt-3 flex items-center gap-2">
          <User2 className="h-4 w-4 text-gray-400" />
          <select
            value={assigneeId}
            onChange={(event) => handleAssign(event.target.value)}
            disabled={assignMutation.isPending}
            className="h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-gray-900 text-sm dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
          >
            <option value="">Unassigned</option>
            {(assigneesQuery.data ?? []).map((assignee) => (
              <option key={assignee.id} value={String(assignee.id)}>
                {assignee.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
        <h2 className="font-semibold text-gray-900 text-sm dark:text-white">Contact</h2>
        <div className="mt-3 space-y-2 text-sm">
          <p className="font-medium text-gray-900 dark:text-white">{quote.customer_name}</p>
          <a
            href={`mailto:${quote.customer_email}`}
            className="flex items-center gap-2 text-blue-600 hover:underline dark:text-blue-400"
          >
            <Mail className="h-4 w-4" /> {quote.customer_email}
          </a>
          {quote.customer_phone && (
            <a
              href={`tel:${quote.customer_phone}`}
              className="flex items-center gap-2 text-gray-700 dark:text-gray-300"
            >
              <Phone className="h-4 w-4" /> {quote.customer_phone}
            </a>
          )}
          <p className="text-gray-500 text-xs dark:text-gray-400">
            {quote.organization}
            {quote.job_title ? ` · ${quote.job_title}` : ''}
          </p>
        </div>
        <Button className="mt-4 w-full" onClick={onReply}>
          <Send className="mr-2 h-4 w-4" /> Compose reply
        </Button>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
        <h2 className="font-semibold text-gray-900 text-sm dark:text-white">Timeline</h2>
        <dl className="mt-3 space-y-2 text-sm">
          <TimelineRow label="Requested" value={formatDateTime(quote.created_at)} />
          <TimelineRow label="First response" value={formatDateTime(quote.first_response_at)} />
          <TimelineRow label="Last response" value={formatDateTime(quote.last_response_at)} />
          <TimelineRow label="SLA due" value={formatDateTime(quote.response_due_at)} />
          <TimelineRow label="Quoted" value={formatDateTime(quote.quoted_at)} />
          <TimelineRow label="Accepted" value={formatDateTime(quote.accepted_at)} />
          <TimelineRow label="Declined" value={formatDateTime(quote.declined_at)} />
        </dl>
      </div>
    </div>
  )
}

function TimelineRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <dt className="text-gray-500 dark:text-gray-400">{label}</dt>
      <dd className="text-right font-medium text-gray-900 dark:text-white">{value}</dd>
    </div>
  )
}
