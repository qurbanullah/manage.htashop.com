import { DollarSign } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface Props {
  data: { price: string; salePrice: string }
  onChange: (data: { price: string; salePrice: string }) => void
}

export function VariantPricingStep({ data, onChange }: Props) {
  return (
    <div className="w-full space-y-4">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900/30">
          <DollarSign className="h-5 w-5 text-green-600 dark:text-green-400" />
        </div>
        <div>
          <h2 className="font-semibold text-gray-900 text-lg dark:text-white">Pricing</h2>
          <p className="text-gray-500 text-sm dark:text-gray-400">
            Override product price if different
          </p>
        </div>
      </div>

      <p className="rounded-lg bg-gray-50 p-3 text-gray-400 text-xs dark:bg-gray-800">
        Leave empty to inherit the product's price. Set a value to override for this variant only.
      </p>

      <div className="space-y-1.5">
        <Label className="font-medium text-gray-700 text-sm dark:text-gray-300">
          Price <span className="font-normal text-gray-400">(optional)</span>
        </Label>
        <div className="relative">
          <span className="absolute top-1/2 left-3 -translate-y-1/2 text-gray-500 text-sm">$</span>
          <Input
            type="number"
            min="0"
            step="0.01"
            value={data.price}
            onChange={(e) => onChange({ ...data, price: e.target.value })}
            placeholder="Inherits from product"
            className="h-11 pl-8"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label className="font-medium text-gray-700 text-sm dark:text-gray-300">
          Sale price <span className="font-normal text-gray-400">(optional)</span>
        </Label>
        <div className="relative">
          <span className="absolute top-1/2 left-3 -translate-y-1/2 text-gray-500 text-sm">$</span>
          <Input
            type="number"
            min="0"
            step="0.01"
            value={data.salePrice}
            onChange={(e) => onChange({ ...data, salePrice: e.target.value })}
            placeholder="Inherits from product"
            className="h-11 pl-8"
          />
        </div>
      </div>
    </div>
  )
}
