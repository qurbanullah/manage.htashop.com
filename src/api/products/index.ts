import api from "@/api/client";
import { authHeaders } from "@/lib/auth-header";
import { parseApiResponse, type ApiResponse } from "@/lib/api-response";

export interface ProductData {
  id: number;
  uuid: string;
  name: string;
  slug: string;
  route_key: string;
  sku: string | null;
  seller_sku?: string | null;
  part_number: string | null;
  hs_code: string | null;
  unspsc: string | null;
  ntn: string | null;
  barcode: string | null;
  model_number: string | null;
  status: string;
  summary: string | null;
  description: string | null;
  is_active: boolean;
  image_url?: string | null;
  price?: number | string | null;
  sale_price?: number | string | null;
  currency?: string | null;
  tenant_id: number;
  organization_id: number;
  categories?: Array<{ id: number; name: string; slug: string }>;
  tags?: Array<{ id: number; name: string; slug: string }>;
  features?: Array<{ id: number; name: string; slug: string }>;
  manufacturers?: Array<{ id: number; uuid: string; name: string; slug: string; code?: string | null; type?: string }>;
  brands?: Array<{ id: number; uuid: string; name: string; slug: string; manufacturer_id?: number | null }>;
  variants?: Array<{ id: number; uuid: string; name: string; sku?: string | null }>;
  metadata?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface CreateProductPayload {
  name: string;
  slug?: string;
  seller_sku?: string;
  part_number?: string;
  hs_code?: string;
  unspsc?: string;
  ntn?: string;
  barcode?: string;
  model_number?: string;
  summary?: string;
  description?: string;
  category_ids?: number[];
  feature_ids?: number[];
  features?: string[];
  manufacturer_ids?: number[];
  brand_ids?: number[];
  is_active?: boolean;
  status?: string;
  metadata?: Record<string, unknown>;
}

export const productsApi = {
  async create(payload: CreateProductPayload): Promise<ApiResponse<ProductData>> {
    const res = await api.post("products", {
      json: payload,
      headers: authHeaders(),
      throwHttpErrors: false,
    });
    return parseApiResponse<ProductData>(res);
  },

  async list(params?: Record<string, string | number>) {
    const res = await api.get("products", {
      searchParams: params,
      headers: authHeaders(),
    });
    return parseApiResponse(res);
  },

  async get(uuid: string) {
    const res = await api.get(`products/${uuid}`, { headers: authHeaders() });
    return parseApiResponse(res);
  },

  async update(uuid: string, payload: Partial<CreateProductPayload>) {
    const res = await api.put(`products/${uuid}`, {
      json: payload,
      headers: authHeaders(),
      throwHttpErrors: false,
    });
    return parseApiResponse(res);
  },

  async delete(uuid: string) {
    const res = await api.delete(`products/${uuid}`, { headers: authHeaders(), throwHttpErrors: false });
    return parseApiResponse(res);
  },
};
