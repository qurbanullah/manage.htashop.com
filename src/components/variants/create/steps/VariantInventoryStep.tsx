import { useState, useRef, useEffect } from "react";
import { Boxes, Search, ChevronDown } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { warehousesApi, type Warehouse } from "@/api/warehouses";

export interface InventoryFormData {
  trackInventory: boolean;
  quantity: string;
  lowStockThreshold: string;
  sku: string;
  warehouseId: string;
}

interface Props {
  data: InventoryFormData;
  onChange: (data: InventoryFormData) => void;
  defaultSku?: string;
}

export function VariantInventoryStep({ data, onChange, defaultSku }: Props) {
  const [warehouseOpen, setWarehouseOpen] = useState(false);
  const [warehouseSearch, setWarehouseSearch] = useState("");
  const warehouseRef = useRef<HTMLDivElement>(null);

  const { data: warehouses = [] } = useQuery({
    queryKey: ["warehouses"],
    queryFn: () => warehousesApi.list(),
    staleTime: 10 * 60 * 1000,
  });

  const selectedWarehouse = warehouses.find((w) => String(w.id) === data.warehouseId);

  const filtered = warehouseSearch.trim()
    ? warehouses.filter((w) =>
        w.name.toLowerCase().includes(warehouseSearch.toLowerCase()) ||
        w.code?.toLowerCase().includes(warehouseSearch.toLowerCase()),
      )
    : warehouses;

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (warehouseRef.current && !warehouseRef.current.contains(e.target as Node)) {
        setWarehouseOpen(false);
        setWarehouseSearch("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const set = (key: keyof InventoryFormData, value: string | boolean) =>
    onChange({ ...data, [key]: value });

  return (
    <div className="w-full space-y-5">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
          <Boxes className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Inventory</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">Set stock quantity and tracking</p>
        </div>
      </div>

      {/* Track inventory toggle */}
      <label className="flex cursor-pointer items-center justify-between rounded-lg border border-gray-200 px-4 py-3 dark:border-gray-700">
        <div>
          <span className="text-sm font-medium text-gray-700 dark:text-gray-200">Track inventory</span>
          <p className="text-xs text-gray-400">Manage stock levels for this variant</p>
        </div>
        <input
          type="checkbox"
          checked={data.trackInventory}
          onChange={(e) => set("trackInventory", e.target.checked)}
          className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
        />
      </label>

      {data.trackInventory && (
        <div className="grid gap-4 sm:grid-cols-2">
          {/* Quantity */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Quantity on hand <span className="ml-1 text-red-500">*</span>
            </Label>
            <Input
              type="number"
              min="0"
              step="1"
              value={data.quantity}
              onChange={(e) => set("quantity", e.target.value)}
              placeholder="0"
              className="h-11"
            />
          </div>

          {/* Low stock threshold */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Low stock threshold <span className="font-normal text-gray-400">(optional)</span>
            </Label>
            <Input
              type="number"
              min="0"
              step="1"
              value={data.lowStockThreshold}
              onChange={(e) => set("lowStockThreshold", e.target.value)}
              placeholder="e.g. 5"
              className="h-11"
            />
          </div>

          {/* SKU */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              SKU <span className="ml-1 font-normal text-gray-400">(optional)</span>
            </Label>
            <Input
              value={data.sku || defaultSku || ""}
              onChange={(e) => set("sku", e.target.value)}
              placeholder="Auto-generated"
              className="h-11 font-mono"
            />
          </div>

          {/* Warehouse */}
          <div ref={warehouseRef} className="relative space-y-1.5">
            <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Warehouse <span className="font-normal text-gray-400">(optional)</span>
            </Label>
            <button
              type="button"
              onClick={() => setWarehouseOpen(!warehouseOpen)}
              className="flex h-11 w-full items-center justify-between rounded-lg border border-gray-300 bg-white px-3 text-left text-sm dark:border-gray-600 dark:bg-gray-800"
            >
              {selectedWarehouse ? (
                <span className="text-gray-700 dark:text-gray-200">{selectedWarehouse.name}</span>
              ) : (
                <span className="text-gray-400">Select warehouse...</span>
              )}
              <ChevronDown className="h-4 w-4 shrink-0 text-gray-400" />
            </button>

            {warehouseOpen && (
              <div className="absolute left-0 top-full z-20 mt-1 max-h-56 w-full overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-600 dark:bg-gray-800">
                <div className="border-b border-gray-100 p-2 dark:border-gray-700">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
                    <Input
                      value={warehouseSearch}
                      onChange={(e) => setWarehouseSearch(e.target.value)}
                      placeholder="Search warehouses..."
                      className="h-8 pl-8 text-xs"
                      autoFocus
                    />
                  </div>
                </div>
                <div className="max-h-40 overflow-y-auto">
                  {filtered.length === 0 ? (
                    <div className="px-3 py-4 text-center text-xs text-gray-400">No warehouses</div>
                  ) : (
                    filtered.map((w: Warehouse) => (
                      <button
                        key={w.id}
                        type="button"
                        onClick={() => { set("warehouseId", String(w.id)); setWarehouseOpen(false); }}
                        className={`flex w-full items-center justify-between px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700/50 ${String(w.id) === data.warehouseId ? "bg-emerald-50 dark:bg-emerald-900/20" : ""}`}
                      >
                        <span className="text-gray-700 dark:text-gray-200">{w.name}</span>
                        <span className="text-xs text-gray-400">{w.code}</span>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {!data.trackInventory && (
        <p className="text-xs text-gray-400 bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
          Inventory tracking is disabled. This variant won't track stock levels.
        </p>
      )}
    </div>
  );
}
