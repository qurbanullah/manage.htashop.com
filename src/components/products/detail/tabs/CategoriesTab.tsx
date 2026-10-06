import { useQuery } from '@tanstack/react-query'
import { FolderTree, Loader2 } from 'lucide-react'
import { categoriesApi } from '@/api/categories'

interface Category {
  id: number
  name: string
  slug: string
}

interface Props {
  product: { id: number; categories?: Category[] }
}

export function CategoriesTab({ product }: Props) {
  // ProductResource includes categories when loaded
  const productCategories = product.categories ?? []

  // Fetch full tree for names/fallback
  const { data: tree = [], isLoading } = useQuery({
    queryKey: ['categories', 'tree'],
    queryFn: () => categoriesApi.tree(),
    staleTime: 10 * 60 * 1000,
    enabled: productCategories.length === 0,
  })

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    )
  }

  const categories =
    productCategories.length > 0
      ? productCategories
      : tree.filter((c) => productCategories.some((pc) => pc.id === c.id))

  if (categories.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border-2 border-gray-200 border-dashed py-12 dark:border-gray-700">
        <FolderTree className="mb-3 h-10 w-10 text-gray-300 dark:text-gray-600" />
        <h3 className="font-medium text-gray-900 text-sm dark:text-white">No categories</h3>
        <p className="mt-1 text-gray-500 text-xs dark:text-gray-400">
          This product isn't assigned to any category.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <FolderTree className="h-5 w-5 text-purple-600 dark:text-purple-400" />
        <h3 className="font-semibold text-gray-700 text-sm dark:text-gray-200">
          Categories ({categories.length})
        </h3>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {categories.map((cat) => (
          <span
            key={cat.id}
            className="inline-flex items-center rounded-full bg-purple-100 px-3 py-1 font-medium text-purple-700 text-xs dark:bg-purple-900/30 dark:text-purple-300"
          >
            {cat.name}
          </span>
        ))}
      </div>
    </div>
  )
}
