import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, CheckCircle2, Truck, PackageCheck, XCircle, RotateCcw, FileText, FileBox, Download, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/Toaster";
import { isApiError } from "@/lib/api-response";
import { ordersApi, type Order } from "@/api/orders";

interface Props {
  order: Order;
  onUpdated: () => void;
}

const STATUS_ACTIONS = [
  { status: "confirmed", label: "Confirm order", icon: CheckCircle2, variant: "outline" as const },
  { status: "processing", label: "Start processing", icon: PackageCheck, variant: "outline" as const },
  { status: "shipped", label: "Mark as shipped", icon: Truck, variant: "outline" as const },
  { status: "delivered", label: "Mark as delivered", icon: PackageCheck, variant: "outline" as const },
  { status: "cancelled", label: "Cancel order", icon: XCircle, variant: "outline" as const },
  { status: "refunded", label: "Mark as refunded", icon: RotateCcw, variant: "outline" as const },
];

export function OrderSidebar({ order, onUpdated }: Props) {
  const { success: showSuccess, error: showError } = useToast();
  const [updating, setUpdating] = useState<string | null>(null);
  const [generating, setGenerating] = useState<string | null>(null);

  const { data: documents = [], refetch: refetchDocuments } = useQuery({
    queryKey: ["order-documents", order.uuid],
    queryFn: () => ordersApi.documents(order.uuid),
  });

  const handleUpdate = async (status: string) => {
    setUpdating(status);
    try {
      await ordersApi.updateStatus(order.uuid, status);
      showSuccess(`Order ${status}`);
      onUpdated();
    } catch (e) {
      showError(isApiError(e) ? e.message : "Failed to update order");
    } finally {
      setUpdating(null);
    }
  };

  const handleGenerate = async (type: "invoice" | "packing_slip") => {
    setGenerating(type);
    try {
      const document = await ordersApi.generateDocument(order.uuid, type);
      showSuccess(`${type === "invoice" ? "Invoice" : "Packing slip"} generated`);
      await refetchDocuments();
      if (document.download_url) {
        window.open(document.download_url, "_blank", "noopener,noreferrer");
      }
    } catch (e) {
      showError(isApiError(e) ? e.message : "Failed to generate document");
    } finally {
      setGenerating(null);
    }
  };

  const currentIndex = STATUS_ACTIONS.findIndex((a) => a.status === order.status);

  return (
    <div className="w-64 shrink-0 space-y-4">
      {/* Summary */}
      <div className="rounded-xl border border-gray-200 p-4 dark:border-gray-700">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Order</h3>
        <p className="mt-1 font-mono text-sm text-gray-700 dark:text-gray-300">{order.order_number}</p>
        <div className="mt-3 space-y-1 text-sm text-gray-500 dark:text-gray-400">
          <div className="flex justify-between">
            <span>Status</span>
            <span className="font-medium capitalize text-gray-900 dark:text-white">{order.status_label}</span>
          </div>
          <div className="flex justify-between">
            <span>Total</span>
            <span className="font-medium text-gray-900 dark:text-white">
              {order.currency} {Number(order.total_amount).toLocaleString()}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Placed</span>
            <span className="font-medium text-gray-900 dark:text-white">
              {order.placed_at ? new Date(order.placed_at).toLocaleDateString() : "—"}
            </span>
          </div>
        </div>
      </div>

      {/* Documents */}
      <div className="rounded-xl border border-gray-200 p-4 dark:border-gray-700">
        <h3 className="mb-3 text-sm font-semibold text-gray-900 dark:text-white">Documents</h3>
        <div className="space-y-2">
          <Button
            variant="outline"
            size="sm"
            disabled={generating !== null}
            onClick={() => handleGenerate("invoice")}
            className="w-full justify-start"
          >
            {generating === "invoice" ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
            {generating === "invoice" ? "Generating…" : "Generate invoice"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={generating !== null}
            onClick={() => handleGenerate("packing_slip")}
            className="w-full justify-start"
          >
            {generating === "packing_slip" ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileBox className="h-4 w-4" />}
            {generating === "packing_slip" ? "Generating…" : "Generate packing slip"}
          </Button>

          {documents.length > 0 && (
            <div className="space-y-1 border-t border-gray-100 pt-2 dark:border-gray-800">
              {documents.map((document) => (
                <a
                  key={document.uuid}
                  href={document.download_url ?? "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between rounded-lg px-2 py-1.5 text-xs text-gray-600 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800"
                >
                  <span className="flex items-center gap-1.5">
                    {document.type === "invoice" ? <FileText className="h-3.5 w-3.5" /> : <FileBox className="h-3.5 w-3.5" />}
                    {document.type === "invoice" ? "Invoice" : "Packing slip"}
                  </span>
                  <span className="flex items-center gap-1 text-gray-400">
                    <Download className="h-3.5 w-3.5" />
                    <ExternalLink className="h-3 w-3" />
                  </span>
                </a>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Status actions */}
      <div className="rounded-xl border border-gray-200 p-4 dark:border-gray-700">
        <h3 className="mb-3 text-sm font-semibold text-gray-900 dark:text-white">Fulfillment</h3>
        <div className="space-y-2">
          {STATUS_ACTIONS.map((action) => {
            const isCurrent = action.status === order.status;
            const isPast = currentIndex !== -1 && STATUS_ACTIONS.findIndex((a) => a.status === action.status) < currentIndex;
            const disabled = isCurrent || isPast || order.status === "cancelled" || order.status === "refunded";
            return (
              <Button
                key={action.status}
                variant={action.variant}
                size="sm"
                disabled={disabled || updating !== null}
                onClick={() => handleUpdate(action.status)}
                className="w-full justify-start"
              >
                {updating === action.status ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <action.icon className="h-4 w-4" />
                )}
                {isCurrent ? `${action.label} ✓` : action.label}
              </Button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
