import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Loader2, Plus, Search, Trash2, X } from 'lucide-react'
import { useState } from 'react'
import { productsApi } from '@/api/products'
import {
  type PunchoutBuyer,
  type PunchoutBuyerPartNumberImportReport,
  punchoutBuyersApi,
} from '@/api/punchoutBuyers'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { isApiError } from '@/lib/api-response'

interface ProductOption {
  id: number
  name: string
  sku: string | null
}

const PAGE_SIZE = 10

function errorText(error: unknown): string {
  return isApiError(error) ? error.message : 'Something went wrong.'
}

function AddPartNumberForm({ buyerUuid, onAdded }: { buyerUuid: string; onAdded: () => void }) {
  const [code, setCode] = useState('')
  const [unitOfMeasure, setUnitOfMeasure] = useState('')
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<ProductOption | null>(null)
  const [error, setError] = useState<string | null>(null)

  const options = useQuery({
    queryKey: ['punchout-buyer-part-number-products', query],
    enabled: query.trim().length >= 2,
    queryFn: async () => {
      const body = await productsApi.list({ search: query.trim(), per_page: 5 })
      const raw = (body as { data?: unknown }).data
      const items = Array.isArray(raw) ? raw : ((raw as { items?: unknown } | null)?.items ?? [])

      return (items as Array<{ id: number; name: string; sku?: string | null }>).map((item) => ({
        id: item.id,
        name: item.name,
        sku: item.sku ?? null,
      }))
    },
  })

  const mutation = useMutation({
    mutationFn: () =>
      punchoutBuyersApi.addPartNumber(buyerUuid, {
        buyer_part_number: code.trim(),
        product_id: selected?.id ?? 0,
        unit_of_measure: unitOfMeasure.trim() || null,
      }),
    onSuccess: () => {
      setCode('')
      setUnitOfMeasure('')
      setQuery('')
      setSelected(null)
      setError(null)
      onAdded()
    },
    onError: (mutationError) => setError(errorText(mutationError)),
  })

  return (
    <div className="rounded-lg border border-gray-200 p-3 dark:border-gray-700">
      <div className="grid gap-3 sm:grid-cols-4">
        <Input
          placeholder="Buyer part number"
          value={code}
          onChange={(event) => setCode(event.target.value)}
        />
        <div className="relative">
          <Input
            placeholder="Search product by name or SKU"
            value={selected ? `${selected.name}${selected.sku ? ` · ${selected.sku}` : ''}` : query}
            onChange={(event) => {
              setSelected(null)
              setQuery(event.target.value)
            }}
          />
          {!selected && query.trim().length >= 2 && (options.data?.length ?? 0) > 0 ? (
            <ul className="absolute z-10 mt-1 max-h-56 w-full overflow-auto rounded-md border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-900">
              {(options.data ?? []).map((option) => (
                <li key={option.id}>
                  <button
                    type="button"
                    onClick={() => setSelected(option)}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-800"
                  >
                    <Search className="h-3 w-3 text-gray-400" />
                    <span className="truncate">{option.name}</span>
                    {option.sku ? (
                      <span className="ml-auto text-gray-400 text-xs">{option.sku}</span>
                    ) : null}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
        <Input
          placeholder="UOM (optional)"
          value={unitOfMeasure}
          onChange={(event) => setUnitOfMeasure(event.target.value)}
        />
        <Button
          type="button"
          onClick={() => mutation.mutate()}
          disabled={mutation.isPending || code.trim() === '' || !selected}
        >
          {mutation.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Plus className="mr-2 h-4 w-4" />
          )}
          Add
        </Button>
      </div>
      {error ? <p className="mt-2 text-red-600 text-xs">{error}</p> : null}
    </div>
  )
}

function ImportPanel({ buyerUuid, onImported }: { buyerUuid: string; onImported: () => void }) {
  const [file, setFile] = useState<File | null>(null)
  const [report, setReport] = useState<PunchoutBuyerPartNumberImportReport | null>(null)
  const [applySuggestions, setApplySuggestions] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const preview = useMutation({
    mutationFn: () =>
      punchoutBuyersApi.importPartNumbers(buyerUuid, file as File, { dryRun: true }),
    onSuccess: (result) => {
      setReport(result)
      setError(null)
    },
    onError: (mutationError) => setError(errorText(mutationError)),
  })

  const apply = useMutation({
    mutationFn: () =>
      punchoutBuyersApi.importPartNumbers(buyerUuid, file as File, {
        dryRun: false,
        applySuggestions,
      }),
    onSuccess: (result) => {
      setReport(result)
      setError(null)
      onImported()
    },
    onError: (mutationError) => setError(errorText(mutationError)),
  })

  return (
    <div className="rounded-lg border border-gray-200 p-3 dark:border-gray-700">
      <p className="mb-2 font-medium text-gray-700 text-sm dark:text-gray-300">Bulk import</p>
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="file"
          accept=".csv,text/csv"
          onChange={(event) => {
            setFile(event.target.files?.[0] ?? null)
            setReport(null)
          }}
          className="text-sm"
        />
        <Button
          type="button"
          variant="outline"
          onClick={() => preview.mutate()}
          disabled={!file || preview.isPending}
        >
          {preview.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Preview
        </Button>
        <Button type="button" onClick={() => apply.mutate()} disabled={!file || apply.isPending}>
          {apply.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Apply
        </Button>
        <label className="flex items-center gap-1 text-gray-600 text-xs dark:text-gray-400">
          <input
            type="checkbox"
            checked={applySuggestions}
            onChange={(event) => setApplySuggestions(event.target.checked)}
          />
          Apply GTIN/MPN suggestions
        </label>
      </div>
      {error ? <p className="mt-2 text-red-600 text-xs">{error}</p> : null}
      {report ? <ImportReport report={report} /> : null}
    </div>
  )
}

function ImportReport({ report }: { report: PunchoutBuyerPartNumberImportReport }) {
  return (
    <div className="mt-3 space-y-2">
      <div className="flex flex-wrap gap-2 text-xs">
        {Object.entries(report.totals)
          .filter(([, value]) => Number(value) > 0)
          .map(([key, value]) => (
            <span
              key={key}
              className="rounded-full bg-gray-100 px-2 py-0.5 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
            >
              {key}: {value}
            </span>
          ))}
      </div>
      <div className="max-h-48 overflow-auto rounded border border-gray-100 dark:border-gray-800">
        <table className="w-full text-left text-xs">
          <thead className="bg-gray-50 text-gray-500 dark:bg-gray-800 dark:text-gray-400">
            <tr>
              <th className="px-2 py-1">Line</th>
              <th className="px-2 py-1">Code</th>
              <th className="px-2 py-1">Action</th>
              <th className="px-2 py-1">Product</th>
              <th className="px-2 py-1">Message</th>
            </tr>
          </thead>
          <tbody>
            {report.rows.slice(0, 200).map((row) => (
              <tr
                key={`${row.line}-${row.buyer_part_number}`}
                className="border-gray-100 border-t dark:border-gray-800"
              >
                <td className="px-2 py-1 text-gray-500">{row.line}</td>
                <td className="px-2 py-1 font-mono">{row.buyer_part_number}</td>
                <td className="px-2 py-1">{row.action}</td>
                <td className="px-2 py-1">{row.product_sku ?? '—'}</td>
                <td className="px-2 py-1 text-gray-500">{row.message ?? ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export function PunchoutBuyerPartNumbersModal({
  buyer,
  onClose,
}: {
  buyer: PunchoutBuyer
  onClose: () => void
}) {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [error, setError] = useState<string | null>(null)

  const listQuery = useQuery({
    queryKey: ['punchout-buyer-part-numbers', buyer.uuid, page, search],
    queryFn: () =>
      punchoutBuyersApi.partNumbers(buyer.uuid, {
        q: search || undefined,
        page,
        per_page: PAGE_SIZE,
      }),
  })

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ['punchout-buyer-part-numbers', buyer.uuid] })

  const deleteMutation = useMutation({
    mutationFn: (uuid: string) => punchoutBuyersApi.removePartNumber(buyer.uuid, uuid),
    onSuccess: () => {
      setError(null)
      void invalidate()
    },
    onError: (mutationError) => setError(errorText(mutationError)),
  })

  const items = listQuery.data?.items ?? []
  const meta = listQuery.data?.meta

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4">
      <div className="mt-8 w-full max-w-4xl rounded-xl bg-white shadow-xl dark:bg-gray-900">
        <div className="flex items-start justify-between gap-4 border-gray-200 border-b p-4 dark:border-gray-700">
          <div>
            <h2 className="font-semibold text-gray-900 text-lg dark:text-white">
              Buyer part numbers
            </h2>
            <p className="text-gray-500 text-sm">
              {buyer.name} · {buyer.code}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 p-4">
          {error ? (
            <p className="rounded-md bg-red-50 px-3 py-2 text-red-700 text-sm dark:bg-red-900/20 dark:text-red-300">
              {error}
            </p>
          ) : null}

          <AddPartNumberForm buyerUuid={buyer.uuid} onAdded={() => void invalidate()} />
          <ImportPanel buyerUuid={buyer.uuid} onImported={() => void invalidate()} />

          <div className="flex items-center justify-between gap-2">
            <Input
              placeholder="Search codes or descriptions"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value)
                setPage(1)
              }}
              className="max-w-sm"
            />
            <span className="text-gray-500 text-xs">{meta ? `${meta.total} mapped` : ''}</span>
          </div>

          <PartNumbersTable
            items={items}
            loading={listQuery.isLoading}
            deleting={deleteMutation.isPending}
            onDelete={(uuid) => deleteMutation.mutate(uuid)}
          />

          {meta && meta.last_page > 1 ? (
            <div className="flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                disabled={meta.current_page <= 1}
              >
                Previous
              </Button>
              <span className="text-gray-500 text-xs">
                {meta.current_page} / {meta.last_page}
              </span>
              <Button
                type="button"
                variant="outline"
                onClick={() => setPage((current) => Math.min(meta.last_page, current + 1))}
                disabled={meta.current_page >= meta.last_page}
              >
                Next
              </Button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}

function PartNumbersTable({
  items,
  loading,
  deleting,
  onDelete,
}: {
  items: Array<{
    uuid: string
    buyer_part_number: string | null
    code: string | null
    short_description: string | null
    unit_of_measure: string | null
    is_active: boolean
    product: { name: string; sku: string | null } | null
  }>
  loading: boolean
  deleting: boolean
  onDelete: (uuid: string) => void
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
      <table className="w-full text-left text-sm">
        <thead className="bg-gray-50 text-gray-500 text-xs dark:bg-gray-800 dark:text-gray-400">
          <tr>
            <th className="px-3 py-2">Buyer code</th>
            <th className="px-3 py-2">Description</th>
            <th className="px-3 py-2">Our product</th>
            <th className="px-3 py-2">UOM</th>
            <th className="px-3 py-2">Active</th>
            <th className="px-3 py-2" />
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td colSpan={6} className="px-3 py-6 text-center text-gray-500">
                <Loader2 className="mx-auto h-4 w-4 animate-spin" />
              </td>
            </tr>
          ) : items.length === 0 ? (
            <tr>
              <td colSpan={6} className="px-3 py-6 text-center text-gray-500 text-sm">
                No part numbers mapped yet.
              </td>
            </tr>
          ) : (
            items.map((item) => (
              <tr key={item.uuid} className="border-gray-100 border-t dark:border-gray-800">
                <td className="px-3 py-2 font-mono text-xs">
                  {item.buyer_part_number ?? item.code}
                </td>
                <td className="px-3 py-2 text-gray-600 text-xs dark:text-gray-400">
                  {item.short_description ?? '—'}
                </td>
                <td className="px-3 py-2 text-xs">
                  <p>{item.product?.name ?? '—'}</p>
                  <p className="text-gray-400">{item.product?.sku ?? ''}</p>
                </td>
                <td className="px-3 py-2 text-xs">{item.unit_of_measure ?? '—'}</td>
                <td className="px-3 py-2 text-xs">{item.is_active ? 'Yes' : 'No'}</td>
                <td className="px-3 py-2 text-right">
                  <button
                    type="button"
                    onClick={() => onDelete(item.uuid)}
                    disabled={deleting}
                    aria-label={`Remove ${item.buyer_part_number ?? item.code}`}
                    className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-red-600 dark:hover:bg-gray-800"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}
