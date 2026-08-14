import { Calendar, Hash } from "lucide-react";
import type { ProductData } from "@/api/products";

interface Props {
  product: ProductData;
}

export function OverviewTab({ product }: Props) {
  return (
    <div className="space-y-6">
      {/* Basic info */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="text-xs font-medium text-gray-400 dark:text-gray-500">Product Name</label>
          <p className="mt-1 text-sm font-medium text-gray-900 dark:text-white">{product.name}</p>
        </div>
        <div>
          <label className="text-xs font-medium text-gray-400 dark:text-gray-500">Slug</label>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{product.slug}</p>
        </div>
        <div>
          <label className="text-xs font-medium text-gray-400 dark:text-gray-500">Status</label>
          <p className="mt-1">
            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
              product.status === "active"
                ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
            }`}>
              {product.status || "draft"}
            </span>
          </p>
        </div>
        <div>
          <label className="text-xs font-medium text-gray-400 dark:text-gray-500">Created</label>
          <p className="mt-1 flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400">
            <Calendar className="h-3.5 w-3.5" />
            {new Date(product.created_at).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
          </p>
        </div>
      </div>

      {/* Summary */}
      {product.summary && (
        <div>
          <label className="text-xs font-medium text-gray-400 dark:text-gray-500">Summary</label>
          <p className="mt-1 text-sm text-gray-700 dark:text-gray-300">{product.summary}</p>
        </div>
      )}

      {/* Description */}
      {product.description && (
        <div>
          <label className="text-xs font-medium text-gray-400 dark:text-gray-500">Description</label>
          <p className="mt-1 whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-300">{product.description}</p>
        </div>
      )}

      {/* UUID */}
      <div>
        <label className="text-xs font-medium text-gray-400 dark:text-gray-500">UUID</label>
        <p className="mt-1 flex items-center gap-1 text-xs text-gray-400 font-mono">
          <Hash className="h-3 w-3" />
          {product.uuid}
        </p>
      </div>
    </div>
  );
}
