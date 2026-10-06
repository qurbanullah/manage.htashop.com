import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Factory, Globe, Loader2, Pencil, Plus, Search, Tag, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { type Brand, brandsApi } from '@/api/brands'
import { BrandModal } from '@/components/brands/modals/BrandModal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/ui/Toaster'
import { isApiError } from '@/lib/api-response'

export default function BrandsPage() {
  const queryClient = useQueryClient()
  const { success: showSuccess, error: showError } = useToast()
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Brand | null>(null)

  const { data: brands = [], isLoading } = useQuery({
    queryKey: ['brands', 'all', search],
    queryFn: () => brandsApi.list(undefined, search || undefined, true),
    staleTime: 0,
  })

  const openAdd = () => {
    setEditing(null)
    setModalOpen(true)
  }
  const openEdit = (b: Brand) => {
    setEditing(b)
    setModalOpen(true)
  }

  const handleDelete = async (b: Brand) => {
    if (!confirm(`Delete brand "${b.name}"?`)) return
    try {
      await brandsApi.delete(b.uuid)
      showSuccess('Brand deleted')
      queryClient.invalidateQueries({ queryKey: ['brands'] })
    } catch (e) {
      showError(isApiError(e) ? e.message : 'Failed to delete brand')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-bold text-2xl text-gray-900 dark:text-white">Brands</h1>
          <p className="mt-1 text-gray-500 text-sm dark:text-gray-400">Manage product brands</p>
        </div>
        <Button onClick={openAdd} className="inline-flex items-center gap-2">
          <Plus className="h-4 w-4" /> Add Brand
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <Input
          placeholder="Search brands..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-10 pl-10"
        />
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      ) : brands.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border-2 border-gray-200 border-dashed py-20 dark:border-gray-700">
          <Tag className="mb-4 h-12 w-12 text-gray-300 dark:text-gray-600" />
          <h3 className="font-medium text-gray-900 text-lg dark:text-white">No brands yet</h3>
          <p className="mt-1 text-gray-500 text-sm">Add your first brand.</p>
          <Button className="mt-6" onClick={openAdd}>
            <Plus className="mr-1.5 h-4 w-4" /> Add Brand
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {brands.map((b) => (
            <div
              key={b.uuid}
              className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
                    <Tag className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-white">{b.name}</h3>
                    {b.manufacturer && (
                      <span className="flex items-center gap-1 text-gray-400 text-xs">
                        <Factory className="h-3 w-3" />
                        {b.manufacturer.name}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => openEdit(b)}
                    className="rounded p-1 text-gray-400 hover:text-blue-500"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(b)}
                    className="rounded p-1 text-gray-400 hover:text-red-500"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {b.origin === 'vendor' && !b.is_approved && (
                <p className="mt-2 inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 font-medium text-amber-700 text-xs dark:bg-amber-900/30 dark:text-amber-300">
                  Pending approval
                </p>
              )}

              {b.website && (
                <a
                  href={b.website}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 flex items-center gap-1 text-blue-500 text-xs hover:underline"
                >
                  <Globe className="h-3.5 w-3.5" />
                  {b.website}
                </a>
              )}

              <span
                className={`mt-3 inline-flex items-center rounded-full px-2 py-0.5 font-medium text-xs ${
                  b.is_active
                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                    : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
                }`}
              >
                {b.is_active ? 'Active' : 'Inactive'}
              </span>
            </div>
          ))}
        </div>
      )}

      <BrandModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        brand={editing}
        onSaved={() => queryClient.invalidateQueries({ queryKey: ['brands'] })}
      />
    </div>
  )
}
