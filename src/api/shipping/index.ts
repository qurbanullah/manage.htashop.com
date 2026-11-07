import api from '@/api/client'
import { parseApiResponse } from '@/lib/api-response'
import { authHeaders } from '@/lib/auth-header'

/** A unit reference embedded in a shipping record. */
export interface ShippingUnitRef {
  id: number
  name: string
  code: string
  symbol: string
}

export interface ShippingContentsItem {
  name: string
  qty?: number | null
}

/** Server representation of a product's packaging & shipping data. */
export interface ProductShipping {
  net_weight: number | null
  gross_weight: number | null
  weight_unit_id: number | null
  weight_unit: ShippingUnitRef | null
  gross_weight_kg: number | null

  length: number | null
  width: number | null
  height: number | null
  dimension_unit_id: number | null
  dimension_unit: ShippingUnitRef | null
  length_cm: number | null
  width_cm: number | null
  height_cm: number | null

  packaging_type_unit_id: number | null
  packaging_type: ShippingUnitRef | null
  units_per_case: number

  ships_alone: boolean
  is_fragile: boolean
  is_stackable: boolean
  is_hazmat: boolean

  un_number: string | null
  hazard_class_option_id: number | null
  hazard_class: { id: number; name: string; code: string } | null
  packing_group_option_id: number | null
  packing_group: { id: number; name: string; code: string } | null

  handling_notes: string | null
  contents: ShippingContentsItem[]
  is_rateable: boolean
  volumetric_weight_kg: number | null
}

/** Write payload accepted by `PUT /products/{uuid}/shipping`. */
export interface ProductShippingPayload {
  net_weight?: number | null
  gross_weight?: number | null
  weight_unit_id?: number | null

  length?: number | null
  width?: number | null
  height?: number | null
  dimension_unit_id?: number | null

  packaging_type_unit_id?: number | null
  units_per_case?: number | null

  ships_alone?: boolean
  is_fragile?: boolean
  is_stackable?: boolean
  is_hazmat?: boolean

  un_number?: string | null
  hazard_class_option_id?: number | null
  packing_group_option_id?: number | null

  handling_notes?: string | null
  contents?: Array<{ name: string; qty?: number | null }>
}

export const shippingApi = {
  /** Returns `null` while the product has no shipping record yet. */
  async get(uuid: string): Promise<ProductShipping | null> {
    const res = await api.get(`products/${uuid}/shipping`, { headers: authHeaders() })
    const body = await parseApiResponse<ProductShipping | null>(res)
    return (body.data as ProductShipping | null) ?? null
  },

  async update(uuid: string, payload: ProductShippingPayload): Promise<ProductShipping> {
    const res = await api.put(`products/${uuid}/shipping`, {
      json: payload,
      headers: authHeaders(),
      throwHttpErrors: false,
    })
    const body = await parseApiResponse<ProductShipping>(res)
    return body.data as ProductShipping
  },
}
