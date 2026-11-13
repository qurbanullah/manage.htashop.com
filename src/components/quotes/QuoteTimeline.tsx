import { useMutation } from '@tanstack/react-query'
import {
  CheckCircle2,
  ClipboardList,
  Eye,
  FileText,
  Loader2,
  MessageSquare,
  Send,
  UserPlus,
  XCircle,
} from 'lucide-react'
import { useState } from 'react'
import { type QuoteActivity, type QuoteDetail, quotesApi } from '@/api/quotes'
import { formatDateTime } from '@/components/quotes/format'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/Toaster'
import { Textarea } from '@/components/ui/textarea'

interface TimelineProps {
  quote: QuoteDetail
  onChanged: () => void
}

const ICONS: Record<string, typeof ClipboardList> = {
  created: ClipboardList,
  assigned: UserPlus,
  status_changed: ClipboardList,
  response_draft: FileText,
  response_sent: Send,
  viewed: Eye,
  accepted: CheckCircle2,
  declined: XCircle,
  expired: XCircle,
  note: MessageSquare,
}

function describe(activity: QuoteActivity): string {
  const meta = activity.meta ?? {}

  switch (activity.type) {
    case 'created':
      return 'Quote request received'
    case 'assigned':
      return meta.assigned_to_name
        ? `Assigned to ${String(meta.assigned_to_name)}`
        : 'Unassigned from the team queue'
    case 'status_changed':
      return meta.reason
        ? `Status changed to ${String(meta.to)} · ${String(meta.reason)}`
        : `Status changed to ${String(meta.to)}`
    case 'response_draft':
      return `Draft revision ${String(meta.revision ?? '')} saved`
    case 'response_sent':
      return meta.resend
        ? `Revision ${String(meta.revision ?? '')} resent to the customer`
        : `Revision ${String(meta.revision ?? '')} sent to the customer`
    case 'viewed':
      return 'Customer viewed the quote'
    case 'accepted':
      return 'Customer accepted the quote'
    case 'declined':
      return meta.reason
        ? `Customer declined · ${String(meta.reason)}`
        : 'Customer declined the quote'
    case 'expired':
      return 'Quote offer expired'
    case 'note':
      return 'Internal note'
    default:
      return activity.type.replaceAll('_', ' ')
  }
}

export function QuoteTimeline({ quote, onChanged }: TimelineProps) {
  const { success: showSuccess, error: showError } = useToast()
  const [note, setNote] = useState('')

  const addNote = useMutation({
    mutationFn: (body: string) => quotesApi.addNote(quote.uuid, body),
    onSuccess: () => {
      setNote('')
      showSuccess('Note added')
      onChanged()
    },
    onError: (error: Error) => showError('Could not add the note', error.message),
  })

  const handleAdd = () => {
    const body = note.trim()

    if (!body) {
      showError('Empty note', 'Write something before adding it to the timeline.')
      return
    }

    addNote.mutate(body)
  }

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
        <h3 className="font-semibold text-gray-900 text-sm dark:text-white">Add internal note</h3>
        <p className="mt-0.5 text-gray-500 text-xs dark:text-gray-400">
          Only your team sees notes — the customer is never emailed.
        </p>
        <Textarea
          className="mt-3"
          rows={3}
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder="Called the buyer, waiting on specs…"
        />
        <div className="mt-3 flex justify-end">
          <Button size="sm" onClick={handleAdd} disabled={addNote.isPending}>
            {addNote.isPending ? (
              <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
            ) : (
              <MessageSquare className="mr-2 h-3.5 w-3.5" />
            )}
            Add note
          </Button>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
        <h3 className="font-semibold text-gray-900 text-sm dark:text-white">Activity</h3>

        {quote.activities.length === 0 ? (
          <p className="mt-3 text-gray-500 text-sm dark:text-gray-400">No activity yet.</p>
        ) : (
          <ol className="mt-4 space-y-4 border-gray-200 border-l pl-5 dark:border-gray-700">
            {quote.activities.map((activity) => {
              const Icon = ICONS[activity.type] ?? ClipboardList
              const isNote = activity.type === 'note'

              return (
                <li key={activity.id} className="relative">
                  <span className="absolute -left-[30px] flex h-5 w-5 items-center justify-center rounded-full bg-white ring-1 ring-gray-200 dark:bg-gray-800 dark:ring-gray-600">
                    <Icon className="h-3 w-3 text-gray-500 dark:text-gray-400" />
                  </span>
                  <p className="font-medium text-gray-900 text-sm dark:text-white">
                    {describe(activity)}
                  </p>
                  {isNote && activity.meta?.body ? (
                    <p className="mt-1 whitespace-pre-line rounded-lg bg-gray-50 p-3 text-gray-700 text-sm dark:bg-gray-900/40 dark:text-gray-300">
                      {String(activity.meta.body)}
                    </p>
                  ) : null}
                  <p className="mt-0.5 text-gray-500 text-xs dark:text-gray-400">
                    {formatDateTime(activity.created_at)}
                    {activity.user ? ` · ${activity.user.name}` : ''}
                  </p>
                </li>
              )
            })}
          </ol>
        )}
      </div>
    </div>
  )
}
