import api from "@/api/client";
import { authHeaders } from "@/lib/auth-header";
import { parseApiResponse } from "@/lib/api-response";

export interface VariantData {
  id: number;
  uuid: string;
  product_id: number;
  name: string;
  slug: string;
  sku?: string | null;
  seller_sku?: string | null;
  status: string;
  summary: string | null;
  description: string | null;
  configuration: Record<string, unknown> | null;
  is_default: boolean;
  is_active: boolean;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface CreateVariantPayload {
  product_id?: number;
  name: string;
  slug?: string;
  seller_sku?: string;
  summary?: string;
  description?: string;
  configuration?: Record<string, unknown>;
  is_default?: boolean;
  metadata?: Record<string, unknown>;
}

export const variantsApi = {
  async list(productId?: number) {
    const params: Record<string, string> = {};
    if (productId) params.product_id = String(productId);
    const res = await api.get("variants", { searchParams: params, headers: authHeaders() });
    return parseApiResponse<VariantData[]>(res);
  },

  async create(payload: CreateVariantPayload) {
    const res = await api.post("variants", { json: payload, headers: authHeaders(), throwHttpErrors: false });
    return parseApiResponse<VariantData>(res);
  },

  async update(uuid: string, payload: Partial<CreateVariantPayload>) {
    const res = await api.put(`variants/${uuid}`, { json: payload, headers: authHeaders(), throwHttpErrors: false });
    return parseApiResponse(res);
  },

  async delete(uuid: string) {
    return parseApiResponse(await api.delete(`variants/${uuid}`, { headers: authHeaders(), throwHttpErrors: false }));
  },
};
