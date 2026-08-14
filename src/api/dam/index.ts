import api from "@/api/client";
import { authHeaders } from "@/lib/auth-header";
import { parseApiResponse } from "@/lib/api-response";

export interface IngestPayload {
  damable_type: string;
  damable_id: number;
  file_name: string;
  object_key: string;
  mime_type: string;
  collection_name?: string;
  bucket?: string;
  metadata?: Record<string, unknown>;
}

export interface DamAsset {
  id: number;
  uuid: string;
  damable_type: string;
  damable_id: number;
  collection_name: string;
  sort_order: number | null;
  file_name: string;
  disk: string;
  bucket: string;
  object_key: string;
  mime_type: string;
  size: number;
  origin_url: string | null;
  is_current: boolean;
  version: number;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export const damApi = {
  async ingest(payload: IngestPayload) {
    const res = await api.post("dam/ingest", {
      json: payload,
      headers: authHeaders(),
      throwHttpErrors: false,
    });
    return parseApiResponse(res);
  },

  async getAssets(damableType: string, damableId: number, collectionName?: string) {
    const res = await api.get("dam/assets", {
      searchParams: {
        damable_type: damableType,
        damable_id: damableId,
        ...(collectionName ? { collection_name: collectionName } : {}),
      },
      headers: authHeaders(),
    });
    return parseApiResponse(res);
  },

  async delete(id: number) {
    const res = await api.delete(`dam/${id}`, {
      headers: authHeaders(),
      throwHttpErrors: false,
    });
    return parseApiResponse(res);
  },
};
