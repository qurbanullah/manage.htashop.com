import api from "@/api/client";
import { authHeaders } from "@/lib/auth-header";
import { parseApiResponse } from "@/lib/api-response";

export interface OrderTransaction {
  uuid: string;
  type: string;
  amount: number;
  currency: string;
  status: string;
  fee_amount: number | null;
  net_amount: number | null;
  gateway_transaction_id: string | null;
  created_at: string | null;
}

export interface OrderPayment {
  id: number;
  uuid: string;
  payment_method: string;
  payment_method_label: string;
  status: string;
  amount: number;
  currency: string;
  transaction_reference: string | null;
  transactions?: OrderTransaction[];
}

export interface OrderItem {
  id: number;
  uuid: string;
  product_id: number | null;
  variant_id: number | null;
  name: string;
  sku: string | null;
  quantity: number;
  unit_price: number;
  base_price: number | null;
  total: number;
  currency: string;
  image_url: string | null;
}

export interface OrderAddress {
  label: string | null;
  contact_name: string | null;
  phone: string | null;
  address_line_1: string | null;
  address_line_2: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  country: string | null;
}

export interface Order {
  id: number;
  uuid: string;
  order_number: string;
  status: string;
  status_label: string;
  source: string;
  customer_name: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  subtotal: number;
  shipping_fee: number;
  tax: number;
  discount: number;
  total_amount: number;
  currency: string;
  shipping_address: OrderAddress | null;
  billing_address: OrderAddress | null;
  notes: string | null;
  placed_at: string | null;
  items: OrderItem[];
  payment: OrderPayment[] | null;
}

export interface OrderListResponse {
  data: Order[];
  meta: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from: number | null;
    to: number | null;
  };
}

export interface OrderListParams {
  search?: string;
  status?: string;
  payment_status?: string;
  page?: number;
  per_page?: number;
}

export const ORDER_STATUSES = [
  { value: "", label: "All statuses" },
  { value: "pending", label: "Pending" },
  { value: "confirmed", label: "Confirmed" },
  { value: "processing", label: "Processing" },
  { value: "shipped", label: "Shipped" },
  { value: "delivered", label: "Delivered" },
  { value: "cancelled", label: "Cancelled" },
  { value: "refunded", label: "Refunded" },
];

export const PAYMENT_STATUSES = [
  { value: "", label: "All payments" },
  { value: "pending", label: "Pending" },
  { value: "paid", label: "Paid" },
  { value: "authorized", label: "Authorized" },
  { value: "failed", label: "Failed" },
  { value: "refunded", label: "Refunded" },
];

export interface OrderDocument {
  id: number;
  uuid: string;
  type: string;
  filename: string;
  mime: string;
  download_url: string | null;
  created_at: string | null;
}

export const ordersApi = {
  async list(params: OrderListParams = {}): Promise<OrderListResponse> {
    const searchParams: Record<string, string> = {};
    if (params.search) searchParams.search = params.search;
    if (params.status) searchParams.status = params.status;
    if (params.payment_status) searchParams.payment_status = params.payment_status;
    if (params.page) searchParams.page = String(params.page);
    if (params.per_page) searchParams.per_page = String(params.per_page);

    const res = await api.get("orders", {
      searchParams,
      headers: authHeaders(),
      throwHttpErrors: false,
    });
    const body = await parseApiResponse<OrderListResponse>(res);
    return (body.data as OrderListResponse) ?? {
      data: [],
      meta: { current_page: 1, last_page: 1, per_page: 20, total: 0, from: null, to: null },
    };
  },

  async get(uuid: string): Promise<Order> {
    const res = await api.get(`orders/${uuid}`, { headers: authHeaders() });
    const body = await parseApiResponse<Order>(res);
    return body.data as Order;
  },

  async updateStatus(uuid: string, status: string): Promise<Order> {
    const res = await api.put(`orders/${uuid}/status`, {
      json: { status },
      headers: authHeaders(),
      throwHttpErrors: false,
    });
    const body = await parseApiResponse<Order>(res);
    return body.data as Order;
  },

  async documents(uuid: string): Promise<OrderDocument[]> {
    const res = await api.get(`orders/${uuid}/documents`, {
      headers: authHeaders(),
      throwHttpErrors: false,
    });
    const body = await parseApiResponse<OrderDocument[]>(res);
    return (body.data as OrderDocument[]) ?? [];
  },

  async generateDocument(uuid: string, type: "invoice" | "packing_slip"): Promise<OrderDocument> {
    const res = await api.post(`orders/${uuid}/documents`, {
      json: { type },
      headers: authHeaders(),
      throwHttpErrors: false,
    });
    const body = await parseApiResponse<OrderDocument>(res);
    return body.data as OrderDocument;
  },
};
