import api from "@/api/client";
import { authHeaders } from "@/lib/auth-header";
import { parseApiResponse } from "@/lib/api-response";

export interface AddressData {
  id: number;
  uuid: string;
  addressable_type: string;
  addressable_id: number;
  type: string;
  label: string | null;
  contact_name: string | null;
  phone: string | null;
  email: string | null;
  address_line_1: string | null;
  address_line_2: string | null;
  city: string | null;
  city_id: number | null;
  state: string | null;
  state_code: string | null;
  postal_code: string | null;
  country_id: number | null;
  is_primary: boolean;
  created_at: string;
  updated_at: string;
  country?: { id: number; name: string; code: string } | null;
}

export interface AddressPayload {
  type?: string;
  label?: string;
  contact_name?: string;
  phone?: string;
  email?: string;
  address_line_1?: string;
  address_line_2?: string;
  city?: string;
  city_id?: number | null;
  state?: string;
  state_code?: string;
  postal_code?: string;
  country_id?: number | null;
  is_primary?: boolean;
}

export const addressesApi = {
  async list(addressableType?: "user" | "organization"): Promise<AddressData[]> {
    const searchParams: Record<string, string> = {};
    if (addressableType) searchParams.addressable_type = addressableType;
    const res = await api.get("users/me/addresses", {
      searchParams,
      headers: authHeaders(),
    });
    const body = await parseApiResponse<AddressData[]>(res);
    return (body.data as AddressData[]) ?? [];
  },

  async create(payload: AddressPayload, addressableType?: "user" | "organization") {
    const searchParams: Record<string, string> = {};
    if (addressableType) searchParams.addressable_type = addressableType;
    const res = await api.post("users/me/addresses", {
      searchParams,
      json: payload,
      headers: authHeaders(),
    });
    return parseApiResponse(res);
  },

  async update(uuid: string, payload: AddressPayload) {
    const res = await api.put(`addresses/${uuid}`, {
      json: payload,
      headers: authHeaders(),
    });
    return parseApiResponse(res);
  },

  async remove(uuid: string) {
    return parseApiResponse(
      await api.delete(`addresses/${uuid}`, {
        headers: authHeaders(),
        throwHttpErrors: false,
      }),
    );
  },

  async setPrimary(uuid: string) {
    const res = await api.post(`addresses/${uuid}/primary`, {
      headers: authHeaders(),
    });
    return parseApiResponse(res);
  },
};
