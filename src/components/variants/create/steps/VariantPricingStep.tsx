import { DollarSign } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Props {
  data: { price: string; salePrice: string };
  onChange: (data: { price: string; salePrice: string }) => void;
}

export function VariantPricingStep({ data, onChange }: Props) {
  return (
    <div className="w-full space-y-4">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900/30">
          <DollarSign className="h-5 w-5 text-green-600 dark:text-green-400" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Pricing</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">Override product price if different</p>
        </div>
      </div>

      <p className="text-xs text-gray-400 bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
        Leave empty to inherit the product's price. Set a value to override for this variant only.
      </p>

      <div className="space-y-1.5">
        <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Price <span className="font-normal text-gray-400">(optional)</span>
        </Label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">$</span>
          <Input type="number" min="0" step="0.01" value={data.price} onChange={(e) => onChange({ ...data, price: e.target.value })} placeholder="Inherits from product" className="h-11 pl-8" />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Sale price <span className="font-normal text-gray-400">(optional)</span>
        </Label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">$</span>
          <Input type="number" min="0" step="0.01" value={data.salePrice} onChange={(e) => onChange({ ...data, salePrice: e.target.value })} placeholder="Inherits from product" className="h-11 pl-8" />
        </div>
      </div>
    </div>
  );
}
