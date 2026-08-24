import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { X, ShoppingCart, Eye } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { DataTable, type Column } from "@/components/ui/data-table";
import {
  ordersApi,
  ORDER_STATUSES,
  PAYMENT_STATUSES,
  type Order,
} from "@/api/orders";

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    pending: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
    confirmed: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
    processing: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300",
    shipped: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300",
    delivered: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
    cancelled: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
    refunded: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
  };
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${styles[status] ?? "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300"}`}>
      {status}
    </span>
  );
}

function PaymentBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    paid: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
    pending: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
    authorized: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
    failed: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
    refunded: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
  };
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${styles[status] ?? "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300"}`}>
      {status}
    </span>
  );
}

function formatMoney(value: number, currency: string) {
  return `${currency} ${Number(value).toLocaleString()}`;
}

export default function OrdersPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [status, setStatus] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("");
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ["orders", debouncedSearch, status, paymentStatus, page],
    queryFn: () =>
      ordersApi.list({
        search: debouncedSearch || undefined,
        status: status || undefined,
        payment_status: paymentStatus || undefined,
        page,
        per_page: 20,
      }),
  });

  const orders = data?.data ?? [];
  const meta = data?.meta;

  const hasFilters = Boolean(debouncedSearch || status || paymentStatus);

  const clearFilters = () => {
    setSearch("");
    setDebouncedSearch("");
    setStatus("");
    setPaymentStatus("");
    setPage(1);
  };

  const columns: Column<Order>[] = useMemo(
    () => [
      {
        key: "order_number",
        label: "Order",
        render: (value: string, row: Order) => (
          <div>
            <p className="font-medium text-gray-900 dark:text-white">{value}</p>
            <p className="text-xs text-gray-400">
              {row.placed_at ? new Date(row.placed_at).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }) : "—"}
            </p>
          </div>
        ),
      },
      {
        key: "customer_name",
        label: "Customer",
        render: (value: string | null, row: Order) => (
          <div>
            <p className="text-gray-900 dark:text-white">{value || "—"}</p>
            {row.customer_email && <p className="text-xs text-gray-400">{row.customer_email}</p>}
          </div>
        ),
      },
      {
        key: "items",
        label: "Items",
        render: (_: unknown, row: Order) => <span>{row.items.length}</span>,
        className: "text-center",
      },
      {
        key: "total_amount",
        label: "Total",
        render: (value: number, row: Order) => (
          <span className="font-semibold text-gray-900 dark:text-white">{formatMoney(value, row.currency)}</span>
        ),
      },
      {
        key: "payment",
        label: "Payment",
        render: (_: unknown, row: Order) => {
          const payment = row.payment?.[0];
          return payment ? (
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">{payment.payment_method_label}</p>
              <PaymentBadge status={payment.status} />
            </div>
          ) : (
            <span className="text-gray-400">—</span>
          );
        },
      },
      {
        key: "status",
        label: "Status",
        render: (value: string) => <StatusBadge status={value} />,
      },
    ],
    [],
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Orders</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Track your orders and fulfillment
          </p>
        </div>
      </div>

      {/* Search & filters */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-3 lg:flex-row">
          <div className="relative flex-1">
            <Input
              autoComplete="off"
              spellCheck={false}
              placeholder="Search order number, customer, email..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                const value = e.target.value;
                window.clearTimeout((window as unknown as { __ordersSearchTimer?: number }).__ordersSearchTimer);
                (window as unknown as { __ordersSearchTimer?: number }).__ordersSearchTimer = window.setTimeout(() => {
                  setDebouncedSearch(value);
                  setPage(1);
                }, 400);
              }}
              className="h-10 pl-3"
            />
          </div>

          <select
            value={status}
            onChange={(e) => { setStatus(e.target.value); setPage(1); }}
            className="h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 lg:w-52"
          >
            {ORDER_STATUSES.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>

          <select
            value={paymentStatus}
            onChange={(e) => { setPaymentStatus(e.target.value); setPage(1); }}
            className="h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 lg:w-52"
          >
            {PAYMENT_STATUSES.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>

          {hasFilters && (
            <Button variant="ghost" onClick={clearFilters} className="inline-flex items-center gap-2">
              <X className="h-4 w-4" />
              Clear
            </Button>
          )}
        </div>
      </div>

      {/* Table / empty state */}
      {!isLoading && orders.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
          <EmptyState
            icon={ShoppingCart}
            title={hasFilters ? "No orders match your filters" : "No orders yet"}
            description={
              hasFilters
                ? "Try adjusting or clearing your filters."
                : "Orders will appear here once customers start placing orders through your storefront."
            }
            action={hasFilters ? { label: "Clear filters", onClick: clearFilters } : undefined}
          />
        </div>
      ) : (
        <DataTable
          data={orders}
          columns={columns}
          loading={isLoading}
          currentPage={meta?.current_page ?? 1}
          totalPages={meta?.last_page ?? 1}
          pageSize={meta?.per_page ?? 20}
          totalItems={meta?.total}
          onPageChange={setPage}
          emptyMessage="No orders found"
          getRowId={(row) => row.uuid}
          actions={(row) => (
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(`/orders/${row.uuid}`)}
              className="inline-flex items-center gap-1"
            >
              <Eye className="h-3.5 w-3.5" />
              View
            </Button>
          )}
        />
      )}
    </div>
  );
}
