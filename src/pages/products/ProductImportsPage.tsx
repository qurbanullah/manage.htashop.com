import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'
import type {
  ProductImportData,
  ProductImportPage,
  UploadProductImportPayload,
} from '@/api/productImports'
import { warehousesApi } from '@/api/warehouses'
import { ProductImportHistory } from '@/components/productImports/ProductImportHistory'
import { ProductImportRowsTable } from '@/components/productImports/ProductImportRowsTable'
import { ProductImportSummary } from '@/components/productImports/ProductImportSummary'
import { ProductImportUploadForm } from '@/components/productImports/ProductImportUploadForm'
import type { ProductImportRowStatus } from '@/components/productImports/types'
import {
  useCancelProductImport,
  useCommitProductImport,
  useDownloadImportErrors,
  useProductImportDetail,
  useProductImportList,
  useProductImportRows,
  useUploadProductImport,
} from '@/hooks/productImports/useProductImports'

const EMPTY_PAGE: ProductImportPage<ProductImportData> = {
  items: [],
  meta: { current_page: 1, last_page: 1, per_page: 0, total: 0, from: null, to: null },
}

const LIST_PAGE_SIZE = 10
const ROWS_PAGE_SIZE = 25

export default function ProductImportsPage() {
  const queryClient = useQueryClient()

  const [selectedUuid, setSelectedUuid] = useState<string | null>(null)
  const [listPage, setListPage] = useState(1)
  const [rowsPage, setRowsPage] = useState(1)
  const [rowsStatus, setRowsStatus] = useState<'' | ProductImportRowStatus>('')
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')

  // Debounce the external-ID filter so typing does not refetch per keystroke.
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput.trim())
      setRowsPage(1)
    }, 400)

    return () => clearTimeout(timer)
  }, [searchInput])

  const warehouses = useQuery({
    queryKey: ['warehouses', 'import-options'],
    queryFn: () => warehousesApi.list(),
  })

  const list = useProductImportList({ page: listPage, per_page: LIST_PAGE_SIZE })
  const detail = useProductImportDetail(selectedUuid)
  const rows = useProductImportRows(selectedUuid, {
    page: rowsPage,
    per_page: ROWS_PAGE_SIZE,
    status: rowsStatus || undefined,
    external_id: search || undefined,
  })

  const upload = useUploadProductImport()
  const commit = useCommitProductImport()
  const cancel = useCancelProductImport()
  const downloadErrors = useDownloadImportErrors()

  // A committed import finishes in the background. Refresh the history (and the
  // finished import itself) once, the first time the status settles.
  const settledUuid = useRef<string | null>(null)
  const detailData = detail.data?.data

  useEffect(() => {
    if (!detailData?.is_finished) return
    if (settledUuid.current === detailData.uuid) return

    settledUuid.current = detailData.uuid
    queryClient.invalidateQueries({ queryKey: ['product-imports'] })
  }, [detailData?.is_finished, detailData?.uuid, queryClient])

  const handleUpload = (payload: UploadProductImportPayload) => {
    upload.mutate(payload, {
      onSuccess: (response) => {
        setSelectedUuid(response.data.uuid)
        setRowsPage(1)
        setRowsStatus('')
        setSearchInput('')
        setListPage(1)
      },
    })
  }

  const handleSelect = (uuid: string) => {
    setSelectedUuid(uuid)
    setRowsPage(1)
    setRowsStatus('')
    setSearchInput('')
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-bold text-2xl text-gray-900 dark:text-white">Product imports</h1>
        <p className="mt-1 max-w-3xl text-gray-500 text-sm dark:text-gray-400">
          Upload a CSV, XLSX or ODS file to create or update products in bulk. Every row is
          validated first, then applied in the background — re-uploading a file updates products by
          seller SKU instead of duplicating them.
        </p>
      </div>

      <ProductImportUploadForm
        warehouses={warehouses.data ?? []}
        isUploading={upload.isPending}
        onSubmit={handleUpload}
      />

      {selectedUuid && detail.isError && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-red-700 text-sm dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
          This import could not be loaded. It may have been removed.
        </p>
      )}

      {detailData && (
        <ProductImportSummary
          data={detailData}
          isCommitting={commit.isPending}
          isCancelling={cancel.isPending}
          isDownloading={downloadErrors.isPending}
          onCommit={() => commit.mutate(detailData.uuid)}
          onCancel={() => cancel.mutate(detailData.uuid)}
          onDownloadErrors={() =>
            downloadErrors.mutate({
              uuid: detailData.uuid,
              filename: detailData.original_filename,
            })
          }
        />
      )}

      {selectedUuid && rows.data && (
        <ProductImportRowsTable
          page={rows.data}
          isLoading={rows.isLoading || rows.isFetching}
          statusFilter={rowsStatus}
          search={searchInput}
          onStatusFilterChange={(status) => {
            setRowsStatus(status)
            setRowsPage(1)
          }}
          onSearchChange={setSearchInput}
          onPageChange={setRowsPage}
        />
      )}

      <ProductImportHistory
        page={list.data ?? EMPTY_PAGE}
        isLoading={list.isLoading}
        selectedUuid={selectedUuid}
        onSelect={handleSelect}
        onPageChange={setListPage}
      />
    </div>
  )
}
