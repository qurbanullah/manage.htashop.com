import api from "@/api/client";
import { authHeaders } from "@/lib/auth-header";
import { parseApiResponse } from "@/lib/api-response";

export interface Brand {
  id: number;
  uuid: string;
  manufacturer_id?: number | null;
  name: string;
  slug: string;
  origin?: string;
  is_approved?: boolean;
  approved_at?: string | null;
  rejected_at?: string | null;
  rejection_reason?: string | null;
  logo?: string | null;
  website?: string | null;
  description?: string | null;
  is_active: boolean;
  manufacturer?: { id: number; uuid: string; name: string; slug: string } | null;
}

export type BrandPayload = Partial<
  Omit<Brand, "id" | "uuid" | "slug" | "manufacturer">
>;

export const brandsApi = {
  async list(manufacturerId?: number, search?: string, includeInactive = false): Promise<Brand[]> {
    const params: Record<string, string> = {};
    if (manufacturerId) params.manufacturer_id = String(manufacturerId);
    if (search) params.search = search;
    if (includeInactive) params.include_inactive = "1";
    const res = await api.get("brands", {
      searchParams: params,
      headers: authHeaders(),
    });
    const body = await parseApiResponse<Brand[]>(res);
    return (body.data as Brand[]) ?? [];
  },

  async create(payload: BrandPayload) {
    const res = await api.post("brands", {
      json: payload,
      headers: authHeaders(),
      throwHttpErrors: false,
    });
    return parseApiResponse(res);
  },

  async update(uuid: string, payload: BrandPayload) {
    const res = await api.put(`brands/${uuid}`, {
      json: payload,
      headers: authHeaders(),
      throwHttpErrors: false,
    });
    return parseApiResponse(res);
  },

  async delete(uuid: string) {
    return parseApiResponse(
      await api.delete(`brands/${uuid}`, {
        headers: authHeaders(),
        throwHttpErrors: false,
      }),
    );
  },
};
