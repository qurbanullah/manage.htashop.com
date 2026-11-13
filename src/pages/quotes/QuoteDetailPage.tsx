import { useQuery } from '@tanstack/react-query'
import {
  ArrowLeft,
  ClipboardList,
  FileText,
  Loader2,
  MessageSquare,
  type Package,
  Send,
  Users,
} from 'lucide-react'
import { type ReactNode, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  type QuoteDetail,
  type QuotePackagingPrefill,
  type QuoteResponse,
  quotesApi,
} from '@/api/quotes'
import { formatDateTime } from '@/components/quotes/format'
import { QuoteBudget } from '@/components/quotes/QuoteBudget'
import { QuoteReplyModal } from '@/components/quotes/QuoteReplyModal'
import { QuoteRevisions } from '@/components/quotes/QuoteRevisions'
import { QuoteSidebar } from '@/components/quotes/QuoteSidebar'
import { QuoteStatusBadge } from '@/components/quotes/QuoteStatusBadge'
import { QuoteTimeline } from '@/components/quotes/QuoteTimeline'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { paths } from '@/routes/paths'

type Tab = 'overview' | 'replies' | 'activity'

const TABS: Array<{ key: Tab; label: string; icon: typeof Package }> = [
  { key: 'overview', label: 'Overview', icon: ClipboardList },
  { key: 'replies', label: 'Replies', icon: FileText },
  { key: 'activity', label: 'Activity', icon: MessageSquare },
]

export default function QuoteDetailPage() {
  const { uuid } = useParams<{ uuid: string }>()
  const [activeTab, setActiveTab] = useState<Tab>('overview')
  const [replyOpen, setReplyOpen] = useState(false)
  const [editingDraft, setEditingDraft] = useState<QuoteResponse | null>(null)

  const {
    data: quote,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['quote', uuid],
    queryFn: () => {
      if (!uuid) throw new Error('Quote id is missing')
      return quotesApi.get(uuid)
    },
    enabled: !!uuid,
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }

  if (isError || !quote) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <FileText className="mb-4 h-12 w-12 text-red-300 dark:text-red-600" />
        <h3 className="font-medium text-gray-900 text-lg dark:text-white">Quote not found</h3>
        <p className="mt-1 text-gray-500 text-sm">
          The quote you are looking for does not exist or belongs to another organization.
        </p>
        <Link to={paths.quotes} className="mt-4">
          <Button variant="outline" size="sm">
            <ArrowLeft className="mr-1 h-4 w-4" /> Back to quotes
          </Button>
        </Link>
      </div>
    )
  }

  const openReply = () => {
    setEditingDraft(null)
    setReplyOpen(true)
  }

  const openDraft = (draft: QuoteResponse) => {
    setEditingDraft(draft)
    setReplyOpen(true)
  }

  const refresh = () => {
    void refetch()
  }

  return (
    <div className="flex flex-col gap-6 xl:flex-row">
      <div className="min-w-0 flex-1 space-y-6">
        <div className="flex flex-wrap items-start gap-4">
          <Link
            to={paths.quotes}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-300"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-bold text-gray-900 text-xl dark:text-white">
                {quote.quote_number ?? 'Quote request'}
              </h1>
              <QuoteStatusBadge status={quote.status} label={quote.status_label} />
            </div>
            <p className="mt-1 text-gray-500 text-sm dark:text-gray-400">
              {quote.customer_name} · {quote.organization} · requested{' '}
              {formatDateTime(quote.created_at)}
            </p>
          </div>
          <Button onClick={openReply}>
            <Send className="mr-2 h-4 w-4" /> Compose reply
          </Button>
        </div>

        <div className="flex gap-1 overflow-x-auto border-gray-200 border-b dark:border-gray-700">
          {TABS.map((tab) => (
            <button
              type="button"
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                'inline-flex shrink-0 items-center gap-2 border-b-2 px-4 py-2.5 font-medium text-sm transition-colors',
                activeTab === tab.key
                  ? 'border-blue-500 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
              )}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'overview' && <QuoteOverview quote={quote} />}
        {activeTab === 'replies' && (
          <QuoteRevisions quote={quote} onEditDraft={openDraft} onChanged={refresh} />
        )}
        {activeTab === 'activity' && <QuoteTimeline quote={quote} onChanged={refresh} />}
      </div>

      <aside className="w-full shrink-0 xl:sticky xl:top-6 xl:w-80 xl:self-start">
        <QuoteSidebar quote={quote} onChanged={refresh} onReply={openReply} />
      </aside>

      <QuoteReplyModal
        quote={quote}
        isOpen={replyOpen}
        draft={editingDraft}
        onClose={() => setReplyOpen(false)}
        onSaved={refresh}
      />
    </div>
  )
}

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: overview aggregates the buyer, requirement and commercial cards
function QuoteOverview({ quote }: { quote: QuoteDetail }) {
  const requirements = quote.requirements ?? {}

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Requested item">
          <Field label="Product" value={requirements.product_name ?? quote.product_name ?? '—'} />
          <Field
            label="Quantity"
            value={requirements.quantity != null ? String(requirements.quantity) : '—'}
          />
          <Field label="SKU" value={requirements.sku ?? quote.sku ?? '—'} />
          <Field label="Part number" value={requirements.part_number ?? quote.part_number ?? '—'} />
          <Field label="Model number" value={asText(requirements.model_number)} />
          <Field label="GTIN" value={asText(requirements.gtin)} />
          <Field label="Manufacturer" value={asText(requirements.manufacturer)} />
          <Field label="Brand" value={asText(requirements.brand)} />
          {quote.quotable?.route_key && (
            <Field label="Storefront route" value={quote.quotable.route_key} />
          )}
        </Card>

        <Card title="Buyer" icon={<Users className="h-4 w-4" />}>
          <Field label="Contact" value={quote.customer_name} />
          <Field label="Email" value={quote.customer_email} />
          <Field label="Business email" value={quote.business_email ?? '—'} />
          <Field label="Phone" value={quote.customer_phone ?? '—'} />
          <Field label="Organization" value={quote.organization} />
          <Field label="Department" value={quote.department ?? '—'} />
          <Field label="Job title" value={quote.job_title ?? '—'} />
          <Field label="Company size" value={quote.company_size ?? '—'} />
          <Field label="Industry" value={quote.industry ?? '—'} />
          <Field
            label="Location"
            value={[quote.city, quote.state, quote.country].filter(Boolean).join(', ') || '—'}
          />
        </Card>
      </div>

      <Card title="Requirement details">
        {quote.application && (
          <div className="mb-4">
            <p className="font-medium text-gray-500 text-xs uppercase tracking-wide dark:text-gray-400">
              Application
            </p>
            <p className="mt-1 whitespace-pre-line text-gray-800 text-sm dark:text-gray-200">
              {quote.application}
            </p>
          </div>
        )}
        <p className="font-medium text-gray-500 text-xs uppercase tracking-wide dark:text-gray-400">
          Message
        </p>
        <p className="mt-1 whitespace-pre-line text-gray-800 text-sm dark:text-gray-200">
          {quote.message || '—'}
        </p>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Commercials">
          <QuoteBudget quote={quote} />
        </Card>

        <Card title="Internal">
          <Field label="Tenant" value={quote.tenant?.name ?? '—'} />
          <Field label="Organization" value={quote.organization_ref?.name ?? '—'} />
          <Field label="Source page" value={quote.source_page ?? '—'} />
          <Field label="Priority" value={quote.priority ?? '—'} />
          <Field
            label="Assigned to"
            value={quote.assigned_to ? quote.assigned_to.name : 'Unassigned'}
          />
          <Field label="Cancelled reason" value={quote.cancelled_reason ?? '—'} />
        </Card>
      </div>

      {quote.packaging_prefill && <CataloguePackaging prefill={quote.packaging_prefill} />}
    </div>
  )
}

/**
 * Read-only packaging defaults from the quoted product. The revision sent to
 * the buyer may carry different packing figures, so this is labelled as
 * catalogue data.
 */
function CataloguePackaging({ prefill }: { prefill: QuotePackagingPrefill }) {
  const handling = [
    prefill.is_fragile ? 'Fragile' : null,
    prefill.is_hazmat ? 'Hazardous goods' : null,
    prefill.is_stackable ? 'Stackable' : null,
  ].filter(Boolean)

  const rows: Array<[string, string]> = []
  if (prefill.gross_weight_kg != null) rows.push(['Gross weight', `${prefill.gross_weight_kg} kg`])
  if (prefill.net_weight_kg != null) rows.push(['Net weight', `${prefill.net_weight_kg} kg`])
  if (prefill.dimensions) rows.push(['Dimensions', `${prefill.dimensions} cm`])
  if (prefill.units_per_case > 0) rows.push(['Units per case', String(prefill.units_per_case)])
  rows.push(['Handling', handling.length > 0 ? handling.join(' · ') : 'None flagged'])
  if (prefill.handling_notes) rows.push(['Notes', prefill.handling_notes])

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
      <h2 className="font-semibold text-gray-900 text-sm dark:text-white">Catalogue packaging</h2>
      <p className="mt-0.5 text-gray-500 text-xs dark:text-gray-400">
        Defaults from the quoted product. The revision you send may differ.
      </p>
      <dl className="mt-3 grid gap-x-8 gap-y-2 text-sm sm:grid-cols-2">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-start justify-between gap-4">
            <dt className="text-gray-500 dark:text-gray-400">{label}</dt>
            <dd className="text-right font-medium text-gray-900 dark:text-white">{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}

function asText(value: unknown): string {
  return typeof value === 'string' && value.trim() !== '' ? value : '—'
}

function Card({ title, icon, children }: { title: string; icon?: ReactNode; children: ReactNode }) {
  return (
    <section className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
      <h2 className="mb-3 flex items-center gap-2 font-semibold text-gray-900 text-sm dark:text-white">
        {icon}
        {title}
      </h2>
      <div className="space-y-2">{children}</div>
    </section>
  )
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-gray-500 text-sm dark:text-gray-400">{label}</span>
      <span className="max-w-[65%] text-right font-medium text-gray-900 text-sm dark:text-white">
        {value}
      </span>
    </div>
  )
}
