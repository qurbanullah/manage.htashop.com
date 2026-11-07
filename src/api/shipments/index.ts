import api from '@/api/client'
import { parseApiResponse } from '@/lib/api-response'
import { authHeaders } from '@/lib/auth-header'

export interface ShipmentItemLine {
  id: number
  order_item_id: number
  name: string | null
  sku: string | null
  quantity: number
}

export interface ShipmentParcelItem {
  id: number
  order_item_id: number
  name: string | null
  sku: string | null
  quantity: number
}

export interface ShipmentParcel {
  id: number
  uuid: string
  sequence: number
  packaging_template_id: number | null
  packaging_template: { id: number; uuid: string; name: string } | null
  length_cm: number | null
  width_cm: number | null
  height_cm: number | null
  volume_cm3: number | null
  weight_kg: number | null
  contains_hazmat: boolean
  tracking_number: string | null
  notes: string | null
  items: ShipmentParcelItem[]
}

export interface ShipmentWarehouseRef {
  id: number
  uuid: string
  name: string
  city: string | null
}

export interface ShipmentPackedLine {
  order_item_id: number
  quantity: number
}

export interface Shipment {
  id: number
  uuid: string
  order_id: number
  order: { uuid: string; order_number: string } | null
  warehouse_id: number | null
  warehouse: ShipmentWarehouseRef | null
  status: string
  status_label: string
  is_open: boolean
  carrier: string
  service: string | null
  tracking_number: string | null
  tracking_url: string | null
  carrier_booking_id: string | null
  label_url: string | null
  booked_at: string | null
  weight_kg: number | null
  ship_to: Record<string, unknown> | null
  ship_from: Record<string, unknown> | null
  notes: string | null
  contains_hazmat: boolean
  packed: ShipmentPackedLine[]
  unpacked: boolean
  parcel_count: number
  parcels: ShipmentParcel[]
  items: ShipmentItemLine[]
  packed_at: string | null
  shipped_at: string | null
  delivered_at: string | null
  created_at: string | null
  updated_at: string | null
}

export interface ShipmentPlanItem {
  id: number
  uuid: string
  name: string
  sku: string | null
  quantity: number
  shipped: number
  remaining: number
}

export interface ShipmentPlan {
  shipments: Shipment[]
  items: ShipmentPlanItem[]
  can_ship: boolean
}

export interface ShipmentParcelPayload {
  packaging_template_id?: number | null
  sequence?: number
  length_cm?: number | null
  width_cm?: number | null
  height_cm?: number | null
  weight_kg?: number | null
  contains_hazmat?: boolean
  tracking_number?: string | null
  notes?: string | null
  items?: Array<{ order_item_id: number; quantity: number }>
}

export interface ShipmentPayload {
  warehouse_id?: number | null
  carrier?: string
  service?: string | null
  tracking_number?: string | null
  tracking_url?: string | null
  notes?: string | null
  auto_pack?: boolean
  items: Array<{ order_item_id: number; quantity: number }>
  parcels: ShipmentParcelPayload[]
}

export interface PackingPlanBox {
  packaging_template_id: number | null
  packaging_template: { name: string } | null
  length_cm: number | null
  width_cm: number | null
  height_cm: number | null
  weight_kg: number
  contains_hazmat: boolean
  hazard_class_option_id: number | null
  items: Array<{ order_item_id: number; quantity: number }>
}

/** The planner's suggestion: boxes, their contents and what it could not resolve. */
export interface PackingPlanPreview {
  boxes: PackingPlanBox[]
  warnings: string[]
}

export interface ApplyPackingPlanResult {
  shipment: Shipment
  plan: PackingPlanPreview
}

export const shipmentsApi = {
  async plan(orderUuid: string): Promise<ShipmentPlan> {
    const res = await api.get(`orders/${orderUuid}/shipments`, { headers: authHeaders() })
    const body = await parseApiResponse<ShipmentPlan>(res)

    return body.data as ShipmentPlan
  },

  async create(orderUuid: string, payload: ShipmentPayload): Promise<Shipment> {
    const res = await api.post(`orders/${orderUuid}/shipments`, {
      json: payload,
      headers: authHeaders(),
      throwHttpErrors: false,
    })
    const body = await parseApiResponse<Shipment>(res)

    return body.data as Shipment
  },

  async update(uuid: string, payload: Partial<ShipmentPayload>): Promise<Shipment> {
    const res = await api.put(`shipments/${uuid}`, {
      json: payload,
      headers: authHeaders(),
      throwHttpErrors: false,
    })
    const body = await parseApiResponse<Shipment>(res)

    return body.data as Shipment
  },

  async updateStatus(uuid: string, status: string): Promise<Shipment> {
    const res = await api.patch(`shipments/${uuid}/status`, {
      json: { status },
      headers: authHeaders(),
      throwHttpErrors: false,
    })
    const body = await parseApiResponse<Shipment>(res)

    return body.data as Shipment
  },

  /** The planner's suggested boxes, without writing them. */
  async packingPlan(uuid: string): Promise<PackingPlanPreview> {
    const res = await api.get(`shipments/${uuid}/packing-plan`, { headers: authHeaders() })
    const body = await parseApiResponse<PackingPlanPreview>(res)

    return body.data as PackingPlanPreview
  },

  /** Replace the boxes with the planner's suggestion. */
  async applyPlan(uuid: string): Promise<ApplyPackingPlanResult> {
    const res = await api.post(`shipments/${uuid}/apply-plan`, {
      headers: authHeaders(),
      throwHttpErrors: false,
    })
    const body = await parseApiResponse<ApplyPackingPlanResult>(res)

    return body.data as ApplyPackingPlanResult
  },

  /** Create the carrier consignment (TTN + label). */
  async book(uuid: string): Promise<Shipment> {
    const res = await api.post(`shipments/${uuid}/book`, {
      headers: authHeaders(),
      throwHttpErrors: false,
    })
    const body = await parseApiResponse<Shipment>(res)

    return body.data as Shipment
  },

  /** Void the carrier consignment before dispatch. */
  async cancelBooking(uuid: string): Promise<Shipment> {
    const res = await api.post(`shipments/${uuid}/cancel-booking`, {
      headers: authHeaders(),
      throwHttpErrors: false,
    })
    const body = await parseApiResponse<Shipment>(res)

    return body.data as Shipment
  },

  async remove(uuid: string) {
    return parseApiResponse(
      await api.delete(`shipments/${uuid}`, {
        headers: authHeaders(),
        throwHttpErrors: false,
      })
    )
  },
}
