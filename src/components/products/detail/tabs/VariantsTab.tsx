import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Layers, Loader2, Pencil, Plus, Star, Trash2 } from 'lucide-react'
import { useState } from 'react'
import type { ProductData } from '@/api/products'
import { type VariantData, variantsApi } from '@/api/variants'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Modal } from '@/components/ui/modal'
import { useToast } from '@/components/ui/Toaster'
import { AddVariantModal } from '@/components/variants/create/modals/AddVariantModal'
import { isApiError } from '@/lib/api-response'

interface Props {
  product: ProductData
}

export function VariantsTab({ product }: Props) {
  const queryClient = useQueryClient()
  const { success: showSuccess, error: showError } = useToast()
  const [addOpen, setAddOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [editing, setEditing] = useState<VariantData | null>(null)
  const [form, setForm] = useState({ name: '', summary: '' })
  const [saving, setSaving] = useState(false)

  const { data: variantsRes, isLoading } = useQuery({
    queryKey: ['variants', product.id],
    queryFn: () => variantsApi.list(product.id),
  })

  const variants = (variantsRes?.data as VariantData[]) ?? []

  const openEdit = (v: VariantData) => {
    setEditing(v)
    setForm({ name: v.name, summary: v.summary || '' })
    setEditOpen(true)
  }

  const handleSave = async () => {
    if (!form.name.trim() || !editing) return
    setSaving(true)
    try {
      await variantsApi.update(editing.uuid, { name: form.name, summary: form.summary })
      showSuccess('Variant updated')
      queryClient.invalidateQueries({ queryKey: ['variants', product.id] })
      setEditOpen(false)
    } catch (e) {
      showError(isApiError(e) ? e.message : 'Failed to update variant')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (v: VariantData) => {
    if (!confirm(`Delete variant "${v.name}"?`)) return
    try {
      await variantsApi.delete(v.uuid)
      showSuccess('Variant deleted')
      queryClient.invalidateQueries({ queryKey: ['variants', product.id] })
    } catch (e) {
      showError(isApiError(e) ? e.message : 'Failed to delete variant')
    }
  }

  const handleSetDefault = async (v: VariantData) => {
    try {
      await variantsApi.update(v.uuid, { is_default: true })
      queryClient.invalidateQueries({ queryKey: ['variants', product.id] })
    } catch (e) {
      showError(isApiError(e) ? e.message : 'Failed to update variant')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Layers className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          <div>
            <h3 className="font-semibold text-gray-700 text-sm dark:text-gray-200">Variants</h3>
            <p className="text-gray-400 text-xs">
              {variants.length} variant{variants.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
        <Button size="sm" onClick={() => setAddOpen(true)}>
          <Plus className="mr-1.5 h-4 w-4" /> Add Variant
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        </div>
      ) : variants.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border-2 border-gray-200 border-dashed py-12 dark:border-gray-700">
          <Layers className="mb-3 h-10 w-10 text-gray-300 dark:text-gray-600" />
          <h3 className="font-medium text-gray-900 text-sm dark:text-white">No variants yet</h3>
          <p className="mt-1 text-gray-500 text-xs dark:text-gray-400">
            Add variants like colors, sizes, or configurations.
          </p>
          <Button className="mt-4" size="sm" onClick={() => setAddOpen(true)}>
            <Plus className="mr-1.5 h-4 w-4" /> Add Variant
          </Button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
          <table className="w-full text-left text-sm">
            <thead className="border-gray-200 border-b bg-gray-50 dark:border-gray-700 dark:bg-gray-800">
              <tr>
                <th className="px-4 py-2.5 font-medium text-gray-600 dark:text-gray-300">Name</th>
                <th className="hidden px-4 py-2.5 font-medium text-gray-600 sm:table-cell dark:text-gray-300">
                  SKU
                </th>
                <th className="hidden px-4 py-2.5 font-medium text-gray-600 md:table-cell dark:text-gray-300">
                  Status
                </th>
                <th className="px-4 py-2.5 text-right font-medium text-gray-600 dark:text-gray-300">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {variants.map((v) => (
                <tr key={v.uuid} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900 dark:text-white">{v.name}</span>
                      {v.is_default && (
                        <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-100 px-1.5 py-0.5 font-medium text-[10px] text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                          <Star className="h-2.5 w-2.5" /> Default
                        </span>
                      )}
                    </div>
                    {v.summary && (
                      <div className="mt-0.5 line-clamp-1 text-gray-500 text-xs">{v.summary}</div>
                    )}
                  </td>
                  <td className="hidden px-4 py-2.5 text-gray-500 sm:table-cell dark:text-gray-400">
                    <code className="text-xs">{v.slug}</code>
                  </td>
                  <td className="hidden px-4 py-2.5 md:table-cell">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 font-medium text-xs ${
                        v.is_active
                          ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                          : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
                      }`}
                    >
                      {v.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <div className="inline-flex items-center gap-1">
                      {!v.is_default && (
                        <button
                          type="button"
                          onClick={() => handleSetDefault(v)}
                          className="rounded p-1 text-gray-400 hover:text-amber-500"
                          title="Set as default"
                        >
                          <Star className="h-4 w-4" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => openEdit(v)}
                        className="rounded p-1 text-gray-400 hover:text-blue-500"
                        title="Edit"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(v)}
                        className="rounded p-1 text-gray-400 hover:text-red-500"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Variant — full step modal */}
      <AddVariantModal
        isOpen={addOpen}
        onClose={() => setAddOpen(false)}
        productId={product.id}
        productStorageKey={(product.metadata?.storage_key as string) || product.uuid}
        onCreated={() => queryClient.invalidateQueries({ queryKey: ['variants', product.id] })}
      />

      {/* Edit Variant — simple modal */}
      <Modal
        isOpen={editOpen}
        onClose={() => setEditOpen(false)}
        title="Edit Variant"
        maxWidth="md"
      >
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Name</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              autoFocus
            />
          </div>
          <div className="space-y-1.5">
            <Label>
              Summary <span className="text-gray-400">(optional)</span>
            </Label>
            <Input
              value={form.summary}
              onChange={(e) => setForm({ ...form, summary: e.target.value })}
            />
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="outline" onClick={() => setEditOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!form.name.trim() || saving}>
            {saving ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : null} Update
          </Button>
        </div>
      </Modal>
    </div>
  )
}
