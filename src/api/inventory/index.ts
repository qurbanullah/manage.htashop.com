import api from "@/api/client";
import { authHeaders } from "@/lib/auth-header";
import { parseApiResponse } from "@/lib/api-response";

export interface InventoryData {
  id: number;
  uuid: string;
  tenant_id: number;
  warehouse_id: number | null;
  stockable_type: string;
  stockable_id: number;
  sku: string | null;
  quantity: number;
  reserved: number;
  available: number;
  low_stock_threshold: number | null;
  track_inventory: boolean;
  is_active: boolean;
  is_low_stock: boolean;
  warehouse?: { id: number; name: string } | null;
  created_at: string;
  updated_at: string;
}

export interface UpsertInventoryPayload {
  stockable_type: string;
  stockable_id: number;
  warehouse_id?: number | null;
  sku?: string;
  quantity?: number;
  reserved?: number;
  low_stock_threshold?: number | null;
  track_inventory?: boolean;
  is_active?: boolean;
}

export const inventoryApi = {
  async list(filters?: { stockable_type?: string; stockable_id?: number }) {
    const params: Record<string, string> = {};
    if (filters?.stockable_type) params.stockable_type = filters.stockable_type;
    if (filters?.stockable_id) params.stockable_id = String(filters.stockable_id);
    const res = await api.get("inventories", { searchParams: params, headers: authHeaders() });
    const body = await parseApiResponse<InventoryData[]>(res);
    return (body.data as InventoryData[]) ?? [];
  },

  async upsert(payload: UpsertInventoryPayload) {
    const res = await api.post("inventories", { json: payload, headers: authHeaders(), throwHttpErrors: false });
    return parseApiResponse<InventoryData>(res);
  },

  async update(uuid: string, payload: Partial<UpsertInventoryPayload>) {
    const res = await api.put(`inventories/${uuid}`, { json: payload, headers: authHeaders(), throwHttpErrors: false });
    return parseApiResponse(res);
  },

  async delete(uuid: string) {
    return parseApiResponse(await api.delete(`inventories/${uuid}`, { headers: authHeaders(), throwHttpErrors: false }));
  },
};
