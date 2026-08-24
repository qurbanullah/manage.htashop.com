import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Loader2, Package, ShoppingCart, Banknote, ClipboardList } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ordersApi } from "@/api/orders";
import { OverviewTab } from "@/components/orders/detail/tabs/OverviewTab";
import { ItemsTab } from "@/components/orders/detail/tabs/ItemsTab";
import { PaymentsTab } from "@/components/orders/detail/tabs/PaymentsTab";
import { OrderSidebar } from "@/components/orders/detail/sidebars/OrderSidebar";

type Tab = "overview" | "items" | "payments";

const TABS: { key: Tab; label: string; icon: typeof Package }[] = [
  { key: "overview", label: "Overview", icon: ClipboardList },
  { key: "items", label: "Items", icon: ShoppingCart },
  { key: "payments", label: "Payment", icon: Banknote },
];

export default function OrderDetailPage() {
  const { uuid } = useParams<{ uuid: string }>();
  const [activeTab, setActiveTab] = useState<Tab>("overview");

  const { data: order, isLoading, isError, refetch } = useQuery({
    queryKey: ["order", uuid],
    queryFn: () => ordersApi.get(uuid!),
    enabled: !!uuid,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (isError || !order) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Package className="mb-4 h-12 w-12 text-red-300 dark:text-red-600" />
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">Order not found</h3>
        <p className="mt-1 text-sm text-gray-500">The order you're looking for doesn't exist or has been removed.</p>
        <Link to="/orders" className="mt-4">
          <Button variant="outline" size="sm"><ArrowLeft className="mr-1 h-4 w-4" /> Back to Orders</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 lg:flex-row">
      {/* Main content */}
      <div className="min-w-0 flex-1 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link to="/orders" className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-300">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">{order.order_number}</h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {order.customer_name || "Guest"} &middot; {order.status_label} &middot; {order.currency} {Number(order.total_amount).toLocaleString()}
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 overflow-x-auto border-b border-gray-200 dark:border-gray-700">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`inline-flex shrink-0 items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? "border-blue-500 text-blue-600 dark:border-blue-400 dark:text-blue-400"
                  : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
              }`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="min-h-[300px]">
          {activeTab === "overview" && <OverviewTab order={order} />}
          {activeTab === "items" && <ItemsTab order={order} />}
          {activeTab === "payments" && <PaymentsTab order={order} />}
        </div>
      </div>

      {/* Right sidebar */}
      <OrderSidebar order={order} onUpdated={() => refetch()} />
    </div>
  );
}
