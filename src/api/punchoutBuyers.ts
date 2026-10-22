import api from '@/api/client'
import { parseApiResponse } from '@/lib/api-response'
import { authHeaders } from '@/lib/auth-header'

export type PunchoutProtocol = 'cxml' | 'oci'

export interface PunchoutBuyerSettings {
  hide_prices?: boolean
  allow_reviews?: boolean
  customer_part_number_required?: boolean
  max_line_items?: number | null
  max_quantity_per_line?: number | null
  branding?: {
    logo_url?: string | null
    primary_color?: string | null
  }
}

export interface PunchoutBuyer {
  id: number
  uuid: string
  tenant_id: number
  organization_id: number | null
  contract_id: number | null
  name: string
  code: string
  protocol: PunchoutProtocol | null
  sender_identity: string | null
  from_identity: string | null
  to_identity: string | null
  oci_username: string | null
  allowed_return_domains: string[]
  default_currency: string | null
  default_locale: string | null
  settings: PunchoutBuyerSettings
  is_active: boolean
  has_shared_secret: boolean
  has_previous_shared_secret: boolean
  has_oci_password: boolean
  secret_rotated_at: string | null
  last_seen_at: string | null
  organization?: { id: number; uuid: string; name: string } | null
  contract?: { id: number; uuid: string; name: string; code: string | null; status: string } | null
  created_at: string | null
  updated_at: string | null
}

export interface PunchoutBuyerListMeta {
  current_page: number
  last_page: number
  per_page: number
  total: number
}

export interface PunchoutBuyerListData {
  items: PunchoutBuyer[]
  meta: PunchoutBuyerListMeta
}

export interface PunchoutBuyerListParams {
  search?: string
  protocol?: PunchoutProtocol
  is_active?: '1' | '0'
  page?: number
  per_page?: number
}

export interface PunchoutBuyerOrganizationOption {
  id: number
  uuid: string
  name: string
  slug: string
  type: string | null
}

export interface PunchoutBuyerContractOption {
  id: number
  uuid: string
  name: string
  code: string | null
  status: string
  buyer_id: number
  buyer_name: string | null
  vendor_id: number
  catalog_id: number | null
  currency_id: number | null
}

export interface PunchoutBuyerOptions {
  organizations: PunchoutBuyerOrganizationOption[]
  contracts: PunchoutBuyerContractOption[]
}

export interface PunchoutBuyerOptionsParams {
  organization_id?: number
  search?: string
}

/**
 * Tenant and scope are derived from the caller's membership on the server and
 * must never be sent from this app.
 */
export interface PunchoutBuyerPayload {
  organization_id?: number | null
  contract_id?: number | null
  name: string
  code: string
  protocol?: PunchoutProtocol | null
  sender_identity?: string | null
  from_identity?: string | null
  to_identity?: string | null
  shared_secret?: string | null
  oci_username?: string | null
  oci_password?: string | null
  allowed_return_domains?: string[] | null
  default_currency?: string | null
  default_locale?: string | null
  settings?: PunchoutBuyerSettings | null
  is_active?: boolean
}

interface PunchoutBuyerListEnvelope {
  items: PunchoutBuyer[]
  meta: PunchoutBuyerListMeta
}

const EMPTY_META: PunchoutBuyerListMeta = {
  current_page: 1,
  last_page: 1,
  per_page: 15,
  total: 0,
}

const EMPTY_OPTIONS: PunchoutBuyerOptions = { organizations: [], contracts: [] }

export function buildPunchoutBuyerListParams(
  params: PunchoutBuyerListParams = {}
): Record<string, string> {
  const searchParams: Record<string, string> = {}
  if (params.search) searchParams.search = params.search
  if (params.protocol) searchParams.protocol = params.protocol
  // "0" is a meaningful filter, so only an absent value skips it.
  if (params.is_active !== undefined) searchParams.is_active = params.is_active
  if (params.page) searchParams.page = String(params.page)
  if (params.per_page) searchParams.per_page = String(params.per_page)
  return searchParams
}

export function buildPunchoutBuyerOptionsParams(
  params: PunchoutBuyerOptionsParams = {}
): Record<string, string> {
  const searchParams: Record<string, string> = {}
  if (params.organization_id) searchParams.organization_id = String(params.organization_id)
  if (params.search) searchParams.search = params.search
  return searchParams
}

function normalizeMeta(meta: PunchoutBuyerListMeta | undefined | null): PunchoutBuyerListMeta {
  if (!meta) return EMPTY_META
  return {
    current_page: meta.current_page ?? 1,
    last_page: meta.last_page ?? 1,
    per_page: meta.per_page ?? 15,
    total: meta.total ?? 0,
  }
}

export const punchoutBuyersApi = {
  async list(params: PunchoutBuyerListParams = {}): Promise<PunchoutBuyerListData> {
    const res = await api.get('manage/punchout/buyers', {
      searchParams: buildPunchoutBuyerListParams(params),
      headers: authHeaders(),
      throwHttpErrors: false,
    })
    const body = await parseApiResponse<PunchoutBuyerListEnvelope>(res)
    const payload = body.data as Partial<PunchoutBuyerListEnvelope> | null
    if (!payload) return { items: [], meta: EMPTY_META }
    return { items: payload.items ?? [], meta: normalizeMeta(payload.meta) }
  },

  async get(uuid: string): Promise<PunchoutBuyer> {
    const res = await api.get(`manage/punchout/buyers/${uuid}`, {
      headers: authHeaders(),
      throwHttpErrors: false,
    })
    const body = await parseApiResponse<PunchoutBuyer>(res)
    return body.data as PunchoutBuyer
  },

  async create(payload: PunchoutBuyerPayload): Promise<PunchoutBuyer> {
    const res = await api.post('manage/punchout/buyers', {
      json: payload,
      headers: authHeaders(),
      throwHttpErrors: false,
    })
    const body = await parseApiResponse<PunchoutBuyer>(res)
    return body.data as PunchoutBuyer
  },

  async update(uuid: string, payload: Partial<PunchoutBuyerPayload>): Promise<PunchoutBuyer> {
    const res = await api.put(`manage/punchout/buyers/${uuid}`, {
      json: payload,
      headers: authHeaders(),
      throwHttpErrors: false,
    })
    const body = await parseApiResponse<PunchoutBuyer>(res)
    return body.data as PunchoutBuyer
  },

  async remove(uuid: string): Promise<void> {
    await parseApiResponse(
      await api.delete(`manage/punchout/buyers/${uuid}`, {
        headers: authHeaders(),
        throwHttpErrors: false,
      })
    )
  },

  async rotateSecret(
    uuid: string,
    sharedSecret: string,
    keepPrevious = true
  ): Promise<PunchoutBuyer> {
    const res = await api.post(`manage/punchout/buyers/${uuid}/rotate-secret`, {
      json: { shared_secret: sharedSecret, keep_previous: keepPrevious },
      headers: authHeaders(),
      throwHttpErrors: false,
    })
    const body = await parseApiResponse<PunchoutBuyer>(res)
    return body.data as PunchoutBuyer
  },

  async options(params: PunchoutBuyerOptionsParams = {}): Promise<PunchoutBuyerOptions> {
    const res = await api.get('manage/punchout/buyers/options', {
      searchParams: buildPunchoutBuyerOptionsParams(params),
      headers: authHeaders(),
      throwHttpErrors: false,
    })
    const body = await parseApiResponse<PunchoutBuyerOptions>(res)
    const payload = body.data as Partial<PunchoutBuyerOptions> | null
    if (!payload) return EMPTY_OPTIONS
    return {
      organizations: payload.organizations ?? [],
      contracts: payload.contracts ?? [],
    }
  },
}
