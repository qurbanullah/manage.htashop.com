import { useQuery } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import {
  type PackagingTemplate,
  type PackagingTemplatePayload,
  packagingTemplatesApi,
} from '@/api/shippingConfig'
import { unitsApi } from '@/api/units'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Modal } from '@/components/ui/modal'
import { useToast } from '@/components/ui/Toaster'
import { isApiError } from '@/lib/api-response'

interface Props {
  isOpen: boolean
  onClose: () => void
  template: PackagingTemplate | null
  onSaved: () => void
}

interface TemplateForm {
  name: string
  code: string
  description: string
  packagingTypeUnitId: string
  length: string
  width: string
  height: string
  dimensionUnitId: string
  maxWeight: string
  weightUnitId: string
  tareWeight: string
  tareWeightUnitId: string
  sortOrder: string
  isActive: boolean
}

const EMPTY: TemplateForm = {
  name: '',
  code: '',
  description: '',
  packagingTypeUnitId: '',
  length: '',
  width: '',
  height: '',
  dimensionUnitId: '',
  maxWeight: '',
  weightUnitId: '',
  tareWeight: '',
  tareWeightUnitId: '',
  sortOrder: '0',
  isActive: true,
}

const selectClass =
  'h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm dark:border-gray-600 dark:bg-gray-800'

const toNumber = (value: string): number | null => {
  const trimmed = value.trim()
  if (trimmed === '') return null
  const parsed = Number(trimmed)
  return Number.isFinite(parsed) ? parsed : null
}

function toForm(template: PackagingTemplate | null): TemplateForm {
  if (!template) return EMPTY

  return {
    name: template.name,
    code: template.code,
    description: template.description ?? '',
    packagingTypeUnitId:
      template.packaging_type_unit_id != null ? String(template.packaging_type_unit_id) : '',
    length: template.length != null ? String(template.length) : '',
    width: template.width != null ? String(template.width) : '',
    height: template.height != null ? String(template.height) : '',
    dimensionUnitId: template.dimension_unit_id != null ? String(template.dimension_unit_id) : '',
    maxWeight: template.max_weight != null ? String(template.max_weight) : '',
    weightUnitId: template.weight_unit_id != null ? String(template.weight_unit_id) : '',
    tareWeight: template.tare_weight != null ? String(template.tare_weight) : '',
    tareWeightUnitId:
      template.tare_weight_unit_id != null ? String(template.tare_weight_unit_id) : '',
    sortOrder: String(template.sort_order ?? 0),
    isActive: template.is_active,
  }
}

function toPayload(form: TemplateForm): PackagingTemplatePayload {
  return {
    name: form.name.trim(),
    code: form.code.trim() || undefined,
    description: form.description.trim() || undefined,
    packaging_type_unit_id: form.packagingTypeUnitId ? Number(form.packagingTypeUnitId) : null,
    length: toNumber(form.length),
    width: toNumber(form.width),
    height: toNumber(form.height),
    dimension_unit_id: form.dimensionUnitId ? Number(form.dimensionUnitId) : null,
    max_weight: toNumber(form.maxWeight),
    weight_unit_id: form.weightUnitId ? Number(form.weightUnitId) : null,
    tare_weight: toNumber(form.tareWeight),
    tare_weight_unit_id: form.tareWeightUnitId ? Number(form.tareWeightUnitId) : null,
    sort_order: toNumber(form.sortOrder) ?? 0,
    is_active: form.isActive,
  }
}

export function PackagingTemplateModal({ isOpen, onClose, template, onSaved }: Props) {
  const { success: showSuccess, error: showError } = useToast()
  const [form, setForm] = useState<TemplateForm>(EMPTY)
  const [saving, setSaving] = useState(false)

  const { data: packagingUnits = [] } = useQuery({
    queryKey: ['units', 'packaging'],
    queryFn: () => unitsApi.list('packaging'),
    staleTime: 10 * 60 * 1000,
  })

  const { data: lengthUnits = [] } = useQuery({
    queryKey: ['units', 'length'],
    queryFn: () => unitsApi.list('length'),
    staleTime: 10 * 60 * 1000,
  })

  const { data: massUnits = [] } = useQuery({
    queryKey: ['units', 'mass'],
    queryFn: () => unitsApi.list('mass'),
    staleTime: 10 * 60 * 1000,
  })

  useEffect(() => {
    if (!isOpen) return

    const base = toForm(template)

    setForm({
      ...base,
      dimensionUnitId:
        base.dimensionUnitId || String(lengthUnits.find((unit) => unit.code === 'cm')?.id ?? ''),
      weightUnitId:
        base.weightUnitId || String(massUnits.find((unit) => unit.code === 'kg')?.id ?? ''),
      tareWeightUnitId:
        base.tareWeightUnitId || String(massUnits.find((unit) => unit.code === 'g')?.id ?? ''),
    })
  }, [isOpen, template, lengthUnits, massUnits])

  const set = <K extends keyof TemplateForm>(key: K, value: TemplateForm[K]) =>
    setForm((previous) => ({ ...previous, [key]: value }))

  const handleSave = async () => {
    if (!form.name.trim()) {
      showError('Give the packaging a name.')
      return
    }

    setSaving(true)

    try {
      if (template) {
        await packagingTemplatesApi.update(template.uuid, toPayload(form))
        showSuccess('Packaging updated')
      } else {
        await packagingTemplatesApi.create(toPayload(form))
        showSuccess('Packaging created')
      }

      onSaved()
      onClose()
    } catch (error) {
      if (isApiError(error) && error.errors) {
        showError(Object.values(error.errors).flat()[0] ?? error.message)
      } else {
        showError(isApiError(error) ? error.message : 'Failed to save the packaging')
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={template ? 'Edit packaging' : 'Add packaging'}
      maxWidth="3xl"
    >
      <div className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label className="font-medium text-gray-700 text-xs dark:text-gray-300">Name</Label>
            <Input
              value={form.name}
              onChange={(event) => set('name', event.target.value)}
              placeholder="Medium carton"
              className="h-10"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="font-medium text-gray-700 text-xs dark:text-gray-300">
              Code <span className="font-normal text-gray-400">(optional)</span>
            </Label>
            <Input
              value={form.code}
              onChange={(event) => set('code', event.target.value)}
              placeholder="medium-carton"
              className="h-10 font-mono"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="font-medium text-gray-700 text-xs dark:text-gray-300">Type</Label>
            <select
              value={form.packagingTypeUnitId}
              onChange={(event) => set('packagingTypeUnitId', event.target.value)}
              className={selectClass}
            >
              <option value="">Select packaging...</option>
              {packagingUnits.map((unit) => (
                <option key={unit.id} value={unit.id}>
                  {unit.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <Label className="font-medium text-gray-700 text-xs dark:text-gray-300">
              Sort order
            </Label>
            <Input
              type="number"
              min="0"
              value={form.sortOrder}
              onChange={(event) => set('sortOrder', event.target.value)}
              className="h-10"
            />
          </div>
        </div>

        <div className="space-y-3">
          <h3 className="font-medium text-gray-900 text-sm dark:text-white">Dimensions</h3>
          <div className="grid gap-3 sm:grid-cols-4">
            <div className="space-y-1.5">
              <Label className="font-medium text-gray-700 text-xs dark:text-gray-300">Length</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={form.length}
                onChange={(event) => set('length', event.target.value)}
                className="h-10"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="font-medium text-gray-700 text-xs dark:text-gray-300">Width</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={form.width}
                onChange={(event) => set('width', event.target.value)}
                className="h-10"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="font-medium text-gray-700 text-xs dark:text-gray-300">Height</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={form.height}
                onChange={(event) => set('height', event.target.value)}
                className="h-10"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="font-medium text-gray-700 text-xs dark:text-gray-300">Unit</Label>
              <select
                value={form.dimensionUnitId}
                onChange={(event) => set('dimensionUnitId', event.target.value)}
                className={selectClass}
              >
                <option value="">Unit...</option>
                {lengthUnits.map((unit) => (
                  <option key={unit.id} value={unit.id}>
                    {unit.symbol}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <h3 className="font-medium text-gray-900 text-sm dark:text-white">Weight</h3>
          <div className="grid gap-3 sm:grid-cols-4">
            <div className="space-y-1.5">
              <Label className="font-medium text-gray-700 text-xs dark:text-gray-300">
                Max payload
              </Label>
              <Input
                type="number"
                min="0"
                step="0.001"
                value={form.maxWeight}
                onChange={(event) => set('maxWeight', event.target.value)}
                className="h-10"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="font-medium text-gray-700 text-xs dark:text-gray-300">Unit</Label>
              <select
                value={form.weightUnitId}
                onChange={(event) => set('weightUnitId', event.target.value)}
                className={selectClass}
              >
                <option value="">Unit...</option>
                {massUnits.map((unit) => (
                  <option key={unit.id} value={unit.id}>
                    {unit.symbol}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label className="font-medium text-gray-700 text-xs dark:text-gray-300">
                Tare weight
              </Label>
              <Input
                type="number"
                min="0"
                step="0.001"
                value={form.tareWeight}
                onChange={(event) => set('tareWeight', event.target.value)}
                className="h-10"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="font-medium text-gray-700 text-xs dark:text-gray-300">Unit</Label>
              <select
                value={form.tareWeightUnitId}
                onChange={(event) => set('tareWeightUnitId', event.target.value)}
                className={selectClass}
              >
                <option value="">Unit...</option>
                {massUnits.map((unit) => (
                  <option key={unit.id} value={unit.id}>
                    {unit.symbol}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label className="font-medium text-gray-700 text-xs dark:text-gray-300">
              Description <span className="font-normal text-gray-400">(optional)</span>
            </Label>
            <Input
              value={form.description}
              onChange={(event) => set('description', event.target.value)}
              className="h-10"
            />
          </div>

          <label className="flex cursor-pointer items-center gap-3 self-end pb-2">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(event) => set('isActive', event.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="font-medium text-gray-700 text-sm dark:text-gray-200">Active</span>
          </label>
        </div>
      </div>

      <div className="mt-6 flex justify-end gap-2">
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : null}
          {template ? 'Update packaging' : 'Create packaging'}
        </Button>
      </div>
    </Modal>
  )
}
