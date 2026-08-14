import api from "@/api/client";
import { authHeaders } from "@/lib/auth-header";
import { parseApiResponse } from "@/lib/api-response";

export interface Unit {
  id: number;
  uuid: string;
  name: string;
  code: string;
  symbol: string;
  measurement?: { id: number; name: string; code: string };
}

export const unitsApi = {
  async list(measurementCode?: string): Promise<Unit[]> {
    const params: Record<string, string> = {};
    if (measurementCode) params.measurement_code = measurementCode;
    const res = await api.get("units", { searchParams: params, headers: authHeaders() });
    const body = await parseApiResponse<Unit[]>(res);
    return (body.data as Unit[]) ?? [];
  },
};
