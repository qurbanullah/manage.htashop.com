import { useQuery } from '@tanstack/react-query'
import { AlertTriangle, Eye, FileText, Inbox, RefreshCw, Search, Timer, X } from 'lucide-react'
import { type ReactNode, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  QUOTE_PRIORITY_OPTIONS,
  QUOTE_STATUS_OPTIONS,
  type QuoteListItem,
  type QuotePriority,
  type QuoteStatus,
  quotesApi,
} from '@/api/quotes'
import {
  formatDateTime,
  formatDuration,
  formatMoney,
  formatRelativeDue,
} from '@/components/quotes/format'
import { QuotePriorityBadge, QuoteStatusBadge } from '@/components/quotes/QuoteStatusBadge'
import { Button } from '@/components/ui/button'
import { type Column, DataTable } from '@/components/ui/data-table'
import { EmptyState } from '@/components/ui/empty-state'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { paths } from '@/routes/paths'

type StatusFilter = QuoteStatus | ''

const TABS: Array<{ value: StatusFilter; label: string }> = [
  { value: '', label: 'All' },
  ...QUOTE_STATUS_OPTIONS.map((option) => ({ value: option.value, label: option.label })),
]

const PAGE_SIZE = 20

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: quote list composes tabs, filters, KPI strip and table state in one view
export default function QuotesListPage() {
  const navigate = useNavigate()

  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [status, setStatus] = useState<StatusFilter>('')
  const [priority, setPriority] = useState<QuotePriority | ''>('')
  const [assignedTo, setAssignedTo] = useState('')
  const [page, setPage] = useState(1)

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(search.trim())
      setPage(1)
    }, 350)

    return () => window.clearTimeout(timer)
  }, [search])

  const listQuery = useQuery({
    queryKey: ['quotes', { debouncedSearch, status, priority, assignedTo, page }],
    queryFn: () =>
      quotesApi.list({
        search: debouncedSearch || undefined,
        status,
        priority,
        assigned_to: assignedTo || undefined,
        page,
        per_page: PAGE_SIZE,
      }),
  })

  const statsQuery = useQuery({
    queryKey: ['quotes', 'stats'],
    queryFn: () => quotesApi.stats(),
    staleTime: 60_000,
  })

  const assigneesQuery = useQuery({
    queryKey: ['quotes', 'assignees'],
    queryFn: () => quotesApi.assignees(),
    staleTime: 5 * 60_000,
  })

  const rows = listQuery.data?.data ?? []
  const meta = listQuery.data?.meta
  const counts = listQuery.data?.counts ?? {}
  const stats = statsQuery.data

  const hasFilters = Boolean(debouncedSearch || status || priority || assignedTo)

  const clearFilters = () => {
    setSearch('')
    setDebouncedSearch('')
    setStatus('')
    setPriority('')
    setAssignedTo('')
    setPage(1)
  }

  const columns: Column<QuoteListItem>[] = useMemo(
    () => [
      {
        key: 'quote_number',
        label: 'Quote',
        render: (_value, row) => (
          <div className="min-w-[150px]">
            <p className="font-medium text-gray-900 dark:text-white">{row.quote_number ?? '—'}</p>
            <p className="text-gray-400 text-xs">{formatDateTime(row.created_at)}</p>
          </div>
        ),
      },
      {
        key: 'customer_name',
        label: 'Customer',
        render: (_value, row) => (
          <div className="min-w-[170px]">
            <p className="text-gray-900 dark:text-white">{row.customer_name || '—'}</p>
            <p className="truncate text-gray-400 text-xs">{row.organization}</p>
          </div>
        ),
      },
      {
        key: 'product_name',
        label: 'Product',
        render: (_value, row) => (
          <div className="min-w-[160px]">
            <p className="text-gray-900 text-sm dark:text-white">{row.product_name ?? '—'}</p>
            {row.sku && <p className="text-gray-400 text-xs">SKU {row.sku}</p>}
          </div>
        ),
      },
      {
        key: 'value',
        label: 'Latest offer',
        render: (_value, row) =>
          row.latest_response?.total_amount != null ? (
            <div>
              <p className="font-semibold text-gray-900 dark:text-white">
                {formatMoney(row.latest_response.total_amount, row.latest_response.currency)}
              </p>
              <p className="text-gray-400 text-xs">rev. {row.latest_response.revision}</p>
            </div>
          ) : (
            <span className="text-gray-400">—</span>
          ),
      },
      {
        key: 'sla',
        label: 'First response',
        render: (_value, row) => (
          <div className="min-w-[130px]">
            {row.first_response_at ? (
              <span className="text-gray-600 text-sm dark:text-gray-300">Responded</span>
            ) : row.response_due_at ? (
              <span
                className={cn(
                  'font-medium text-sm',
                  row.is_overdue
                    ? 'text-red-600 dark:text-red-400'
                    : 'text-gray-600 dark:text-gray-300'
                )}
              >
                {formatRelativeDue(row.response_due_at)}
              </span>
            ) : (
              <span className="text-gray-400">—</span>
            )}
            {row.is_overdue && <p className="text-red-500 text-xs dark:text-red-400">Past SLA</p>}
          </div>
        ),
      },
      {
        key: 'assigned_to',
        label: 'Owner',
        render: (_value, row) =>
          row.assigned_to ? (
            <div>
              <p className="text-gray-900 text-sm dark:text-white">{row.assigned_to.name}</p>
              <p className="text-gray-400 text-xs">Assigned</p>
            </div>
          ) : (
            <span className="text-amber-600 text-xs dark:text-amber-400">Unassigned</span>
          ),
      },
      {
        key: 'status',
        label: 'Status',
        render: (_value, row) => (
          <div className="flex flex-col items-start gap-1">
            <QuoteStatusBadge status={row.status} label={row.status_label} />
            <QuotePriorityBadge priority={row.priority} />
          </div>
        ),
      },
    ],
    []
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-bold text-2xl text-gray-900 dark:text-white">Quote requests</h1>
          <p className="mt-1 text-gray-500 text-sm dark:text-gray-400">
            Respond to buyer inquiries and track every revision until it is accepted.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => {
            listQuery.refetch()
            statsQuery.refetch()
          }}
          className="inline-flex items-center gap-2"
        >
          <RefreshCw className="h-4 w-4" /> Refresh
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          icon={<Inbox className="h-4 w-4" />}
          label="Open quotes"
          value={stats?.open ?? 0}
          hint="Pending, in progress, or replied"
          tone="blue"
        />
        <KpiCard
          icon={<AlertTriangle className="h-4 w-4" />}
          label="Past SLA"
          value={stats?.overdue ?? 0}
          hint="No first response within one business day"
          tone="red"
        />
        <KpiCard
          icon={<Timer className="h-4 w-4" />}
          label="Avg. first response"
          value={formatDuration(stats?.avg_first_response_minutes)}
          hint="Rolling average of the last 500 replies"
          tone="amber"
        />
        <KpiCard
          icon={<FileText className="h-4 w-4" />}
          label="Accepted"
          value={counts.accepted ?? 0}
          hint="Won quotes across all time"
          tone="emerald"
        />
      </div>

      <div className="flex flex-wrap items-center gap-1 border-gray-200 border-b dark:border-gray-700">
        {TABS.map((tab) => {
          const active = status === tab.value
          const countKey = tab.value || 'all'
          const count = counts[countKey] ?? 0

          return (
            <button
              key={tab.value || 'all'}
              type="button"
              onClick={() => {
                setStatus(tab.value)
                setPage(1)
              }}
              className={cn(
                'inline-flex items-center gap-2 border-b-2 px-3 py-2.5 font-medium text-sm transition-colors',
                active
                  ? 'border-blue-500 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
              )}
            >
              {tab.label}
              <span
                className={cn(
                  'rounded-full px-2 py-0.5 text-xs',
                  active
                    ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300'
                    : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-300'
                )}
              >
                {count}
              </span>
            </button>
          )
        })}
      </div>

      <div className="flex flex-col gap-3 lg:flex-row">
        <div className="relative flex-1">
          <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            autoComplete="off"
            spellCheck={false}
            placeholder="Search quote number, customer, product, SKU…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="h-10 pl-9"
          />
        </div>

        <select
          value={priority}
          onChange={(event) => {
            setPriority(event.target.value as QuotePriority | '')
            setPage(1)
          }}
          className="h-10 rounded-lg border border-gray-300 bg-white px-3 text-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 lg:w-44 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
        >
          <option value="">All priorities</option>
          {QUOTE_PRIORITY_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <select
          value={assignedTo}
          onChange={(event) => {
            setAssignedTo(event.target.value)
            setPage(1)
          }}
          className="h-10 rounded-lg border border-gray-300 bg-white px-3 text-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 lg:w-52 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
        >
          <option value="">Anyone</option>
          <option value="me">Assigned to me</option>
          <option value="unassigned">Unassigned</option>
          {(assigneesQuery.data ?? []).map((assignee) => (
            <option key={assignee.id} value={String(assignee.id)}>
              {assignee.name}
            </option>
          ))}
        </select>

        {hasFilters && (
          <Button variant="ghost" onClick={clearFilters} className="inline-flex items-center gap-2">
            <X className="h-4 w-4" /> Clear
          </Button>
        )}
      </div>

      {!listQuery.isLoading && rows.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
          <EmptyState
            icon={FileText}
            title={hasFilters ? 'No quotes match your filters' : 'No quote requests yet'}
            description={
              hasFilters
                ? 'Try a different status, priority, or search term.'
                : 'Quote requests submitted from the storefront will appear here.'
            }
            action={hasFilters ? { label: 'Clear filters', onClick: clearFilters } : undefined}
          />
        </div>
      ) : (
        <DataTable
          data={rows}
          columns={columns}
          loading={listQuery.isLoading}
          error={listQuery.isError ? 'Could not load quotes. Please retry.' : null}
          currentPage={meta?.current_page ?? 1}
          totalPages={meta?.last_page ?? 1}
          pageSize={meta?.per_page ?? PAGE_SIZE}
          totalItems={meta?.total}
          onPageChange={setPage}
          emptyMessage="No quotes found"
          getRowId={(row) => row.uuid}
          actions={(row) => (
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(paths.quoteDetail.replace(':uuid', row.uuid))}
              className="inline-flex items-center gap-1"
            >
              <Eye className="h-3.5 w-3.5" /> Open
            </Button>
          )}
        />
      )}
    </div>
  )
}

const TONES = {
  blue: 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300',
  red: 'bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-300',
  amber: 'bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-300',
  emerald: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-300',
} as const

function KpiCard({
  icon,
  label,
  value,
  hint,
  tone,
}: {
  icon: ReactNode
  label: string
  value: number | string
  hint: string
  tone: keyof typeof TONES
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
      <div className="flex items-center justify-between">
        <p className="font-medium text-gray-500 text-xs uppercase tracking-wide dark:text-gray-400">
          {label}
        </p>
        <span className={cn('rounded-lg p-2', TONES[tone])}>{icon}</span>
      </div>
      <p className="mt-3 font-bold text-2xl text-gray-900 dark:text-white">{value}</p>
      <p className="mt-1 text-gray-500 text-xs dark:text-gray-400">{hint}</p>
    </div>
  )
}
