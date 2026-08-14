import api from "@/api/client";
import { authHeaders } from "@/lib/auth-header";
import { parseApiResponse } from "@/lib/api-response";

export interface DefinitionOption {
  id: number;
  name: string;
  code: string;
  metadata: Record<string, unknown> | null;
}

export interface Definition {
  id: number;
  uuid: string;
  name: string;
  code: string;
  kind: string;
  value_type: string;
  display_type: string | null;
  swatch_type: string | null;
  group_name: string | null;
  measurement_id: number | null;
  unit_id: number | null;
  is_required: boolean;
  is_filterable: boolean;
  options: DefinitionOption[];
}

export const definitionsApi = {
  async list(targetType?: string, kind?: string): Promise<Definition[]> {
    const params: Record<string, string> = {};
    if (targetType) params.target_type = targetType;
    if (kind) params.kind = kind;
    const res = await api.get("definitions", { searchParams: params, headers: authHeaders() });
    const body = await parseApiResponse<Definition[]>(res);
    return (body.data as Definition[]) ?? [];
  },
};
