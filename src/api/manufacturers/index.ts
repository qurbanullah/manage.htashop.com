import api from "@/api/client";
import { authHeaders } from "@/lib/auth-header";
import { parseApiResponse } from "@/lib/api-response";

export interface Manufacturer {
  id: number;
  uuid: string;
  name: string;
  slug: string;
  code?: string | null;
  type?: string;
  origin?: string;
  is_approved?: boolean;
  approved_at?: string | null;
  rejected_at?: string | null;
  rejection_reason?: string | null;
  logo?: string | null;
  website?: string | null;
  country?: string | null;
  description?: string | null;
  is_active: boolean;
}

export type ManufacturerPayload = Partial<
  Omit<Manufacturer, "id" | "uuid" | "slug">
>;

export const manufacturersApi = {
  async list(search?: string, includeInactive = false): Promise<Manufacturer[]> {
    const params: Record<string, string> = {};
    if (search) params.search = search;
    if (includeInactive) params.include_inactive = "1";
    const res = await api.get("manufacturers", {
      searchParams: params,
      headers: authHeaders(),
    });
    const body = await parseApiResponse<Manufacturer[]>(res);
    return (body.data as Manufacturer[]) ?? [];
  },

  async create(payload: ManufacturerPayload) {
    const res = await api.post("manufacturers", {
      json: payload,
      headers: authHeaders(),
      throwHttpErrors: false,
    });
    return parseApiResponse(res);
  },

  async update(uuid: string, payload: ManufacturerPayload) {
    const res = await api.put(`manufacturers/${uuid}`, {
      json: payload,
      headers: authHeaders(),
      throwHttpErrors: false,
    });
    return parseApiResponse(res);
  },

  async delete(uuid: string) {
    return parseApiResponse(
      await api.delete(`manufacturers/${uuid}`, {
        headers: authHeaders(),
        throwHttpErrors: false,
      }),
    );
  },
};
