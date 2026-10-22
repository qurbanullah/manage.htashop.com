import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Building2,
  Handshake,
  KeyRound,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
} from 'lucide-react'
import { useState } from 'react'
import { type PunchoutBuyer, type PunchoutProtocol, punchoutBuyersApi } from '@/api/punchoutBuyers'
import { PunchoutBuyerModal } from '@/components/punchout/modals/PunchoutBuyerModal'
import { RotatePunchoutSecretModal } from '@/components/punchout/modals/RotatePunchoutSecretModal'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/ui/Toaster'
import { isApiError } from '@/lib/api-response'

const PER_PAGE = 15

function formatDateTime(value: string | null): string {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function ProtocolBadge({ protocol }: { protocol: PunchoutBuyer['protocol'] }) {
  if (protocol === 'cxml') return <Badge variant="info">cXML</Badge>
  if (protocol === 'oci') return <Badge variant="warning">OCI</Badge>
  return <Badge variant="outline">Both</Badge>
}

function CredentialBadges({ buyer }: { buyer: PunchoutBuyer }) {
  const hasSecret = Boolean(buyer.has_shared_secret)
  const hasOci = Boolean(buyer.has_oci_password)

  if (!hasSecret && !hasOci) {
    return <span className="text-gray-400 text-xs">Tenant fallback</span>
  }

  return (
    <div className="flex flex-wrap gap-1">
      {hasSecret ? <Badge variant="success">Secret</Badge> : null}
      {buyer.has_previous_shared_secret ? <Badge variant="warning">Overlap</Badge> : null}
      {hasOci ? <Badge variant="success">OCI</Badge> : null}
    </div>
  )
}

function ReturnDomainsCell({ domains }: { domains: string[] }) {
  if (domains.length === 0) {
    return <span className="text-gray-400 text-xs">Any setup host</span>
  }

  return (
    <span className="text-xs">
      {domains.slice(0, 2).join(', ')}
      {domains.length > 2 ? ` +${domains.length - 2}` : ''}
    </span>
  )
}

function BuyerRow({
  buyer,
  onEdit,
  onRotate,
  onDelete,
}: {
  buyer: PunchoutBuyer
  onEdit: (buyer: PunchoutBuyer) => void
  onRotate: (buyer: PunchoutBuyer) => void
  onDelete: (buyer: PunchoutBuyer) => void
}) {
  return (
    <tr className="align-top">
      <td className="px-4 py-3">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
            <Building2 className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <p className="font-medium text-gray-900 text-sm dark:text-white">{buyer.name}</p>
            <p className="text-gray-500 text-xs">{buyer.code}</p>
            <p className="text-gray-400 text-xs">
              {buyer.organization?.name ?? 'No organization'}
              {buyer.contract ? ` · ${buyer.contract.name}` : ''}
            </p>
          </div>
        </div>
      </td>
      <td className="px-4 py-3">
        <ProtocolBadge protocol={buyer.protocol} />
      </td>
      <td className="px-4 py-3">
        <CredentialBadges buyer={buyer} />
      </td>
      <td className="px-4 py-3 text-gray-700 text-sm dark:text-gray-300">
        <p>{buyer.default_currency ?? 'Tenant default'}</p>
        <p className="text-gray-400 text-xs">{buyer.default_locale ?? 'Tenant default'}</p>
      </td>
      <td className="px-4 py-3 text-gray-700 text-sm dark:text-gray-300">
        <ReturnDomainsCell domains={buyer.allowed_return_domains} />
      </td>
      <td className="px-4 py-3">
        <Badge variant={buyer.is_active ? 'success' : 'outline'}>
          {buyer.is_active ? 'Active' : 'Inactive'}
        </Badge>
      </td>
      <td className="px-4 py-3 text-gray-500 text-xs">{formatDateTime(buyer.last_seen_at)}</td>
      <td className="px-4 py-3">
        <div className="flex justify-end gap-1">
          <button
            type="button"
            onClick={() => onEdit(buyer)}
            aria-label={`Edit ${buyer.name}`}
            className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-blue-600 dark:hover:bg-gray-700"
          >
            <Pencil className="h-4 w-4" />
          </button>
          {buyer.has_shared_secret ? (
            <button
              type="button"
              onClick={() => onRotate(buyer)}
              aria-label={`Rotate secret for ${buyer.name}`}
              className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-amber-600 dark:hover:bg-gray-700"
            >
              <KeyRound className="h-4 w-4" />
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => onDelete(buyer)}
            aria-label={`Delete ${buyer.name}`}
            className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-red-600 dark:hover:bg-gray-700"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </td>
    </tr>
  )
}

function BuyerFilters({
  search,
  protocol,
  active,
  hasFilters,
  onSearch,
  onProtocol,
  onActive,
  onClear,
}: {
  search: string
  protocol: '' | PunchoutProtocol
  active: '' | '1' | '0'
  hasFilters: boolean
  onSearch: (value: string) => void
  onProtocol: (value: '' | PunchoutProtocol) => void
  onActive: (value: '' | '1' | '0') => void
  onClear: () => void
}) {
  const selectClass =
    'h-10 rounded-md border border-gray-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100'

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-3 sm:flex-row sm:items-center dark:border-gray-700 dark:bg-gray-800">
      <div className="relative flex-1">
        <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <Input
          placeholder="Search by name, code or identity..."
          value={search}
          onChange={(event) => onSearch(event.target.value)}
          className="h-10 pl-10"
        />
      </div>

      <select
        value={protocol}
        onChange={(event) => onProtocol(event.target.value as '' | PunchoutProtocol)}
        className={selectClass}
      >
        <option value="">All protocols</option>
        <option value="cxml">cXML</option>
        <option value="oci">OCI</option>
      </select>

      <select
        value={active}
        onChange={(event) => onActive(event.target.value as '' | '1' | '0')}
        className={selectClass}
      >
        <option value="">All statuses</option>
        <option value="1">Active</option>
        <option value="0">Inactive</option>
      </select>

      {hasFilters ? (
        <Button variant="ghost" size="sm" onClick={onClear}>
          Clear
        </Button>
      ) : null}
    </div>
  )
}

function BuyersErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center dark:border-red-900/40 dark:bg-red-950/30">
      <p className="font-medium text-red-800 dark:text-red-200">{message}</p>
      <Button variant="outline" size="sm" className="mt-3" onClick={onRetry}>
        Try again
      </Button>
    </div>
  )
}

function BuyersEmptyState({ hasFilters, onAdd }: { hasFilters: boolean; onAdd: () => void }) {
  return (
    <div className="rounded-xl border-2 border-gray-200 border-dashed dark:border-gray-700">
      <EmptyState
        icon={Handshake}
        title={hasFilters ? 'No buyers match these filters' : 'No punchout buyers yet'}
        description={
          hasFilters
            ? 'Try clearing the filters or searching for another buyer.'
            : 'Add a buyer to give a procurement system its own credentials, contract prices and return-domain policy.'
        }
        action={hasFilters ? undefined : { label: 'Add buyer', onClick: onAdd }}
      />
    </div>
  )
}

function BuyersTable({
  buyers,
  onEdit,
  onRotate,
  onDelete,
}: {
  buyers: PunchoutBuyer[]
  onEdit: (buyer: PunchoutBuyer) => void
  onRotate: (buyer: PunchoutBuyer) => void
  onDelete: (buyer: PunchoutBuyer) => void
}) {
  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
        <thead className="bg-gray-50 dark:bg-gray-900/50">
          <tr className="text-left text-gray-600 text-xs uppercase tracking-wide dark:text-gray-400">
            <th scope="col" className="px-4 py-3 font-medium">
              Buyer
            </th>
            <th scope="col" className="px-4 py-3 font-medium">
              Protocol
            </th>
            <th scope="col" className="px-4 py-3 font-medium">
              Credentials
            </th>
            <th scope="col" className="px-4 py-3 font-medium">
              Defaults
            </th>
            <th scope="col" className="px-4 py-3 font-medium">
              Return domains
            </th>
            <th scope="col" className="px-4 py-3 font-medium">
              Status
            </th>
            <th scope="col" className="px-4 py-3 font-medium">
              Last seen
            </th>
            <th scope="col" className="px-4 py-3">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
          {buyers.map((buyer) => (
            <BuyerRow
              key={buyer.uuid}
              buyer={buyer}
              onEdit={onEdit}
              onRotate={onRotate}
              onDelete={onDelete}
            />
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function PunchoutBuyersPage() {
  const queryClient = useQueryClient()
  const { success: showSuccess, error: showError } = useToast()

  const [search, setSearch] = useState('')
  const [protocol, setProtocol] = useState<'' | PunchoutProtocol>('')
  const [active, setActive] = useState<'' | '1' | '0'>('')
  const [page, setPage] = useState(1)

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<PunchoutBuyer | null>(null)
  const [rotating, setRotating] = useState<PunchoutBuyer | null>(null)

  const listQuery = useQuery({
    queryKey: ['punchout-buyers', search, protocol, active, page],
    queryFn: () =>
      punchoutBuyersApi.list({
        search: search || undefined,
        protocol: protocol || undefined,
        is_active: active || undefined,
        page,
        per_page: PER_PAGE,
      }),
    staleTime: 0,
  })

  const buyers = listQuery.data?.items ?? []
  const meta = listQuery.data?.meta
  const hasFilters = Boolean(search || protocol || active)

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['punchout-buyers'] })

  const clearFilters = () => {
    setSearch('')
    setProtocol('')
    setActive('')
    setPage(1)
  }

  const handleDelete = async (buyer: PunchoutBuyer) => {
    const confirmed = window.confirm(
      `Delete “${buyer.name}”? Buyers with session or order history are deactivated instead so audit records keep a reference.`
    )
    if (!confirmed) return

    try {
      await punchoutBuyersApi.remove(buyer.uuid)
      showSuccess('Punchout buyer deleted')
      invalidate()
    } catch (error) {
      showError(isApiError(error) ? error.message : 'Failed to delete punchout buyer')
    }
  }

  const renderList = () => {
    if (listQuery.isLoading) {
      return (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      )
    }

    if (listQuery.isError) {
      return (
        <BuyersErrorState
          message={isApiError(listQuery.error) ? listQuery.error.message : 'Failed to load buyers'}
          onRetry={() => void listQuery.refetch()}
        />
      )
    }

    if (buyers.length === 0) {
      return <BuyersEmptyState hasFilters={hasFilters} onAdd={() => setModalOpen(true)} />
    }

    return (
      <BuyersTable
        buyers={buyers}
        onEdit={(buyer) => {
          setEditing(buyer)
          setModalOpen(true)
        }}
        onRotate={setRotating}
        onDelete={(buyer) => void handleDelete(buyer)}
      />
    )
  }

  const renderPagination = () => {
    if (!meta || meta.last_page <= 1) return null

    return (
      <div className="flex items-center justify-between text-gray-600 text-sm dark:text-gray-300">
        <p>
          Page {meta.current_page} of {meta.last_page} · {meta.total} buyers
        </p>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={meta.current_page <= 1 || listQuery.isFetching}
            onClick={() => setPage((current) => Math.max(1, current - 1))}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={meta.current_page >= meta.last_page || listQuery.isFetching}
            onClick={() => setPage((current) => Math.min(meta.last_page, current + 1))}
          >
            Next
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-bold text-2xl text-gray-900 dark:text-white">Punchout Buyers</h1>
          <p className="mt-1 text-gray-500 text-sm dark:text-gray-400">
            Procurement credentials, contract pricing and presentation defaults for your buyers.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => void listQuery.refetch()}
            disabled={listQuery.isFetching}
          >
            {listQuery.isFetching ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Refresh
          </Button>
          <Button
            onClick={() => {
              setEditing(null)
              setModalOpen(true)
            }}
            className="inline-flex items-center gap-2"
          >
            <Plus className="h-4 w-4" /> Add buyer
          </Button>
        </div>
      </div>

      <BuyerFilters
        search={search}
        protocol={protocol}
        active={active}
        hasFilters={hasFilters}
        onSearch={(value) => {
          setSearch(value)
          setPage(1)
        }}
        onProtocol={(value) => {
          setProtocol(value)
          setPage(1)
        }}
        onActive={(value) => {
          setActive(value)
          setPage(1)
        }}
        onClear={clearFilters}
      />

      {renderList()}
      {renderPagination()}

      <PunchoutBuyerModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        buyer={editing}
        onSaved={invalidate}
      />

      <RotatePunchoutSecretModal
        buyer={rotating}
        onClose={() => setRotating(null)}
        onRotated={invalidate}
      />
    </div>
  )
}
