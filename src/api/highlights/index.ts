import api from "@/api/client";
import { authHeaders } from "@/lib/auth-header";
import { parseApiResponse } from "@/lib/api-response";

export interface ManageHighlight {
  id: number;
  uuid: string;
  label: string | null;
  heading: string | null;
  body: string;
  code: string | null;
  is_active: boolean;
  sort_order: number;
}

export interface ProductHighlightAssignment {
  highlight_id: number;
  heading_override?: string;
  body_override?: string;
  sort_order?: number;
}

export interface CreateHighlightPayload {
  body: string;
  heading?: string;
  label?: string;
  category_ids?: number[];
}

export const highlightsApi = {
  async list(categoryIds?: number[]): Promise<ManageHighlight[]> {
    const params: Record<string, string> = {};
    if (categoryIds?.length) {
      for (const id of categoryIds) params[`category_ids[]`] = String(id);
    }
    const res = await api.get("highlights", {
      searchParams: params,
      headers: authHeaders(),
    });
    const body = await parseApiResponse<{ data: ManageHighlight[] }>(res);
    return body.data?.data ?? [];
  },

  async create(payload: CreateHighlightPayload): Promise<ManageHighlight> {
    const res = await api.post("highlights", {
      json: payload,
      headers: authHeaders(),
    });
    const body = await parseApiResponse<ManageHighlight>(res);
    return body.data as ManageHighlight;
  },

  async productHighlights(uuid: string): Promise<ProductHighlightAssignment[]> {
    const res = await api.get(`products/${uuid}/highlights`, {
      headers: authHeaders(),
    });
    const body = await parseApiResponse<{ highlights: ProductHighlightAssignment[] }>(res);
    return body.data?.highlights ?? [];
  },

  async sync(uuid: string, highlights: ProductHighlightAssignment[]) {
    const res = await api.put(`products/${uuid}/highlights`, {
      json: { highlights },
      headers: authHeaders(),
      throwHttpErrors: false,
    });
    return parseApiResponse(res);
  },
};
