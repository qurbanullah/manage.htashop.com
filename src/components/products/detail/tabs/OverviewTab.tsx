import { Calendar, Hash } from 'lucide-react'
import type { ProductData } from '@/api/products'

interface Props {
  product: ProductData
}

export function OverviewTab({ product }: Props) {
  return (
    <div className="space-y-6">
      {/* Basic info */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <span className="font-medium text-gray-400 text-xs dark:text-gray-500">Product Name</span>
          <p className="mt-1 font-medium text-gray-900 text-sm dark:text-white">{product.name}</p>
        </div>
        <div>
          <span className="font-medium text-gray-400 text-xs dark:text-gray-500">Slug</span>
          <p className="mt-1 text-gray-600 text-sm dark:text-gray-400">{product.slug}</p>
        </div>
        <div>
          <span className="font-medium text-gray-400 text-xs dark:text-gray-500">Status</span>
          <p className="mt-1">
            <span
              className={`inline-flex items-center rounded-full px-2 py-0.5 font-medium text-xs ${
                product.status === 'active'
                  ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                  : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
              }`}
            >
              {product.status || 'draft'}
            </span>
          </p>
        </div>
        <div>
          <span className="font-medium text-gray-400 text-xs dark:text-gray-500">Created</span>
          <p className="mt-1 flex items-center gap-1 text-gray-600 text-sm dark:text-gray-400">
            <Calendar className="h-3.5 w-3.5" />
            {new Date(product.created_at).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </p>
        </div>
      </div>

      {/* Summary */}
      {product.summary && (
        <div>
          <span className="font-medium text-gray-400 text-xs dark:text-gray-500">Summary</span>
          <p className="mt-1 text-gray-700 text-sm dark:text-gray-300">{product.summary}</p>
        </div>
      )}

      {/* Description */}
      {product.description && (
        <div>
          <span className="font-medium text-gray-400 text-xs dark:text-gray-500">Description</span>
          <p className="mt-1 whitespace-pre-wrap text-gray-700 text-sm dark:text-gray-300">
            {product.description}
          </p>
        </div>
      )}

      {/* UUID */}
      <div>
        <span className="font-medium text-gray-400 text-xs dark:text-gray-500">UUID</span>
        <p className="mt-1 flex items-center gap-1 font-mono text-gray-400 text-xs">
          <Hash className="h-3 w-3" />
          {product.uuid}
        </p>
      </div>
    </div>
  )
}
