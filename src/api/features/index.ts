import api from "@/api/client";
import { authHeaders } from "@/lib/auth-header";
import { parseApiResponse } from "@/lib/api-response";

export interface Feature {
  id: number;
  name: string;
  slug: string;
}

export const featuresApi = {
  async list(categoryId?: number): Promise<Feature[]> {
    const params: Record<string, string> = {};
    if (categoryId) params.category_id = String(categoryId);
    const res = await api.get("features", { searchParams: params, headers: authHeaders() });
    const body = await parseApiResponse<Feature[]>(res);
    return (body.data as Feature[]) ?? [];
  },
};
