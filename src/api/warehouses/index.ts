import api from "@/api/client";
import { authHeaders } from "@/lib/auth-header";
import { parseApiResponse } from "@/lib/api-response";

export interface Warehouse {
  id: number;
  uuid: string;
  name: string;
  code: string | null;
  slug: string;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  address_line_1: string | null;
  address_line_2: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  country: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type WarehousePayload = Partial<Omit<Warehouse, "id" | "uuid" | "created_at" | "updated_at">>;

export const warehousesApi = {
  async list(search?: string): Promise<Warehouse[]> {
    const params: Record<string, string> = {};
    if (search) params.search = search;
    const res = await api.get("warehouses", { searchParams: params, headers: authHeaders() });
    const body = await parseApiResponse<Warehouse[]>(res);
    return (body.data as Warehouse[]) ?? [];
  },

  async create(payload: WarehousePayload) {
    const res = await api.post("warehouses", { json: payload, headers: authHeaders(), throwHttpErrors: false });
    return parseApiResponse(res);
  },

  async update(uuid: string, payload: WarehousePayload) {
    const res = await api.put(`warehouses/${uuid}`, { json: payload, headers: authHeaders(), throwHttpErrors: false });
    return parseApiResponse(res);
  },

  async delete(uuid: string) {
    return parseApiResponse(await api.delete(`warehouses/${uuid}`, { headers: authHeaders(), throwHttpErrors: false }));
  },
};
