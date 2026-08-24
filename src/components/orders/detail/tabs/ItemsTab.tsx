import { Package } from "lucide-react";
import type { Order } from "@/api/orders";

interface Props {
  order: Order;
}

export function ItemsTab({ order }: Props) {
  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 dark:bg-gray-800/60">
          <tr>
            <th className="px-4 py-2.5 text-left font-medium text-gray-500 dark:text-gray-400">Product</th>
            <th className="px-4 py-2.5 text-left font-medium text-gray-500 dark:text-gray-400">SKU</th>
            <th className="px-4 py-2.5 text-center font-medium text-gray-500 dark:text-gray-400">Qty</th>
            <th className="px-4 py-2.5 text-right font-medium text-gray-500 dark:text-gray-400">Unit Price</th>
            <th className="px-4 py-2.5 text-right font-medium text-gray-500 dark:text-gray-400">Total</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
          {order.items.map((item) => (
            <tr key={item.uuid}>
              <td className="px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-800">
                    {item.image_url ? (
                      <img src={item.image_url} alt={item.name} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <Package className="h-4 w-4 text-gray-300 dark:text-gray-600" />
                      </div>
                    )}
                  </div>
                  <span className="font-medium text-gray-900 dark:text-white">{item.name}</span>
                </div>
              </td>
              <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{item.sku || "—"}</td>
              <td className="px-4 py-3 text-center text-gray-700 dark:text-gray-300">{item.quantity}</td>
              <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-300">
                {item.currency} {Number(item.unit_price).toLocaleString()}
              </td>
              <td className="px-4 py-3 text-right font-semibold text-gray-900 dark:text-white">
                {item.currency} {Number(item.total).toLocaleString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
