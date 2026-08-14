import { Package } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Props {
  data: { name: string; sellerSku: string; summary: string };
  onChange: (data: { name: string; sellerSku: string; summary: string }) => void;
}

export function VariantBasicStep({ data, onChange }: Props) {
  return (
    <div className="w-full space-y-4">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
          <Package className="h-5 w-5 text-blue-600 dark:text-blue-400" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Variant Info</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">Name and identifier for this variant</p>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Variant name <span className="ml-1 text-red-500">*</span>
        </Label>
        <Input
          value={data.name}
          onChange={(e) => onChange({ ...data, name: e.target.value })}
          placeholder='e.g. "Blue / Large" or "10mm"'
          className="h-11"
        />
        <p className="text-xs text-gray-400">Describe what makes this variant different</p>
      </div>

      <div className="space-y-1.5">
        <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">System SKU</Label>
        <Input
          value=""
          placeholder="Auto-generated on save (e.g. HTA-EL-2608-000001-BLU-XL)"
          disabled
          className="h-11 font-mono disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-500 dark:disabled:bg-gray-800 dark:disabled:text-gray-400"
        />
        <p className="text-xs text-gray-400">Generated from the product SKU and variant options. Not editable.</p>
      </div>

      <div className="space-y-1.5">
        <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Seller SKU <span className="ml-1 font-normal text-gray-400">(optional)</span>
        </Label>
        <Input
          value={data.sellerSku}
          onChange={(e) => onChange({ ...data, sellerSku: e.target.value })}
          placeholder='e.g. "PROD-BLUE-L"'
          className="h-11 font-mono"
        />
        <p className="text-xs text-gray-400">Your own SKU if you already have one in an existing system</p>
      </div>

      <div className="space-y-1.5">
        <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Summary <span className="font-normal text-gray-400">(optional)</span>
        </Label>
        <Input
          value={data.summary}
          onChange={(e) => onChange({ ...data, summary: e.target.value })}
          placeholder="Brief description"
          className="h-11"
        />
      </div>
    </div>
  );
}
