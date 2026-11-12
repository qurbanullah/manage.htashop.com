import api from '@/api/client'
import { type ApiResponse, parseApiResponse } from '@/lib/api-response'
import { authHeaders } from '@/lib/auth-header'

/** Row counts reported by `ProductImportResource`. */
export interface ProductImportCounts {
  total: number
  processed: number
  created: number
  updated: number
  skipped: number
  failed: number
  valid: number
  invalid: number
  imported: number
}

export interface ProductImportUser {
  id: number
  name: string
}

export interface ProductImportData {
  id: number
  uuid: string
  original_filename: string
  format: string
  size_bytes: number
  status: string
  status_label: string
  kind?: ProductImportKind
  kind_label?: string
  is_finished: boolean
  progress: number
  options: Record<string, unknown>
  counts: ProductImportCounts
  error_message: string | null
  tenant_id: number
  organization_id: number | null
  user?: ProductImportUser | null
  started_at: string | null
  finished_at: string | null
  created_at: string | null
  updated_at: string | null
}

export interface ProductImportRowData {
  id: number
  row_number: number
  external_id: string | null
  status: string
  errors: Record<string, string>
  warnings?: string[]
  product_id: number | null
  product?: {
    id: number
    uuid: string
    name: string
    sku: string | null
  } | null
}

export interface PaginationMeta {
  current_page: number
  last_page: number
  per_page: number
  total: number
  from: number | null
  to: number | null
}

export interface ProductImportPage<T> {
  items: T[]
  meta: PaginationMeta
}

export interface UploadProductImportPayload {
  file: File
  kind?: ProductImportKind
  warehouse?: string
  sheet?: string
  create_missing?: boolean
  dry_run?: boolean
  download_images?: boolean
  tenant_id?: number
  organization_id?: number
}

/** What the file contains; one upload carries one kind. */
export type ProductImportKind = 'products' | 'variants' | 'images'

export interface ProductImportListParams {
  page?: number
  per_page?: number
  status?: string
  organization_id?: number
}

export interface ProductImportRowsParams {
  page?: number
  per_page?: number
  status?: string
  external_id?: string
}

const EMPTY_META: PaginationMeta = {
  current_page: 1,
  last_page: 1,
  per_page: 0,
  total: 0,
  from: null,
  to: null,
}

function toSearchParams(params: object): Record<string, string> {
  const search: Record<string, string> = {}

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue
    search[key] = String(value)
  }

  return search
}

/**
 * The import endpoints answer with `{ data: [...], meta: {…} }` inside the API
 * envelope, so the page needs one normalisation step rather than knowing the
 * shape of every response.
 */
function normalizePage<T>(payload: unknown): ProductImportPage<T> {
  const page = (payload ?? {}) as { data?: T[]; meta?: Partial<PaginationMeta> }

  return {
    items: Array.isArray(page.data) ? page.data : [],
    meta: { ...EMPTY_META, ...(page.meta ?? {}) },
  }
}

export const productImportsApi = {
  async list(params: ProductImportListParams = {}): Promise<ProductImportPage<ProductImportData>> {
    const res = await api.get('product-imports', {
      searchParams: toSearchParams(params),
      headers: authHeaders(),
      throwHttpErrors: false,
    })
    const body = await parseApiResponse<unknown>(res)

    return normalizePage<ProductImportData>(body.data)
  },

  async get(uuid: string): Promise<ApiResponse<ProductImportData>> {
    const res = await api.get(`product-imports/${uuid}`, {
      headers: authHeaders(),
      throwHttpErrors: false,
    })

    return parseApiResponse<ProductImportData>(res)
  },

  async rows(
    uuid: string,
    params: ProductImportRowsParams = {}
  ): Promise<ProductImportPage<ProductImportRowData>> {
    const res = await api.get(`product-imports/${uuid}/rows`, {
      searchParams: toSearchParams(params),
      headers: authHeaders(),
      throwHttpErrors: false,
    })
    const body = await parseApiResponse<unknown>(res)

    return normalizePage<ProductImportRowData>(body.data)
  },

  async upload(payload: UploadProductImportPayload): Promise<ApiResponse<ProductImportData>> {
    const body = new FormData()
    body.append('file', payload.file)

    if (payload.warehouse) body.append('warehouse', payload.warehouse)
    if (payload.kind) body.append('kind', payload.kind)
    if (payload.sheet) body.append('sheet', payload.sheet)
    if (payload.tenant_id) body.append('tenant_id', String(payload.tenant_id))
    if (payload.organization_id) body.append('organization_id', String(payload.organization_id))

    body.append('create_missing', payload.create_missing ? '1' : '0')
    body.append('dry_run', payload.dry_run ? '1' : '0')

    if (payload.download_images === false) body.append('download_images', '0')

    const res = await api.post('product-imports', {
      body,
      headers: authHeaders(),
      // Parsing happens inside the request, so a large spreadsheet uploads and
      // validates in one call; the default 15s timeout is too tight for that.
      timeout: 120_000,
      throwHttpErrors: false,
    })

    return parseApiResponse<ProductImportData>(res)
  },

  async commit(uuid: string): Promise<ApiResponse<ProductImportData>> {
    const res = await api.post(`product-imports/${uuid}/commit`, {
      headers: authHeaders(),
      throwHttpErrors: false,
    })

    return parseApiResponse<ProductImportData>(res)
  },

  async cancel(uuid: string): Promise<ApiResponse<ProductImportData>> {
    const res = await api.post(`product-imports/${uuid}/cancel`, {
      headers: authHeaders(),
      throwHttpErrors: false,
    })

    return parseApiResponse<ProductImportData>(res)
  },

  /** The CSV download needs the bearer token, so it is fetched as a blob. */
  async errorsCsv(uuid: string): Promise<Blob> {
    const res = await api.get(`product-imports/${uuid}/errors.csv`, {
      headers: authHeaders(),
      throwHttpErrors: false,
    })

    if (!res.ok) {
      throw new Error('The error report could not be downloaded.')
    }

    return res.blob()
  },
}
