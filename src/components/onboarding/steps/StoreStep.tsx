import { Store, Tag, Globe, Check, X, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface AvailabilityStatus {
  slug?: { available: boolean; message: string } | null;
  store_name?: { available: boolean; message: string } | null;
}

interface Props {
  data: { storeName: string; slug: string; type: string };
  onChange: (data: { storeName: string; slug: string; type: string }) => void;
  checking: boolean;
  availability: AvailabilityStatus;
  slugDisabled?: boolean;
}

export function StoreStep({ data, onChange, checking, availability, slugDisabled = false }: Props) {
  const slugStatus = availability.slug;
  const nameStatus = availability.store_name;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900/30">
          <Store className="h-5 w-5 text-green-600 dark:text-green-400" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Your Store</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">Set up your storefront</p>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">Store name</Label>
        <div className="relative">
          <Input
            value={data.storeName}
            onChange={(e) => onChange({ ...data, storeName: e.target.value })}
            placeholder="Acme Supplies"
            className="h-11 pr-10"
          />
          {checking && (
            <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-gray-400" />
          )}
          {nameStatus && !checking && (
            nameStatus.available
              ? <Check className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-green-500" />
              : <X className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-red-500" />
          )}
        </div>
        {nameStatus && !checking && (
          <p className={`text-xs ${nameStatus.available ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
            {nameStatus.message}
          </p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Store URL slug
        </Label>
        <div className="relative">
          <Globe className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            value={data.slug}
            onChange={(e) => onChange({ ...data, slug: e.target.value.toLowerCase().replace(/\s+/g, "-") })}
            placeholder="auto-generated"
            disabled={slugDisabled}
            className="h-11 pl-10 pr-10 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-500 dark:disabled:bg-gray-800 dark:disabled:text-gray-400"
          />
          {checking && (
            <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-gray-400" />
          )}
          {slugStatus && !checking && (
            slugStatus.available
              ? <Check className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-green-500" />
              : <X className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-red-500" />
          )}
        </div>
        <p className="text-xs text-gray-400 dark:text-gray-500">
          Your store will be at htashop.com/{data.slug || "your-store"} &mdash; auto-generated from your store name
        </p>
        {slugStatus && !checking && (
          <p className={`text-xs ${slugStatus.available ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
            {slugStatus.message}
          </p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">Business type</Label>
        <div className="grid grid-cols-2 gap-2">
          {["Supplier", "Distributor", "Manufacturer", "Reseller"].map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => onChange({ ...data, type: t })}
              className={`flex items-center gap-2 rounded-lg border px-4 py-3 text-sm font-medium transition-colors ${
                data.type === t
                  ? "border-blue-500 bg-blue-50 text-blue-700 dark:border-blue-400 dark:bg-blue-900/20 dark:text-blue-300"
                  : "border-gray-200 text-gray-600 hover:border-gray-300 dark:border-gray-700 dark:text-gray-300 dark:hover:border-gray-600"
              }`}
            >
              <Tag className="h-4 w-4" />
              {t}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
