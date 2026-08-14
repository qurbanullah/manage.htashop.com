import api from "@/api/client";
import { authHeaders } from "@/lib/auth-header";
import { parseApiResponse } from "@/lib/api-response";

export interface SellerDashboardCounts {
  products: number;
  active_products: number;
  draft_products: number;
  variants: number;
  inventory_items: number;
  low_stock_items: number;
  total_stock: number;
  orders: number;
  revenue: number;
  average_order_value: number;
  orders_to_fulfill: number;
}

export interface SellerDashboardSummary {
  counts: SellerDashboardCounts;
  orders_by_status: Array<{ status: string; count: number }>;
  orders_by_day: Array<{ date: string; count: number }>;
  revenue_by_day: Array<{ date: string; revenue: number }>;
  recent_orders: Array<{
    id: number;
    uuid: string;
    order_number: string;
    customer_name: string | null;
    customer_email: string | null;
    status: string;
    total_amount: number;
    currency: string;
    created_at: string;
  }>;
}

export const dashboardApi = {
  async summary(): Promise<SellerDashboardSummary> {
    const res = await api.get("dashboard", { headers: authHeaders() });
    const body = await parseApiResponse<SellerDashboardSummary>(res);
    return (body.data as SellerDashboardSummary) ?? {
      counts: {} as SellerDashboardCounts,
    };
  },
};
