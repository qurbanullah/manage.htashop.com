import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  type ProductImportData,
  type ProductImportListParams,
  type ProductImportRowsParams,
  productImportsApi,
  type UploadProductImportPayload,
} from '@/api/productImports'
import { useToast } from '@/components/ui/Toaster'
import { downloadBlob } from '@/lib/download'

/** Statuses that keep changing without user action, so the page must poll. */
const RUNNING_STATUSES = ['pending', 'parsing', 'validating', 'importing']

export const productImportKeys = {
  all: ['product-imports'] as const,
  list: (params: ProductImportListParams) => ['product-imports', 'list', params] as const,
  detail: (uuid: string) => ['product-imports', 'detail', uuid] as const,
  rows: (uuid: string, params: ProductImportRowsParams) =>
    ['product-imports', 'rows', uuid, params] as const,
}

export function isImportRunning(status: string | undefined): boolean {
  return status !== undefined && RUNNING_STATUSES.includes(status)
}

export function useProductImportList(params: ProductImportListParams) {
  return useQuery({
    queryKey: productImportKeys.list(params),
    queryFn: () => productImportsApi.list(params),
  })
}

export function useProductImportDetail(uuid: string | null) {
  return useQuery({
    queryKey: productImportKeys.detail(uuid ?? ''),
    queryFn: () => productImportsApi.get(uuid ?? ''),
    enabled: Boolean(uuid),
    // Poll only while the worker is actually making progress.
    refetchInterval: (query) =>
      isImportRunning((query.state.data?.data as ProductImportData | undefined)?.status)
        ? 2000
        : false,
  })
}

export function useProductImportRows(uuid: string | null, params: ProductImportRowsParams) {
  const detail = useProductImportDetail(uuid)

  return useQuery({
    queryKey: productImportKeys.rows(uuid ?? '', params),
    queryFn: () => productImportsApi.rows(uuid ?? '', params),
    enabled: Boolean(uuid),
    // Keep the report in step with the worker while rows are being applied.
    refetchInterval: isImportRunning(detail.data?.data.status) ? 3000 : false,
  })
}

export function useUploadProductImport() {
  const queryClient = useQueryClient()
  const { success, error: showError } = useToast()

  return useMutation({
    mutationFn: (payload: UploadProductImportPayload) => productImportsApi.upload(payload),
    onSuccess: (response) => {
      success('File validated', response.message)
      queryClient.invalidateQueries({ queryKey: productImportKeys.all })
    },
    onError: (error: Error) => showError('Upload failed', error.message),
  })
}

export function useCommitProductImport() {
  const queryClient = useQueryClient()
  const { success, error: showError } = useToast()

  return useMutation({
    mutationFn: (uuid: string) => productImportsApi.commit(uuid),
    onSuccess: (response) => {
      success('Import queued', response.message)
      queryClient.invalidateQueries({ queryKey: productImportKeys.all })
    },
    onError: (error: Error) => showError('The import could not be started', error.message),
  })
}

export function useCancelProductImport() {
  const queryClient = useQueryClient()
  const { success, error: showError } = useToast()

  return useMutation({
    mutationFn: (uuid: string) => productImportsApi.cancel(uuid),
    onSuccess: (response) => {
      success('Import cancelled', response.message)
      queryClient.invalidateQueries({ queryKey: productImportKeys.all })
    },
    onError: (error: Error) => showError('The import could not be cancelled', error.message),
  })
}

export function useDownloadImportErrors() {
  const { success, error: showError } = useToast()

  return useMutation({
    mutationFn: async (payload: { uuid: string; filename: string }) => {
      const blob = await productImportsApi.errorsCsv(payload.uuid)
      downloadBlob(blob, `import-errors-${payload.filename.replace(/\.[^.]+$/, '')}.csv`)
    },
    onSuccess: () => success('Error report downloaded'),
    onError: (error: Error) => showError('Download failed', error.message),
  })
}
