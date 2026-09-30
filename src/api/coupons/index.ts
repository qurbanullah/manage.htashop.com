import api from "@/api/client";
import { authHeaders } from "@/lib/auth-header";
import { parseApiResponse } from "@/lib/api-response";

export type CouponScope = "global" | "tenant" | "organization";
export type CouponType = "fixed" | "percent";
export type CouponStatus = "active" | "inactive" | "scheduled" | "expired" | "exhausted";
export type CouponSortField =
  | "code"
  | "value"
  | "used_count"
  | "starts_at"
  | "ends_at"
  | "created_at";
export type CouponSortOrder = "asc" | "desc";

export interface Coupon {
  id: number;
  uuid: string;
  scope: CouponScope;
  tenant_id: number | null;
  organization_id: number | null;
  tenant_name: string | null;
  organization_name: string | null;
  code: string;
  label: string | null;
  type: CouponType;
  type_label: string;
  value: number;
  description: string;
  min_order_amount: number | null;
  max_discount_amount: number | null;
  starts_at: string | null;
  ends_at: string | null;
  usage_limit: number | null;
  per_user_limit: number | null;
  used_count: number;
  /** null means unlimited, not "none left". */
  remaining: number | null;
  is_active: boolean;
  status: CouponStatus;
  redemptions_count: number | null;
  created_at: string | null;
  updated_at: string | null;
}

/**
 * Only these keys are accepted by the API. Scope (`tenant_id` /
 * `organization_id`) is always derived from the caller's membership server-side
 * and must never be sent.
 */
export interface CouponPayload {
  code?: string;
  label?: string | null;
  type?: CouponType;
  value?: number;
  min_order_amount?: number | null;
  max_discount_amount?: number | null;
  starts_at?: string | null;
  ends_at?: string | null;
  usage_limit?: number | null;
  per_user_limit?: number | null;
  is_active?: boolean;
}

export interface CouponRedemption {
  id: number;
  uuid: string;
  code: string;
  amount: number;
  currency: string;
  order_uuid: string | null;
  order_number: string | null;
  user_name: string | null;
  user_email: string | null;
  guest: boolean;
  created_at: string | null;
}

export interface CouponPagination {
  total: number;
  count: number;
  per_page: number;
  current_page: number;
  last_page: number;
  from: number | null;
  to: number | null;
}

export interface CouponListData {
  data: Coupon[];
  pagination: CouponPagination;
}

export interface CouponRedemptionListData {
  data: CouponRedemption[];
  pagination: CouponPagination;
}

export interface CouponListParams {
  search?: string;
  type?: CouponType;
  is_active?: "0" | "1";
  page?: number;
  per_page?: number;
  sort?: CouponSortField;
  order?: CouponSortOrder;
}

export interface CouponRedemptionListParams {
  page?: number;
  per_page?: number;
}

export interface CouponStatistics {
  total: number;
  active: number;
  scheduled: number;
  expired: number;
  exhausted: number;
  redemptions: number;
}

export const COUPON_TYPE_OPTIONS: Array<{ value: CouponType; label: string }> = [
  { value: "fixed", label: "Fixed amount" },
  { value: "percent", label: "Percentage" },
];

export const COUPON_TYPE_FILTERS: Array<{ value: string; label: string }> = [
  { value: "", label: "All types" },
  ...COUPON_TYPE_OPTIONS,
];

export const COUPON_ACTIVE_FILTERS: Array<{ value: string; label: string }> = [
  { value: "", label: "All statuses" },
  { value: "1", label: "Active" },
  { value: "0", label: "Inactive" },
];

const EMPTY_PAGINATION: CouponPagination = {
  total: 0,
  count: 0,
  per_page: 15,
  current_page: 1,
  last_page: 1,
  from: null,
  to: null,
};

export const couponsApi = {
  async list(params: CouponListParams = {}): Promise<CouponListData> {
    const searchParams: Record<string, string> = {};
    if (params.search) searchParams.search = params.search;
    if (params.type) searchParams.type = params.type;
    if (params.is_active) searchParams.is_active = params.is_active;
    if (params.page) searchParams.page = String(params.page);
    if (params.per_page) searchParams.per_page = String(params.per_page);
    if (params.sort) searchParams.sort = params.sort;
    if (params.order) searchParams.order = params.order;

    const res = await api.get("coupons", {
      searchParams,
      headers: authHeaders(),
      throwHttpErrors: false,
    });
    const body = await parseApiResponse<CouponListData>(res);
    return (body.data as CouponListData) ?? { data: [], pagination: EMPTY_PAGINATION };
  },

  async statistics(): Promise<CouponStatistics> {
    const res = await api.get("coupons/statistics", {
      headers: authHeaders(),
      throwHttpErrors: false,
    });
    const body = await parseApiResponse<CouponStatistics>(res);
    return (
      (body.data as CouponStatistics) ?? {
        total: 0,
        active: 0,
        scheduled: 0,
        expired: 0,
        exhausted: 0,
        redemptions: 0,
      }
    );
  },

  async get(uuid: string): Promise<Coupon> {
    const res = await api.get(`coupons/${uuid}`, {
      headers: authHeaders(),
      throwHttpErrors: false,
    });
    const body = await parseApiResponse<Coupon>(res);
    return body.data as Coupon;
  },

  async create(payload: CouponPayload): Promise<Coupon> {
    const res = await api.post("coupons", {
      json: payload,
      headers: authHeaders(),
      throwHttpErrors: false,
    });
    const body = await parseApiResponse<Coupon>(res);
    return body.data as Coupon;
  },

  async update(uuid: string, payload: CouponPayload): Promise<Coupon> {
    const res = await api.patch(`coupons/${uuid}`, {
      json: payload,
      headers: authHeaders(),
      throwHttpErrors: false,
    });
    const body = await parseApiResponse<Coupon>(res);
    return body.data as Coupon;
  },

  async remove(uuid: string) {
    return parseApiResponse(
      await api.delete(`coupons/${uuid}`, {
        headers: authHeaders(),
        throwHttpErrors: false,
      }),
    );
  },

  async redemptions(
    uuid: string,
    params: CouponRedemptionListParams = {},
  ): Promise<CouponRedemptionListData> {
    const searchParams: Record<string, string> = {};
    if (params.page) searchParams.page = String(params.page);
    if (params.per_page) searchParams.per_page = String(params.per_page);

    const res = await api.get(`coupons/${uuid}/redemptions`, {
      searchParams,
      headers: authHeaders(),
      throwHttpErrors: false,
    });
    const body = await parseApiResponse<CouponRedemptionListData>(res);
    return (body.data as CouponRedemptionListData) ?? { data: [], pagination: EMPTY_PAGINATION };
  },
};
