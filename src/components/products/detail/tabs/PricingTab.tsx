import { useState } from "react";
import { DollarSign, Plus, Percent, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/Toaster";
import { productsApi } from "@/api/products";
import { isApiError } from "@/lib/api-response";
import type { ProductData } from "@/api/products";

interface Props {
  product: ProductData & { metadata?: Record<string, unknown> };
}

export function PricingTab({ product }: Props) {
  const { success: showSuccess, error: showError } = useToast();
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const metadata = (product.metadata as Record<string, unknown>) ?? {};
  const price = (metadata.price as string) || "";
  const salePrice = (metadata.sale_price as string) || "";
  const currency = (metadata.currency as string) || "USD";

  const [editPrice, setEditPrice] = useState(price);
  const [editSalePrice, setEditSalePrice] = useState(salePrice);

  const hasPricing = price || salePrice;

  const handleSave = async () => {
    try {
      setLoading(true);
      await productsApi.update(product.uuid, {
        metadata: {
          ...metadata,
          price: editPrice || undefined,
          sale_price: editSalePrice || undefined,
          currency,
        },
      });
      showSuccess("Pricing updated");
      setEditing(false);
    } catch (e) {
      showError(isApiError(e) ? e.message : "Failed to update pricing");
    } finally {
      setLoading(false);
    }
  };

  if (!hasPricing && !editing) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-200 py-12 dark:border-gray-700">
          <DollarSign className="mb-3 h-10 w-10 text-gray-300 dark:text-gray-600" />
          <h3 className="text-sm font-medium text-gray-900 dark:text-white">No pricing set</h3>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Add a base price and optional sale price</p>
          <Button className="mt-4" size="sm" onClick={() => setEditing(true)}>
            <Plus className="h-4 w-4" /> Add Pricing
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200">Standard Price</h3>
        {!editing && (
          <Button variant="outline" size="sm" onClick={() => { setEditPrice(price); setEditSalePrice(salePrice); setEditing(true); }}>
            Edit
          </Button>
        )}
      </div>

      {editing ? (
        <div className="space-y-4 rounded-lg border border-gray-200 p-4 dark:border-gray-700">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Base Price ({currency})</Label>
              <Input type="number" step="0.01" min="0" value={editPrice} onChange={(e) => setEditPrice(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Sale Price ({currency}) <span className="text-gray-400">optional</span></Label>
              <Input type="number" step="0.01" min="0" value={editSalePrice} onChange={(e) => setEditSalePrice(e.target.value)} />
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={handleSave} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
            </Button>
            <Button variant="outline" size="sm" onClick={() => setEditing(false)}>Cancel</Button>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-6">
          {salePrice && Number(salePrice) > 0 ? (
            <>
              <div>
                <span className="text-xs text-gray-400 line-through">{currency} {price}</span>
                <span className="ml-3 text-xl font-bold text-green-600 dark:text-green-400">{currency} {salePrice}</span>
                <span className="ml-2 inline-flex items-center gap-0.5 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
                  <Percent className="h-3 w-3" />
                  {Math.round((1 - Number(salePrice) / Number(price)) * 100)}% off
                </span>
              </div>
            </>
          ) : (
            <span className="text-xl font-bold text-gray-900 dark:text-white">{currency} {price}</span>
          )}
        </div>
      )}

      {/* Placeholder for future: contract prices, tier pricing, etc. */}
      <div className="border-t border-gray-100 pt-4 dark:border-gray-700">
        <p className="text-xs text-gray-400">
          Contract and volume pricing will be managed here once implemented.
        </p>
      </div>
    </div>
  );
}
