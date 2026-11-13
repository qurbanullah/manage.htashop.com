import api from '@/api/client'
import { parseApiResponse } from '@/lib/api-response'
import { authHeaders } from '@/lib/auth-header'

export type QuoteStatus =
  | 'pending'
  | 'in_progress'
  | 'replied'
  | 'accepted'
  | 'declined'
  | 'expired'
  | 'cancelled'

export type QuotePriority = 'low' | 'normal' | 'high' | 'urgent'

export type QuoteResponseStatus =
  | 'draft'
  | 'sent'
  | 'viewed'
  | 'accepted'
  | 'declined'
  | 'expired'
  | 'superseded'

export type QuoteSort = 'newest' | 'oldest' | 'oldest_unanswered'

export type Incoterm =
  | 'EXW'
  | 'FCA'
  | 'FAS'
  | 'FOB'
  | 'CFR'
  | 'CIF'
  | 'CPT'
  | 'CIP'
  | 'DAP'
  | 'DPU'
  | 'DDP'

export type ShippingMethod =
  | 'courier'
  | 'air_freight'
  | 'sea_freight'
  | 'road_freight'
  | 'rail_freight'
  | 'local_delivery'
  | 'customer_pickup'

export type PaymentTerms =
  | 'advance_100'
  | 'advance_50'
  | 'net_15'
  | 'net_30'
  | 'net_45'
  | 'net_60'
  | 'lc_at_sight'
  | 'cash_on_delivery'

export const INCOTERM_OPTIONS: Array<{ value: Incoterm; label: string; seaOnly: boolean }> = [
  { value: 'EXW', label: 'EXW — Ex Works', seaOnly: false },
  { value: 'FCA', label: 'FCA — Free Carrier', seaOnly: false },
  { value: 'FAS', label: 'FAS — Free Alongside Ship', seaOnly: true },
  { value: 'FOB', label: 'FOB — Free On Board', seaOnly: true },
  { value: 'CFR', label: 'CFR — Cost and Freight', seaOnly: true },
  { value: 'CIF', label: 'CIF — Cost, Insurance and Freight', seaOnly: true },
  { value: 'CPT', label: 'CPT — Carriage Paid To', seaOnly: false },
  { value: 'CIP', label: 'CIP — Carriage and Insurance Paid To', seaOnly: false },
  { value: 'DAP', label: 'DAP — Delivered at Place', seaOnly: false },
  { value: 'DPU', label: 'DPU — Delivered at Place Unloaded', seaOnly: false },
  { value: 'DDP', label: 'DDP — Delivered Duty Paid', seaOnly: false },
]

export const SHIPPING_METHOD_OPTIONS: Array<{ value: ShippingMethod; label: string }> = [
  { value: 'courier', label: 'Courier / parcel' },
  { value: 'air_freight', label: 'Air freight' },
  { value: 'sea_freight', label: 'Sea freight' },
  { value: 'road_freight', label: 'Road freight' },
  { value: 'rail_freight', label: 'Rail freight' },
  { value: 'local_delivery', label: 'Local delivery' },
  { value: 'customer_pickup', label: 'Customer pickup' },
]

export const PAYMENT_TERM_OPTIONS: Array<{ value: PaymentTerms; label: string }> = [
  { value: 'advance_100', label: '100% advance' },
  { value: 'advance_50', label: '50% advance, 50% on dispatch' },
  { value: 'net_15', label: 'Net 15 days' },
  { value: 'net_30', label: 'Net 30 days' },
  { value: 'net_45', label: 'Net 45 days' },
  { value: 'net_60', label: 'Net 60 days' },
  { value: 'lc_at_sight', label: 'Letter of credit at sight' },
  { value: 'cash_on_delivery', label: 'Cash on delivery' },
]

export interface QuoteAssignee {
  id: number
  name: string
  email: string
}

export interface QuoteResponseItem {
  name: string
  sku: string | null
  part_number: string | null
  description: string | null
  quantity: number
  unit_price: number
  discount_amount: number | null
  tax_rate: number | null
  line_total: number
  lead_time_days: number | null
}

export interface QuoteResponsePayloadItem {
  product_id?: number | null
  variant_id?: number | null
  name: string
  sku?: string | null
  part_number?: string | null
  description?: string | null
  quantity: number
  unit_price: number
  discount_amount?: number | null
  tax_rate?: number | null
  lead_time_days?: number | null
}

export interface QuoteResponse {
  uuid: string
  revision: number
  status: QuoteResponseStatus
  status_label: string
  subject: string
  message: string
  terms: string | null
  currency: string
  subtotal: number | null
  discount_amount: number | null
  tax_amount: number | null
  shipping_amount: number | null
  total_amount: number | null
  validity_days: number
  expires_at: string | null
  sent_at: string | null
  viewed_at: string | null
  accepted_at: string | null
  declined_at: string | null
  superseded_at: string | null
  internal_note: boolean
  attachments: string[]
  is_expired: boolean
  incoterm: Incoterm | null
  incoterm_label: string | null
  incoterm_location: string | null
  payment_terms: PaymentTerms | null
  payment_terms_label: string | null
  warranty_months: number | null
  shipping_method: ShippingMethod | null
  shipping_method_label: string | null
  country_of_origin: string | null
  hs_code: string | null
  lead_time_days: number | null
  estimated_ship_date: string | null
  port_of_loading: string | null
  port_of_discharge: string | null
  partial_shipment_allowed: boolean
  shipping_notes: string | null
  package_count: number | null
  gross_weight_kg: number | null
  net_weight_kg: number | null
  package_dimensions: string | null
  packaging_notes: string | null
  sender?: QuoteAssignee
  items?: QuoteResponseItem[]
}

export interface QuoteListItem {
  uuid: string
  quote_number: string | null
  status: QuoteStatus
  status_label: string
  priority: QuotePriority | null
  customer_name: string
  customer_email: string
  customer_phone: string | null
  organization: string
  industry: string | null
  product_name: string | null
  sku: string | null
  part_number: string | null
  quantity: number | null
  assigned_to: QuoteAssignee | null
  latest_response: QuoteResponse | null
  is_overdue: boolean
  created_at: string | null
  first_response_at: string | null
  last_response_at: string | null
  response_due_at: string | null
}

export interface QuoteDocument {
  id: number
  uuid: string
  type: string
  filename: string
  mime: string
  download_url: string | null
  created_at: string | null
}

export interface QuoteActivity {
  id: number
  type: string
  meta: Record<string, unknown>
  user: { id: number; name: string } | null
  created_at: string | null
}

export interface QuotePackagingPrefill {
  gross_weight_kg: number | null
  net_weight_kg: number | null
  dimensions: string | null
  units_per_case: number
  is_fragile: boolean
  is_hazmat: boolean
  is_stackable: boolean
  handling_notes: string | null
}

export interface QuoteRequirement {
  product_name?: string | null
  part_number?: string | null
  sku?: string | null
  model_number?: string | null
  gtin?: string | null
  manufacturer?: string | null
  brand?: string | null
  variant_name?: string | null
  quantity?: number | string | null
  product_id?: number | null
  route?: string | null
  [key: string]: unknown
}

export interface QuoteDetail extends QuoteListItem {
  business_email: string | null
  department: string | null
  job_title: string | null
  company_size: string | null
  industry_id: number | null
  state: string | null
  city: string | null
  postal_code: string | null
  country: string | null
  application: string | null
  message: string | null
  requirements: QuoteRequirement
  packaging_prefill: QuotePackagingPrefill | null
  source_page: string | null
  quotable: {
    type: string
    id: number
    name: string | null
    route_key: string | null
  } | null
  tenant: { id: number; name: string } | null
  organization_ref: { id: number; name: string } | null
  quoted_at: string | null
  accepted_at: string | null
  declined_at: string | null
  cancelled_at: string | null
  cancelled_reason: string | null
  responses: QuoteResponse[]
  activities: QuoteActivity[]
}

export interface QuoteMeta {
  current_page: number
  last_page: number
  per_page: number
  total: number
  from: number | null
  to: number | null
}

export interface QuoteListData {
  data: QuoteListItem[]
  meta: QuoteMeta
  counts: Record<string, number>
}

export interface QuoteStats {
  avg_first_response_minutes: number | null
  open: number
  overdue: number
}

export interface QuoteListParams {
  status?: QuoteStatus | ''
  priority?: QuotePriority | ''
  assigned_to?: string
  search?: string
  date_from?: string
  date_to?: string
  expiring_within_days?: number
  sort?: QuoteSort
  page?: number
  per_page?: number
}

export interface QuoteResponsePayload {
  subject: string
  message: string
  terms?: string | null
  currency?: string
  validity_days?: number
  discount_amount?: number
  shipping_amount?: number
  send?: boolean
  internal_note?: boolean
  incoterm?: Incoterm | null
  incoterm_location?: string | null
  payment_terms?: PaymentTerms | null
  warranty_months?: number | null
  shipping_method?: ShippingMethod | null
  country_of_origin?: string | null
  hs_code?: string | null
  lead_time_days?: number | null
  estimated_ship_date?: string | null
  port_of_loading?: string | null
  port_of_discharge?: string | null
  partial_shipment_allowed?: boolean
  shipping_notes?: string | null
  package_count?: number | null
  gross_weight_kg?: number | null
  net_weight_kg?: number | null
  package_dimensions?: string | null
  packaging_notes?: string | null
  items: QuoteResponsePayloadItem[]
}

export const QUOTE_STATUS_OPTIONS: Array<{ value: QuoteStatus; label: string }> = [
  { value: 'pending', label: 'Pending' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'replied', label: 'Replied' },
  { value: 'accepted', label: 'Accepted' },
  { value: 'declined', label: 'Declined' },
  { value: 'expired', label: 'Expired' },
  { value: 'cancelled', label: 'Cancelled' },
]

export const QUOTE_STATUS_LABELS: Record<QuoteStatus, string> = {
  pending: 'Pending',
  in_progress: 'In progress',
  replied: 'Replied',
  accepted: 'Accepted',
  declined: 'Declined',
  expired: 'Expired',
  cancelled: 'Cancelled',
}

export const QUOTE_PRIORITY_OPTIONS: Array<{ value: QuotePriority; label: string }> = [
  { value: 'low', label: 'Low' },
  { value: 'normal', label: 'Normal' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' },
]

export const QUOTE_STATUS_TONES: Record<QuoteStatus, string> = {
  pending: 'bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-500/10 dark:text-amber-300',
  in_progress: 'bg-blue-50 text-blue-700 ring-blue-600/20 dark:bg-blue-500/10 dark:text-blue-300',
  replied:
    'bg-indigo-50 text-indigo-700 ring-indigo-600/20 dark:bg-indigo-500/10 dark:text-indigo-300',
  accepted:
    'bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-300',
  declined: 'bg-red-50 text-red-700 ring-red-600/20 dark:bg-red-500/10 dark:text-red-300',
  expired: 'bg-gray-100 text-gray-600 ring-gray-500/20 dark:bg-gray-700 dark:text-gray-300',
  cancelled: 'bg-gray-100 text-gray-600 ring-gray-500/20 dark:bg-gray-700 dark:text-gray-300',
}

export const QUOTE_RESPONSE_TONES: Record<QuoteResponseStatus, string> = {
  draft: 'bg-gray-100 text-gray-600 ring-gray-500/20 dark:bg-gray-700 dark:text-gray-300',
  sent: 'bg-blue-50 text-blue-700 ring-blue-600/20 dark:bg-blue-500/10 dark:text-blue-300',
  viewed:
    'bg-violet-50 text-violet-700 ring-violet-600/20 dark:bg-violet-500/10 dark:text-violet-300',
  accepted:
    'bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-300',
  declined: 'bg-red-50 text-red-700 ring-red-600/20 dark:bg-red-500/10 dark:text-red-300',
  expired: 'bg-gray-100 text-gray-600 ring-gray-500/20 dark:bg-gray-700 dark:text-gray-300',
  superseded: 'bg-gray-100 text-gray-500 ring-gray-500/20 dark:bg-gray-800 dark:text-gray-400',
}

const EMPTY_META: QuoteMeta = {
  current_page: 1,
  last_page: 1,
  per_page: 20,
  total: 0,
  from: null,
  to: null,
}

const EMPTY_COUNTS: Record<string, number> = {
  all: 0,
  pending: 0,
  in_progress: 0,
  replied: 0,
  accepted: 0,
  declined: 0,
  expired: 0,
  cancelled: 0,
}

export const quotesApi = {
  async list(params: QuoteListParams = {}): Promise<QuoteListData> {
    const searchParams: Record<string, string> = {}
    if (params.status) searchParams.status = params.status
    if (params.priority) searchParams.priority = params.priority
    if (params.assigned_to) searchParams.assigned_to = params.assigned_to
    if (params.search) searchParams.search = params.search
    if (params.date_from) searchParams.date_from = params.date_from
    if (params.date_to) searchParams.date_to = params.date_to
    if (params.expiring_within_days)
      searchParams.expiring_within_days = String(params.expiring_within_days)
    if (params.sort) searchParams.sort = params.sort
    if (params.page) searchParams.page = String(params.page)
    if (params.per_page) searchParams.per_page = String(params.per_page)

    const res = await api.get('quotes', {
      searchParams,
      headers: authHeaders(),
      throwHttpErrors: false,
    })
    const body = await parseApiResponse<QuoteListData>(res)
    const payload = body.data as QuoteListData | undefined
    return {
      data: payload?.data ?? [],
      meta: payload?.meta ?? EMPTY_META,
      counts: { ...EMPTY_COUNTS, ...(payload?.counts ?? {}) },
    }
  },

  async stats(): Promise<QuoteStats> {
    const res = await api.get('quotes/stats', {
      headers: authHeaders(),
      throwHttpErrors: false,
    })
    const body = await parseApiResponse<QuoteStats>(res)
    return (
      (body.data as QuoteStats) ?? {
        avg_first_response_minutes: null,
        open: 0,
        overdue: 0,
      }
    )
  },

  async assignees(): Promise<QuoteAssignee[]> {
    const res = await api.get('quotes/assignees', {
      headers: authHeaders(),
      throwHttpErrors: false,
    })
    const body = await parseApiResponse<QuoteAssignee[]>(res)
    return (body.data as QuoteAssignee[]) ?? []
  },

  async get(uuid: string): Promise<QuoteDetail> {
    const res = await api.get(`quotes/${uuid}`, {
      headers: authHeaders(),
      throwHttpErrors: false,
    })
    const body = await parseApiResponse<QuoteDetail>(res)
    return body.data as QuoteDetail
  },

  async updateStatus(uuid: string, status: QuoteStatus, reason?: string): Promise<QuoteDetail> {
    const res = await api.put(`quotes/${uuid}/status`, {
      json: { status, reason },
      headers: authHeaders(),
      throwHttpErrors: false,
    })
    const body = await parseApiResponse<QuoteDetail>(res)
    return body.data as QuoteDetail
  },

  async assign(uuid: string, userId: number | null): Promise<QuoteDetail> {
    const res = await api.post(`quotes/${uuid}/assign`, {
      json: { user_id: userId },
      headers: authHeaders(),
      throwHttpErrors: false,
    })
    const body = await parseApiResponse<QuoteDetail>(res)
    return body.data as QuoteDetail
  },

  async reply(uuid: string, payload: QuoteResponsePayload): Promise<QuoteResponse> {
    const res = await api.post(`quotes/${uuid}/responses`, {
      json: payload,
      headers: authHeaders(),
      throwHttpErrors: false,
    })
    const body = await parseApiResponse<QuoteResponse>(res)
    return body.data as QuoteResponse
  },

  async updateDraft(
    uuid: string,
    responseUuid: string,
    payload: QuoteResponsePayload
  ): Promise<QuoteResponse> {
    const res = await api.put(`quotes/${uuid}/responses/${responseUuid}`, {
      json: payload,
      headers: authHeaders(),
      throwHttpErrors: false,
    })
    const body = await parseApiResponse<QuoteResponse>(res)
    return body.data as QuoteResponse
  },

  async resend(uuid: string, responseUuid: string): Promise<QuoteResponse> {
    const res = await api.post(`quotes/${uuid}/responses/${responseUuid}/resend`, {
      headers: authHeaders(),
      throwHttpErrors: false,
    })
    const body = await parseApiResponse<QuoteResponse>(res)
    return body.data as QuoteResponse
  },

  async sendDraft(uuid: string, responseUuid: string): Promise<QuoteResponse> {
    const res = await api.post(`quotes/${uuid}/responses/${responseUuid}/send`, {
      headers: authHeaders(),
      throwHttpErrors: false,
    })
    const body = await parseApiResponse<QuoteResponse>(res)
    return body.data as QuoteResponse
  },

  async quotationPdf(uuid: string, responseUuid: string): Promise<QuoteDocument> {
    const res = await api.post(`quotes/${uuid}/responses/${responseUuid}/pdf`, {
      headers: authHeaders(),
      throwHttpErrors: false,
    })
    const body = await parseApiResponse<QuoteDocument>(res)
    return body.data as QuoteDocument
  },

  async addNote(uuid: string, body: string): Promise<QuoteActivity> {
    const res = await api.post(`quotes/${uuid}/notes`, {
      json: { body },
      headers: authHeaders(),
      throwHttpErrors: false,
    })
    const parsed = await parseApiResponse<QuoteActivity>(res)
    return parsed.data as QuoteActivity
  },
}
