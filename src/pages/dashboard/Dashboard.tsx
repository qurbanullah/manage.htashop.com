import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  Package,
  Layers,
  AlertTriangle,
  Boxes,
  ShoppingCart,
  DollarSign,
  ReceiptText,
  Clock,
  RefreshCw,
  Inbox,
  ArrowRight,
} from "lucide-react";
import {
  ResponsiveContainer,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
} from "recharts";
import { useAuth } from "@/hooks/auth/useAuth";
import { dashboardApi } from "@/api/dashboard";
import { StatsCard } from "@/components/ui/stats-card";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { paths } from "@/routes/paths";

const PIE_COLORS = ["#10b981", "#3b82f6", "#8b5cf6", "#14b8a6", "#f59e0b", "#ef4444", "#6b7280"];

const ORDER_STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  processing: "Processing",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
  refunded: "Refunded",
};

const ORDER_STATUS_COLORS: Record<string, string> = {
  pending: "#f59e0b",
  confirmed: "#3b82f6",
  processing: "#8b5cf6",
  shipped: "#14b8a6",
  delivered: "#10b981",
  cancelled: "#ef4444",
  refunded: "#6b7280",
};

function currency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function statusColor(status: string, index: number) {
  return ORDER_STATUS_COLORS[status] ?? PIE_COLORS[index % PIE_COLORS.length];
}

export default function Dashboard() {
  const { user } = useAuth();
  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => dashboardApi.summary(),
    staleTime: 60 * 1000,
  });

  const counts = data?.counts;
  const byStatus = data?.orders_by_status ?? [];
  const ordersByDay = data?.orders_by_day ?? [];
  const revenueByDay = data?.revenue_by_day ?? [];
  const recentOrders = data?.recent_orders ?? [];

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
          <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">Loading dashboard…</p>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
        <Inbox className="h-12 w-12 text-red-300 dark:text-red-600" />
        <h2 className="mt-4 text-lg font-semibold text-gray-900 dark:text-white">Failed to load dashboard</h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Please try again.</p>
        <Button variant="outline" className="mt-4" onClick={() => refetch()}>
          <RefreshCw className="mr-1.5 h-4 w-4" />
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {user?.name ? `Welcome back, ${user.name}` : "Dashboard"}
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Orders, revenue, and catalog performance at a glance
          </p>
        </div>
        <Button variant="outline" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw className={`mr-1.5 h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* KPI cards — orders */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Total Orders"
          value={counts?.orders ?? 0}
          icon={ShoppingCart}
          iconClassName="bg-blue-100 dark:bg-blue-900/30 [&>svg]:text-blue-600 dark:[&>svg]:text-blue-400"
          description="All time"
        />
        <StatsCard
          title="Revenue"
          value={currency(counts?.revenue ?? 0)}
          icon={DollarSign}
          iconClassName="bg-emerald-100 dark:bg-emerald-900/30 [&>svg]:text-emerald-600 dark:[&>svg]:text-emerald-400"
          description="Total sales"
        />
        <StatsCard
          title="Avg Order Value"
          value={currency(counts?.average_order_value ?? 0)}
          icon={ReceiptText}
          iconClassName="bg-violet-100 dark:bg-violet-900/30 [&>svg]:text-violet-600 dark:[&>svg]:text-violet-400"
          description="Per order"
        />
        <StatsCard
          title="To Fulfill"
          value={counts?.orders_to_fulfill ?? 0}
          icon={Clock}
          iconClassName="bg-amber-100 dark:bg-amber-900/30 [&>svg]:text-amber-600 dark:[&>svg]:text-amber-400"
          description="Pending · Confirmed · Processing"
        />
      </div>

      {/* KPI cards — catalog & inventory */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Total Products"
          value={counts?.products ?? 0}
          icon={Package}
          iconClassName="bg-sky-100 dark:bg-sky-900/30 [&>svg]:text-sky-600 dark:[&>svg]:text-sky-400"
          description={`${counts?.active_products ?? 0} active · ${counts?.draft_products ?? 0} draft`}
        />
        <StatsCard
          title="Total Variants"
          value={counts?.variants ?? 0}
          icon={Layers}
          iconClassName="bg-indigo-100 dark:bg-indigo-900/30 [&>svg]:text-indigo-600 dark:[&>svg]:text-indigo-400"
          description="Across all products"
        />
        <StatsCard
          title="Low Stock"
          value={counts?.low_stock_items ?? 0}
          icon={AlertTriangle}
          iconClassName="bg-red-100 dark:bg-red-900/30 [&>svg]:text-red-600 dark:[&>svg]:text-red-400"
          description={`${counts?.low_stock_items ?? 0} of ${counts?.inventory_items ?? 0} SKUs`}
        />
        <StatsCard
          title="Total Stock"
          value={counts?.total_stock ?? 0}
          icon={Boxes}
          iconClassName="bg-teal-100 dark:bg-teal-900/30 [&>svg]:text-teal-600 dark:[&>svg]:text-teal-400"
          description="Units on hand"
        />
      </div>

      {/* Orders & revenue trend */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Orders</CardTitle>
            <CardDescription>Last 30 days</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              {ordersByDay.length === 0 ? (
                <div className="flex h-full items-center justify-center text-sm text-gray-400">No data</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={ordersByDay} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="ordersGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                    <XAxis dataKey="date" tick={{ fill: "#9ca3af", fontSize: 12 }} tickFormatter={(v: string) => v.slice(5)} />
                    <YAxis allowDecimals={false} tick={{ fill: "#9ca3af", fontSize: 12 }} width={28} />
                    <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #e5e7eb" }} />
                    <Area type="monotone" dataKey="count" name="Orders" stroke="#3b82f6" strokeWidth={2} fill="url(#ordersGradient)" />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Revenue</CardTitle>
            <CardDescription>Last 30 days</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              {revenueByDay.length === 0 ? (
                <div className="flex h-full items-center justify-center text-sm text-gray-400">No data</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={revenueByDay} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                    <XAxis dataKey="date" tick={{ fill: "#9ca3af", fontSize: 12 }} tickFormatter={(v: string) => v.slice(5)} />
                    <YAxis tick={{ fill: "#9ca3af", fontSize: 12 }} width={40} tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`} />
                    <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #e5e7eb" }} formatter={(value) => currency(Number(value))} />
                    <Area type="monotone" dataKey="revenue" name="Revenue" stroke="#10b981" strokeWidth={2} fill="url(#revenueGradient)" />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Orders by status + recent orders */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Orders by Status</CardTitle>
            <CardDescription>Current pipeline</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-56">
              {byStatus.length === 0 ? (
                <div className="flex h-full items-center justify-center text-sm text-gray-400">No data</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={byStatus} dataKey="count" nameKey="status" cx="50%" cy="50%" outerRadius={75} innerRadius={38}>
                      {byStatus.map((s, i) => (
                        <Cell key={s.status} fill={statusColor(s.status, i)} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value, name) => [value, ORDER_STATUS_LABELS[String(name)] ?? String(name)]}
                      contentStyle={{ borderRadius: 8, border: "1px solid #e5e7eb" }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {byStatus.map((s, i) => (
                <span key={s.status} className="inline-flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-300">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: statusColor(s.status, i) }} />
                  {ORDER_STATUS_LABELS[s.status] ?? s.status} ({s.count})
                </span>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base">Latest Orders</CardTitle>
              <CardDescription>Most recent transactions</CardDescription>
            </div>
            <Link to={paths.orders} className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline dark:text-blue-400">
              View all <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </CardHeader>
          <CardContent>
            {recentOrders.length === 0 ? (
              <p className="py-6 text-center text-sm text-gray-400">No orders yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-gray-200 dark:border-gray-700">
                    <tr className="text-xs uppercase tracking-wide text-gray-400">
                      <th className="px-3 py-2 font-medium">Order</th>
                      <th className="px-3 py-2 font-medium">Customer</th>
                      <th className="px-3 py-2 font-medium">Status</th>
                      <th className="px-3 py-2 font-medium text-right">Amount</th>
                      <th className="px-3 py-2 font-medium">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {recentOrders.map((o) => (
                      <tr key={o.uuid} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                        <td className="px-3 py-2.5 font-medium text-gray-900 dark:text-white">{o.order_number}</td>
                        <td className="px-3 py-2.5">
                          <div className="font-medium text-gray-900 dark:text-white">{o.customer_name ?? "—"}</div>
                          {o.customer_email && <div className="text-xs text-gray-400">{o.customer_email}</div>}
                        </td>
                        <td className="px-3 py-2.5">
                          <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium" style={{
                            backgroundColor: `${ORDER_STATUS_COLORS[o.status] ?? "#6b7280"}1a`,
                            color: ORDER_STATUS_COLORS[o.status] ?? "#6b7280",
                          }}>
                            {ORDER_STATUS_LABELS[o.status] ?? o.status}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-right font-medium text-gray-900 dark:text-white">
                          {currency(o.total_amount)}
                        </td>
                        <td className="px-3 py-2.5 text-gray-500 dark:text-gray-400">
                          {new Date(o.created_at).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
