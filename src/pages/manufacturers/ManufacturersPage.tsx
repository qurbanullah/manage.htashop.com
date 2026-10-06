import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Factory, Globe, Loader2, MapPin, Pencil, Plus, Search, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { type Manufacturer, manufacturersApi } from '@/api/manufacturers'
import { ManufacturerModal } from '@/components/manufacturers/modals/ManufacturerModal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/ui/Toaster'
import { isApiError } from '@/lib/api-response'

export default function ManufacturersPage() {
  const queryClient = useQueryClient()
  const { success: showSuccess, error: showError } = useToast()
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Manufacturer | null>(null)

  const { data: manufacturers = [], isLoading } = useQuery({
    queryKey: ['manufacturers', search],
    queryFn: () => manufacturersApi.list(search || undefined, true),
    staleTime: 0,
  })

  const openAdd = () => {
    setEditing(null)
    setModalOpen(true)
  }
  const openEdit = (m: Manufacturer) => {
    setEditing(m)
    setModalOpen(true)
  }

  const handleDelete = async (m: Manufacturer) => {
    if (!confirm(`Delete manufacturer "${m.name}"?`)) return
    try {
      await manufacturersApi.delete(m.uuid)
      showSuccess('Manufacturer deleted')
      queryClient.invalidateQueries({ queryKey: ['manufacturers'] })
    } catch (e) {
      showError(isApiError(e) ? e.message : 'Failed to delete manufacturer')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-bold text-2xl text-gray-900 dark:text-white">Manufacturers</h1>
          <p className="mt-1 text-gray-500 text-sm dark:text-gray-400">
            Manage manufacturers and OEMs
          </p>
        </div>
        <Button onClick={openAdd} className="inline-flex items-center gap-2">
          <Plus className="h-4 w-4" /> Add Manufacturer
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <Input
          placeholder="Search manufacturers..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-10 pl-10"
        />
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      ) : manufacturers.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border-2 border-gray-200 border-dashed py-20 dark:border-gray-700">
          <Factory className="mb-4 h-12 w-12 text-gray-300 dark:text-gray-600" />
          <h3 className="font-medium text-gray-900 text-lg dark:text-white">
            No manufacturers yet
          </h3>
          <p className="mt-1 text-gray-500 text-sm">Add your first manufacturer or OEM.</p>
          <Button className="mt-6" onClick={openAdd}>
            <Plus className="mr-1.5 h-4 w-4" /> Add Manufacturer
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {/* biome-ignore lint/complexity/noExcessiveCognitiveComplexity: legacy card markup */}
          {manufacturers.map((m) => (
            <div
              key={m.uuid}
              className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sky-100 dark:bg-sky-900/30">
                    <Factory className="h-5 w-5 text-sky-600 dark:text-sky-400" />
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-white">{m.name}</h3>
                    {m.code && <span className="text-gray-400 text-xs">{m.code}</span>}
                  </div>
                </div>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => openEdit(m)}
                    className="rounded p-1 text-gray-400 hover:text-blue-500"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(m)}
                    className="rounded p-1 text-gray-400 hover:text-red-500"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {m.origin === 'vendor' && !m.is_approved && (
                <p className="mt-2 inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 font-medium text-amber-700 text-xs dark:bg-amber-900/30 dark:text-amber-300">
                  Pending approval
                </p>
              )}

              {m.country && (
                <p className="mt-3 flex items-center gap-1 text-gray-500 text-xs dark:text-gray-400">
                  <MapPin className="h-3.5 w-3.5" />
                  {m.country}
                </p>
              )}
              {m.website && (
                <a
                  href={m.website}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-1 flex items-center gap-1 text-blue-500 text-xs hover:underline"
                >
                  <Globe className="h-3.5 w-3.5" />
                  {m.website}
                </a>
              )}

              <div className="mt-3 flex items-center gap-2">
                <span
                  className={`inline-flex items-center rounded-full px-2 py-0.5 font-medium text-xs ${
                    m.type === 'oem'
                      ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                      : 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
                  }`}
                >
                  {m.type === 'oem' ? 'OEM' : 'Manufacturer'}
                </span>
                <span
                  className={`inline-flex items-center rounded-full px-2 py-0.5 font-medium text-xs ${
                    m.is_active
                      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                      : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
                  }`}
                >
                  {m.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      <ManufacturerModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        manufacturer={editing}
        onSaved={() => {
          queryClient.invalidateQueries({ queryKey: ['manufacturers'] })
          queryClient.invalidateQueries({ queryKey: ['brands'] })
        }}
      />
    </div>
  )
}
