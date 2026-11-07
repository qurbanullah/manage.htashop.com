import { Trash2 } from 'lucide-react'
import type { PackagingTemplate } from '@/api/shippingConfig'
import { Input } from '@/components/ui/input'

export interface ParcelDraft {
  id: string
  packagingTemplateId: string
  length: string
  width: string
  height: string
  weight: string
  trackingNumber: string
}

let parcelSequence = 0

export function newParcel(): ParcelDraft {
  parcelSequence += 1

  return {
    id: `parcel-${parcelSequence}`,
    packagingTemplateId: '',
    length: '',
    width: '',
    height: '',
    weight: '',
    trackingNumber: '',
  }
}

const selectClass =
  'h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm dark:border-gray-600 dark:bg-gray-800'

interface Props {
  parcel: ParcelDraft
  index: number
  templates: PackagingTemplate[]
  onChange: (parcel: ParcelDraft) => void
  onRemove: () => void
}

/**
 * One box. Choosing a template copies its dimensions in; the packed weight is
 * always entered by the operator because only they know what went inside.
 */
export function ParcelDraftRow({ parcel, index, templates, onChange, onRemove }: Props) {
  const set = (partial: Partial<ParcelDraft>) => onChange({ ...parcel, ...partial })

  const selectTemplate = (value: string) => {
    const template = templates.find((candidate) => String(candidate.id) === value)

    set({
      packagingTemplateId: value,
      length: template?.length_cm != null ? String(template.length_cm) : parcel.length,
      width: template?.width_cm != null ? String(template.width_cm) : parcel.width,
      height: template?.height_cm != null ? String(template.height_cm) : parcel.height,
    })
  }

  return (
    <div className="space-y-2 rounded-lg border border-gray-200 p-3 dark:border-gray-700">
      <div className="flex items-center justify-between gap-2">
        <span className="font-medium text-gray-700 text-xs dark:text-gray-300">
          Box {index + 1}
        </span>
        <button
          type="button"
          onClick={onRemove}
          aria-label="Remove box"
          className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <select
          value={parcel.packagingTemplateId}
          onChange={(event) => selectTemplate(event.target.value)}
          className={selectClass}
          aria-label="Packaging"
        >
          <option value="">Custom box</option>
          {templates.map((template) => (
            <option key={template.id} value={template.id}>
              {template.name}
            </option>
          ))}
        </select>

        <Input
          type="number"
          min="0"
          step="0.001"
          value={parcel.weight}
          onChange={(event) => set({ weight: event.target.value })}
          placeholder="Packed weight (kg)"
          aria-label="Packed weight in kilograms"
          className="h-10"
        />
      </div>

      <div className="grid gap-2 sm:grid-cols-4">
        <Input
          type="number"
          min="0"
          step="0.01"
          value={parcel.length}
          onChange={(event) => set({ length: event.target.value })}
          placeholder="L (cm)"
          aria-label="Length in centimetres"
          className="h-10"
        />
        <Input
          type="number"
          min="0"
          step="0.01"
          value={parcel.width}
          onChange={(event) => set({ width: event.target.value })}
          placeholder="W (cm)"
          aria-label="Width in centimetres"
          className="h-10"
        />
        <Input
          type="number"
          min="0"
          step="0.01"
          value={parcel.height}
          onChange={(event) => set({ height: event.target.value })}
          placeholder="H (cm)"
          aria-label="Height in centimetres"
          className="h-10"
        />
        <Input
          value={parcel.trackingNumber}
          onChange={(event) => set({ trackingNumber: event.target.value })}
          placeholder="Box tracking (optional)"
          aria-label="Box tracking number"
          className="h-10"
        />
      </div>
    </div>
  )
}
