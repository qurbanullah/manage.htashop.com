import api from '@/api/client'
import { parseApiResponse } from '@/lib/api-response'
import { authHeaders } from '@/lib/auth-header'

/** Shared unit reference returned by the shipping resources. */
export interface ShippingUnitRef {
  id: number
  name: string
  code: string
  symbol: string
}

export type ZoneLocationType = 'country' | 'city' | 'state' | 'postal_prefix'

export interface ShippingZoneLocation {
  id: number
  type: ZoneLocationType
  country_id: number | null
  country: { id: number; name: string; code?: string } | null
  city_id: number | null
  city: { id: number; name: string } | null
  state: string | null
  postal_code_prefix: string | null
}

export interface ShippingZone {
  id: number
  uuid: string
  tenant_id: number | null
  name: string
  code: string
  description: string | null
  is_active: boolean
  sort_order: number
  locations: ShippingZoneLocation[]
}

export interface ShippingZonePayload {
  name: string
  code?: string
  description?: string
  is_active?: boolean
  sort_order?: number
  locations: Array<{
    type: ZoneLocationType
    country_id?: number | null
    city_id?: number | null
    state?: string | null
    postal_code_prefix?: string | null
  }>
}

export type ShippingCalculation = 'flat' | 'per_weight' | 'tiered'

export interface ShippingRateTier {
  id: number
  min_weight_kg: number
  max_weight_kg: number | null
  amount: number
}

export interface ShippingRate {
  id: number
  uuid: string
  tenant_id: number | null
  shipping_zone_id: number | null
  zone: { id: number; uuid: string; name: string; code: string } | null
  warehouse_id: number | null
  warehouse: { id: number; uuid: string; name: string; city: string | null } | null
  name: string
  code: string
  description: string | null
  carrier: string
  calculation: ShippingCalculation
  currency: string
  base_amount: number
  included_weight_kg: number
  per_kg_amount: number
  min_weight_kg: number | null
  max_weight_kg: number | null
  free_over_amount: number | null
  estimated_days_min: number | null
  estimated_days_max: number | null
  priority: number
  is_active: boolean
  carries_hazmat: boolean
  tiers: ShippingRateTier[]
}

export interface ShippingRatePayload {
  name: string
  code?: string
  description?: string
  shipping_zone_id?: number | null
  warehouse_id?: number | null
  carrier?: string
  calculation: ShippingCalculation
  currency: string
  base_amount?: number
  included_weight_kg?: number
  per_kg_amount?: number
  min_weight_kg?: number | null
  max_weight_kg?: number | null
  free_over_amount?: number | null
  estimated_days_min?: number | null
  estimated_days_max?: number | null
  priority?: number
  is_active?: boolean
  carries_hazmat?: boolean
  tiers?: Array<{ min_weight_kg: number; max_weight_kg: number | null; amount: number }>
}

export interface PackagingTemplate {
  id: number
  uuid: string
  tenant_id: number | null
  name: string
  code: string
  description: string | null
  packaging_type_unit_id: number | null
  packaging_type: ShippingUnitRef | null
  length: number | null
  width: number | null
  height: number | null
  dimension_unit_id: number | null
  dimension_unit: ShippingUnitRef | null
  length_cm: number | null
  width_cm: number | null
  height_cm: number | null
  volume_cm3: number | null
  max_weight: number | null
  weight_unit_id: number | null
  weight_unit: ShippingUnitRef | null
  max_weight_kg: number | null
  tare_weight: number | null
  tare_weight_unit_id: number | null
  tare_weight_unit: ShippingUnitRef | null
  tare_weight_kg: number | null
  is_active: boolean
  sort_order: number
}

export interface PackagingTemplatePayload {
  name: string
  code?: string
  description?: string
  packaging_type_unit_id?: number | null
  length?: number | null
  width?: number | null
  height?: number | null
  dimension_unit_id?: number | null
  max_weight?: number | null
  weight_unit_id?: number | null
  tare_weight?: number | null
  tare_weight_unit_id?: number | null
  is_active?: boolean
  sort_order?: number
}

async function listResource<T>(path: string, search?: string): Promise<T[]> {
  const params: Record<string, string> = {}
  if (search) params.search = search

  const res = await api.get(path, { searchParams: params, headers: authHeaders() })
  const body = await parseApiResponse<T[]>(res)

  return (body.data as T[]) ?? []
}

async function createResource<T>(path: string, payload: unknown) {
  const res = await api.post(path, {
    json: payload,
    headers: authHeaders(),
    throwHttpErrors: false,
  })

  return parseApiResponse<T>(res)
}

async function updateResource<T>(path: string, payload: unknown) {
  const res = await api.put(path, {
    json: payload,
    headers: authHeaders(),
    throwHttpErrors: false,
  })

  return parseApiResponse<T>(res)
}

async function deleteResource(path: string) {
  return parseApiResponse(
    await api.delete(path, { headers: authHeaders(), throwHttpErrors: false })
  )
}

export const shippingZonesApi = {
  list: (search?: string) => listResource<ShippingZone>('shipping-zones', search),
  create: (payload: ShippingZonePayload) => createResource<ShippingZone>('shipping-zones', payload),
  update: (uuid: string, payload: Partial<ShippingZonePayload>) =>
    updateResource<ShippingZone>(`shipping-zones/${uuid}`, payload),
  remove: (uuid: string) => deleteResource(`shipping-zones/${uuid}`),
}

export const shippingRatesApi = {
  list: (search?: string) => listResource<ShippingRate>('shipping-rates', search),
  create: (payload: ShippingRatePayload) => createResource<ShippingRate>('shipping-rates', payload),
  update: (uuid: string, payload: Partial<ShippingRatePayload>) =>
    updateResource<ShippingRate>(`shipping-rates/${uuid}`, payload),
  remove: (uuid: string) => deleteResource(`shipping-rates/${uuid}`),
}

export const packagingTemplatesApi = {
  list: (search?: string) => listResource<PackagingTemplate>('packaging-templates', search),
  create: (payload: PackagingTemplatePayload) =>
    createResource<PackagingTemplate>('packaging-templates', payload),
  update: (uuid: string, payload: Partial<PackagingTemplatePayload>) =>
    updateResource<PackagingTemplate>(`packaging-templates/${uuid}`, payload),
  remove: (uuid: string) => deleteResource(`packaging-templates/${uuid}`),
}

/** A courier this installation can rate against and/or book with. */
export interface ShippingCarrier {
  code: string
  name: string
  rates: boolean
  booking: boolean
}

export const shippingCarriersApi = {
  list: () => listResource<ShippingCarrier>('shipping-carriers'),
}
