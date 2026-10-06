import { DollarSign, Loader2, Percent, Plus } from 'lucide-react'
import { useState } from 'react'
import type { ProductData } from '@/api/products'
import { productsApi } from '@/api/products'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/Toaster'
import { isApiError } from '@/lib/api-response'

interface Props {
  product: ProductData & { metadata?: Record<string, unknown> }
}

export function PricingTab({ product }: Props) {
  const { success: showSuccess, error: showError } = useToast()
  const [editing, setEditing] = useState(false)
  const [loading, setLoading] = useState(false)
  const metadata = (product.metadata as Record<string, unknown>) ?? {}
  const price = (metadata.price as string) || ''
  const salePrice = (metadata.sale_price as string) || ''
  const currency = (metadata.currency as string) || 'USD'

  const [editPrice, setEditPrice] = useState(price)
  const [editSalePrice, setEditSalePrice] = useState(salePrice)

  const hasPricing = price || salePrice

  const handleSave = async () => {
    try {
      setLoading(true)
      await productsApi.update(product.uuid, {
        metadata: {
          ...metadata,
          price: editPrice || undefined,
          sale_price: editSalePrice || undefined,
          currency,
        },
      })
      showSuccess('Pricing updated')
      setEditing(false)
    } catch (e) {
      showError(isApiError(e) ? e.message : 'Failed to update pricing')
    } finally {
      setLoading(false)
    }
  }

  if (!hasPricing && !editing) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col items-center justify-center rounded-lg border-2 border-gray-200 border-dashed py-12 dark:border-gray-700">
          <DollarSign className="mb-3 h-10 w-10 text-gray-300 dark:text-gray-600" />
          <h3 className="font-medium text-gray-900 text-sm dark:text-white">No pricing set</h3>
          <p className="mt-1 text-gray-500 text-xs dark:text-gray-400">
            Add a base price and optional sale price
          </p>
          <Button className="mt-4" size="sm" onClick={() => setEditing(true)}>
            <Plus className="h-4 w-4" /> Add Pricing
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-700 text-sm dark:text-gray-200">Standard Price</h3>
        {!editing && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setEditPrice(price)
              setEditSalePrice(salePrice)
              setEditing(true)
            }}
          >
            Edit
          </Button>
        )}
      </div>

      {editing ? (
        <div className="space-y-4 rounded-lg border border-gray-200 p-4 dark:border-gray-700">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Base Price ({currency})</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={editPrice}
                onChange={(e) => setEditPrice(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">
                Sale Price ({currency}) <span className="text-gray-400">optional</span>
              </Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={editSalePrice}
                onChange={(e) => setEditSalePrice(e.target.value)}
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={handleSave} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
            </Button>
            <Button variant="outline" size="sm" onClick={() => setEditing(false)}>
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-6">
          {salePrice && Number(salePrice) > 0 ? (
            <div>
              <span className="text-gray-400 text-xs line-through">
                {currency} {price}
              </span>
              <span className="ml-3 font-bold text-green-600 text-xl dark:text-green-400">
                {currency} {salePrice}
              </span>
              <span className="ml-2 inline-flex items-center gap-0.5 rounded-full bg-green-100 px-2 py-0.5 font-medium text-green-700 text-xs dark:bg-green-900/30 dark:text-green-400">
                <Percent className="h-3 w-3" />
                {Math.round((1 - Number(salePrice) / Number(price)) * 100)}% off
              </span>
            </div>
          ) : (
            <span className="font-bold text-gray-900 text-xl dark:text-white">
              {currency} {price}
            </span>
          )}
        </div>
      )}

      {/* Placeholder for future: contract prices, tier pricing, etc. */}
      <div className="border-gray-100 border-t pt-4 dark:border-gray-700">
        <p className="text-gray-400 text-xs">
          Contract and volume pricing will be managed here once implemented.
        </p>
      </div>
    </div>
  )
}
