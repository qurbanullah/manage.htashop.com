import { useQuery } from '@tanstack/react-query'
import {
  AlertTriangle,
  Boxes,
  Loader2,
  PackageCheck,
  Warehouse as WarehouseIcon,
} from 'lucide-react'
import { type InventoryData, inventoryApi } from '@/api/inventory'

interface Props {
  product: { id: number }
}

export function InventoryTab({ product }: Props) {
  const { data: inventory = [], isLoading } = useQuery({
    queryKey: ['inventory', 'product', product.id],
    queryFn: () =>
      inventoryApi.list({ stockable_type: 'App\\Models\\Product', stockable_id: product.id }),
  })

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    )
  }

  if (inventory.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border-2 border-gray-200 border-dashed py-12 dark:border-gray-700">
        <Boxes className="mb-3 h-10 w-10 text-gray-300 dark:text-gray-600" />
        <h3 className="font-medium text-gray-900 text-sm dark:text-white">No inventory records</h3>
        <p className="mt-1 text-gray-500 text-xs dark:text-gray-400">
          Inventory not set for this product.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Boxes className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
        <h3 className="font-semibold text-gray-700 text-sm dark:text-gray-200">
          Inventory ({inventory.length} record{inventory.length !== 1 ? 's' : ''})
        </h3>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {inventory.map((inv: InventoryData) => (
          <div
            key={inv.uuid}
            className="rounded-lg border border-gray-200 p-4 dark:border-gray-700"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {inv.warehouse ? (
                  <WarehouseIcon className="h-4 w-4 text-blue-500" />
                ) : (
                  <PackageCheck className="h-4 w-4 text-gray-400" />
                )}
                <span className="font-medium text-gray-900 text-sm dark:text-white">
                  {inv.warehouse?.name ?? 'Default Warehouse'}
                </span>
              </div>
              {inv.is_low_stock ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 font-medium text-amber-700 text-xs dark:bg-amber-900/30 dark:text-amber-400">
                  <AlertTriangle className="h-3 w-3" /> Low stock
                </span>
              ) : (
                <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 font-medium text-green-700 text-xs dark:bg-green-900/30 dark:text-green-400">
                  In stock
                </span>
              )}
            </div>

            <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-gray-400 text-xs">On hand</span>
                <p className="font-medium text-gray-900 dark:text-white">{Number(inv.quantity)}</p>
              </div>
              <div>
                <span className="text-gray-400 text-xs">Available</span>
                <p className="font-medium text-gray-900 dark:text-white">{Number(inv.available)}</p>
              </div>
              <div>
                <span className="text-gray-400 text-xs">Reserved</span>
                <p className="text-gray-600 dark:text-gray-400">{Number(inv.reserved)}</p>
              </div>
              {inv.low_stock_threshold != null && (
                <div>
                  <span className="text-gray-400 text-xs">Low stock at</span>
                  <p className="text-gray-600 dark:text-gray-400">
                    {Number(inv.low_stock_threshold)}
                  </p>
                </div>
              )}
            </div>

            {inv.sku && <p className="mt-2 font-mono text-gray-400 text-xs">SKU: {inv.sku}</p>}
          </div>
        ))}
      </div>
    </div>
  )
}
