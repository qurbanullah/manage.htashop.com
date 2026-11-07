import { useQuery } from '@tanstack/react-query'
import {
  AlertTriangle,
  Boxes,
  Info,
  Package,
  Plus,
  Ruler,
  Scale,
  Trash2,
  Truck,
} from 'lucide-react'
import { definitionsApi } from '@/api/definitions'
import type { ProductShipping, ProductShippingPayload } from '@/api/shipping'
import { type Unit, unitsApi } from '@/api/units'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

export interface ShippingContentRow {
  id: string
  name: string
  qty: string
}

export interface ShippingFormData {
  netWeight: string
  grossWeight: string
  weightUnitId: string
  length: string
  width: string
  height: string
  dimensionUnitId: string
  packagingTypeUnitId: string
  unitsPerCase: string
  shipsAlone: boolean
  isFragile: boolean
  isStackable: boolean
  isHazmat: boolean
  unNumber: string
  hazardClassOptionId: string
  packingGroupOptionId: string
  handlingNotes: string
  contents: ShippingContentRow[]
}

export const EMPTY_SHIPPING_FORM: ShippingFormData = {
  netWeight: '',
  grossWeight: '',
  weightUnitId: '',
  length: '',
  width: '',
  height: '',
  dimensionUnitId: '',
  packagingTypeUnitId: '',
  unitsPerCase: '1',
  shipsAlone: false,
  isFragile: false,
  isStackable: true,
  isHazmat: false,
  unNumber: '',
  hazardClassOptionId: '',
  packingGroupOptionId: '',
  handlingNotes: '',
  contents: [],
}

let rowSequence = 0

function nextRowId(): string {
  rowSequence += 1
  return `ship-row-${rowSequence}`
}

function numberOrNull(value: string): number | null {
  const trimmed = value.trim()
  if (!trimmed) return null
  const parsed = Number(trimmed)
  return Number.isFinite(parsed) ? parsed : null
}

/** Maps the server record onto the wizard's string-based form state. */
export function shippingFormFromApi(record: ProductShipping | null): ShippingFormData {
  if (!record) return { ...EMPTY_SHIPPING_FORM, contents: [] }

  return {
    netWeight: record.net_weight != null ? String(record.net_weight) : '',
    grossWeight: record.gross_weight != null ? String(record.gross_weight) : '',
    weightUnitId: record.weight_unit_id != null ? String(record.weight_unit_id) : '',
    length: record.length != null ? String(record.length) : '',
    width: record.width != null ? String(record.width) : '',
    height: record.height != null ? String(record.height) : '',
    dimensionUnitId: record.dimension_unit_id != null ? String(record.dimension_unit_id) : '',
    packagingTypeUnitId:
      record.packaging_type_unit_id != null ? String(record.packaging_type_unit_id) : '',
    unitsPerCase: record.units_per_case ? String(record.units_per_case) : '1',
    shipsAlone: record.ships_alone,
    isFragile: record.is_fragile,
    isStackable: record.is_stackable,
    isHazmat: record.is_hazmat,
    unNumber: record.un_number ?? '',
    hazardClassOptionId:
      record.hazard_class_option_id != null ? String(record.hazard_class_option_id) : '',
    packingGroupOptionId:
      record.packing_group_option_id != null ? String(record.packing_group_option_id) : '',
    handlingNotes: record.handling_notes ?? '',
    contents: (record.contents ?? []).map((item) => ({
      id: nextRowId(),
      name: item.name,
      qty: item.qty != null ? String(item.qty) : '',
    })),
  }
}

/** Converts the form state into the API write payload. */
export function shippingPayloadFromForm(form: ShippingFormData): ProductShippingPayload {
  const contents = form.contents
    .map((row) => ({ name: row.name.trim(), qty: numberOrNull(row.qty) }))
    .filter((row) => row.name.length > 0)

  return {
    net_weight: numberOrNull(form.netWeight),
    gross_weight: numberOrNull(form.grossWeight),
    weight_unit_id: form.weightUnitId ? Number(form.weightUnitId) : null,

    length: numberOrNull(form.length),
    width: numberOrNull(form.width),
    height: numberOrNull(form.height),
    dimension_unit_id: form.dimensionUnitId ? Number(form.dimensionUnitId) : null,

    packaging_type_unit_id: form.packagingTypeUnitId ? Number(form.packagingTypeUnitId) : null,
    units_per_case: form.unitsPerCase ? Number(form.unitsPerCase) : 1,

    ships_alone: form.shipsAlone,
    is_fragile: form.isFragile,
    is_stackable: form.isStackable,
    is_hazmat: form.isHazmat,

    un_number: form.unNumber.trim() || null,
    hazard_class_option_id:
      form.isHazmat && form.hazardClassOptionId ? Number(form.hazardClassOptionId) : null,
    packing_group_option_id:
      form.isHazmat && form.packingGroupOptionId ? Number(form.packingGroupOptionId) : null,

    handling_notes: form.handlingNotes.trim() || null,
    contents,
  }
}

/** True when the editor entered anything worth persisting. */
export function hasShippingData(form: ShippingFormData): boolean {
  return Boolean(
    form.netWeight.trim() ||
      form.grossWeight.trim() ||
      form.length.trim() ||
      form.width.trim() ||
      form.height.trim() ||
      form.packagingTypeUnitId ||
      form.contents.some((row) => row.name.trim())
  )
}

function toBase(value: number | null, unit: Unit | undefined): number | null {
  if (value == null || !unit) return null
  const factor = Number(unit.factor ?? 0)
  if (!factor) return null
  return (value + Number(unit.offset ?? 0)) * factor
}

interface BillableWeight {
  grossKg: number | null
  volumetricKg: number | null
}

/**
 * Mirrors the backend's normalisation so the editor sees the carrier-facing
 * numbers before saving. Volumetric divisor is 5000 cm³/kg.
 */
function computeBillableWeight(
  form: ShippingFormData,
  massUnits: Unit[],
  lengthUnits: Unit[]
): BillableWeight {
  const massUnit = massUnits.find((unit) => String(unit.id) === form.weightUnitId)
  const lengthUnit = lengthUnits.find((unit) => String(unit.id) === form.dimensionUnitId)
  const kgUnit = massUnits.find((unit) => unit.code === 'kg')
  const cmUnit = lengthUnits.find((unit) => unit.code === 'cm')

  const kgFactor = Number(kgUnit?.factor ?? 1) || 1

  const baseMass = toBase(numberOrNull(form.grossWeight), massUnit)
  const grossKg = baseMass != null ? Math.round((baseMass / kgFactor) * 1000) / 1000 : null

  const baseLength = toBase(numberOrNull(form.length), lengthUnit)
  const baseWidth = toBase(numberOrNull(form.width), lengthUnit)
  const baseHeight = toBase(numberOrNull(form.height), lengthUnit)
  const cmFactor = Number(cmUnit?.factor ?? 0.01) || 0.01

  if (baseLength == null || baseWidth == null || baseHeight == null) {
    return { grossKg, volumetricKg: null }
  }

  const volumeCm3 = (baseLength / cmFactor) * (baseWidth / cmFactor) * (baseHeight / cmFactor)

  return { grossKg, volumetricKg: Math.round((volumeCm3 / 5000) * 1000) / 1000 }
}

function formatKg(value: number | null): string {
  return value == null ? '—' : `${value.toFixed(3)} kg`
}

const selectClass =
  'h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm dark:border-gray-600 dark:bg-gray-800'

interface Props {
  data: ShippingFormData
  onChange: (data: ShippingFormData) => void
}

export function ProductShippingStep({ data, onChange }: Props) {
  const { data: massUnits = [] } = useQuery({
    queryKey: ['units', 'mass'],
    queryFn: () => unitsApi.list('mass'),
    staleTime: 10 * 60 * 1000,
  })

  const { data: lengthUnits = [] } = useQuery({
    queryKey: ['units', 'length'],
    queryFn: () => unitsApi.list('length'),
    staleTime: 10 * 60 * 1000,
  })

  const { data: packagingUnits = [] } = useQuery({
    queryKey: ['units', 'packaging'],
    queryFn: () => unitsApi.list('packaging'),
    staleTime: 10 * 60 * 1000,
  })

  const { data: packagingDefinitions = [] } = useQuery({
    queryKey: ['definitions', 'product', 'packaging'],
    queryFn: () => definitionsApi.list('product', 'packaging'),
    staleTime: 10 * 60 * 1000,
  })

  const hazardClasses =
    packagingDefinitions.find((definition) => definition.code === 'pkg_hazard_class')?.options ?? []
  const packingGroups =
    packagingDefinitions.find((definition) => definition.code === 'pkg_packing_group')?.options ??
    []

  const { grossKg, volumetricKg } = computeBillableWeight(data, massUnits, lengthUnits)
  const billableKg =
    grossKg == null && volumetricKg == null ? null : Math.max(grossKg ?? 0, volumetricKg ?? 0)

  const set = <K extends keyof ShippingFormData>(key: K, value: ShippingFormData[K]) =>
    onChange({ ...data, [key]: value })

  const updateContent = (id: string, partial: Partial<ShippingContentRow>) =>
    set(
      'contents',
      data.contents.map((row) => (row.id === id ? { ...row, ...partial } : row))
    )

  const addContent = () =>
    set('contents', [...data.contents, { id: nextRowId(), name: '', qty: '1' }])

  const removeContent = (id: string) =>
    set(
      'contents',
      data.contents.filter((row) => row.id !== id)
    )

  return (
    <div className="w-full space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
          <Truck className="h-5 w-5 text-blue-600 dark:text-blue-400" />
        </div>
        <div>
          <h2 className="font-semibold text-gray-900 text-lg dark:text-white">
            Shipping &amp; Packaging
          </h2>
          <p className="text-gray-500 text-sm dark:text-gray-400">
            Weights, dimensions and handling rules used to price and pack this product.
          </p>
        </div>
      </div>

      {/* Weights */}
      <section className="rounded-xl border border-gray-200 p-4 dark:border-gray-700">
        <div className="mb-3 flex items-center gap-2">
          <Scale className="h-4 w-4 text-gray-400" />
          <h3 className="font-medium text-gray-800 text-sm dark:text-gray-200">Weight</h3>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label className="font-medium text-gray-700 text-sm dark:text-gray-300">
              Net weight
            </Label>
            <Input
              type="number"
              min="0"
              step="0.001"
              value={data.netWeight}
              onChange={(event) => set('netWeight', event.target.value)}
              placeholder="e.g. 1.2"
              className="h-11"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="font-medium text-gray-700 text-sm dark:text-gray-300">
              Gross weight <span className="font-normal text-gray-400">(with packaging)</span>
            </Label>
            <Input
              type="number"
              min="0"
              step="0.001"
              value={data.grossWeight}
              onChange={(event) => set('grossWeight', event.target.value)}
              placeholder="e.g. 1.5"
              className="h-11"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="font-medium text-gray-700 text-sm dark:text-gray-300">Unit</Label>
            <select
              value={data.weightUnitId}
              onChange={(event) => set('weightUnitId', event.target.value)}
              className={selectClass}
            >
              <option value="">Select unit...</option>
              {massUnits.map((unit) => (
                <option key={unit.id} value={unit.id}>
                  {unit.name} ({unit.symbol})
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      {/* Dimensions */}
      <section className="rounded-xl border border-gray-200 p-4 dark:border-gray-700">
        <div className="mb-3 flex items-center gap-2">
          <Ruler className="h-4 w-4 text-gray-400" />
          <h3 className="font-medium text-gray-800 text-sm dark:text-gray-200">
            Package dimensions
          </h3>
        </div>

        <div className="grid gap-4 sm:grid-cols-4">
          {(
            [
              ['length', 'Length'],
              ['width', 'Width'],
              ['height', 'Height'],
            ] as const
          ).map(([key, label]) => (
            <div key={key} className="space-y-1.5">
              <Label className="font-medium text-gray-700 text-sm dark:text-gray-300">
                {label}
              </Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={data[key]}
                onChange={(event) => set(key, event.target.value)}
                placeholder="0"
                className="h-11"
              />
            </div>
          ))}

          <div className="space-y-1.5">
            <Label className="font-medium text-gray-700 text-sm dark:text-gray-300">Unit</Label>
            <select
              value={data.dimensionUnitId}
              onChange={(event) => set('dimensionUnitId', event.target.value)}
              className={selectClass}
            >
              <option value="">Select unit...</option>
              {lengthUnits.map((unit) => (
                <option key={unit.id} value={unit.id}>
                  {unit.name} ({unit.symbol})
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      {/* Packaging */}
      <section className="rounded-xl border border-gray-200 p-4 dark:border-gray-700">
        <div className="mb-3 flex items-center gap-2">
          <Package className="h-4 w-4 text-gray-400" />
          <h3 className="font-medium text-gray-800 text-sm dark:text-gray-200">Packaging</h3>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label className="font-medium text-gray-700 text-sm dark:text-gray-300">
              Packaging type
            </Label>
            <select
              value={data.packagingTypeUnitId}
              onChange={(event) => set('packagingTypeUnitId', event.target.value)}
              className={selectClass}
            >
              <option value="">Select packaging...</option>
              {packagingUnits.map((unit) => (
                <option key={unit.id} value={unit.id}>
                  {unit.name} ({unit.symbol})
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <Label className="font-medium text-gray-700 text-sm dark:text-gray-300">
              Units per case
            </Label>
            <Input
              type="number"
              min="1"
              step="1"
              value={data.unitsPerCase}
              onChange={(event) => set('unitsPerCase', event.target.value)}
              placeholder="1"
              className="h-11"
            />
          </div>
        </div>
      </section>

      {/* Handling flags */}
      <section className="rounded-xl border border-gray-200 p-4 dark:border-gray-700">
        <div className="mb-3 flex items-center gap-2">
          <Boxes className="h-4 w-4 text-gray-400" />
          <h3 className="font-medium text-gray-800 text-sm dark:text-gray-200">Handling</h3>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {(
            [
              [
                'shipsAlone',
                'Ships separately',
                'Cannot be combined with other items in one parcel',
              ],
              ['isFragile', 'Fragile', 'Needs protective packing material'],
              ['isStackable', 'Stackable', 'May be stacked with other parcels'],
              ['isHazmat', 'Dangerous goods', 'Requires UN number and hazard classification'],
            ] as const
          ).map(([key, label, hint]) => (
            <label
              key={key}
              className="flex cursor-pointer items-start gap-3 rounded-lg border border-gray-200 px-3 py-2.5 dark:border-gray-700"
            >
              <input
                type="checkbox"
                checked={data[key]}
                onChange={(event) => set(key, event.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span>
                <span className="block font-medium text-gray-700 text-sm dark:text-gray-200">
                  {label}
                </span>
                <span className="block text-gray-400 text-xs">{hint}</span>
              </span>
            </label>
          ))}
        </div>

        {data.isHazmat && (
          <div className="mt-4 grid gap-4 rounded-lg border border-amber-200 bg-amber-50 p-3 sm:grid-cols-3 dark:border-amber-900/40 dark:bg-amber-900/10">
            <div className="space-y-1.5">
              <Label className="font-medium text-gray-700 text-sm dark:text-gray-300">
                UN number
              </Label>
              <Input
                value={data.unNumber}
                onChange={(event) => set('unNumber', event.target.value)}
                placeholder="e.g. UN1263"
                className="h-11 font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="font-medium text-gray-700 text-sm dark:text-gray-300">
                Hazard class
              </Label>
              <select
                value={data.hazardClassOptionId}
                onChange={(event) => set('hazardClassOptionId', event.target.value)}
                className={selectClass}
              >
                <option value="">Select class...</option>
                {hazardClasses.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label className="font-medium text-gray-700 text-sm dark:text-gray-300">
                Packing group
              </Label>
              <select
                value={data.packingGroupOptionId}
                onChange={(event) => set('packingGroupOptionId', event.target.value)}
                className={selectClass}
              >
                <option value="">Select group...</option>
                {packingGroups.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.name}
                  </option>
                ))}
              </select>
            </div>

            <p className="flex items-start gap-1.5 text-amber-700 text-xs sm:col-span-3 dark:text-amber-400">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              Dangerous goods are currently limited to domestic ground transport.
            </p>
          </div>
        )}
      </section>

      {/* Handling notes */}
      <section className="rounded-xl border border-gray-200 p-4 dark:border-gray-700">
        <div className="mb-3 flex items-center gap-2">
          <Info className="h-4 w-4 text-gray-400" />
          <h3 className="font-medium text-gray-800 text-sm dark:text-gray-200">Handling notes</h3>
        </div>
        <Textarea
          value={data.handlingNotes}
          onChange={(event) => set('handlingNotes', event.target.value)}
          placeholder="Instructions for the warehouse team, e.g. ‘This way up. Do not expose to moisture.’"
          rows={3}
        />
      </section>

      {/* In the box */}
      <section className="rounded-xl border border-gray-200 p-4 dark:border-gray-700">
        <div className="mb-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Package className="h-4 w-4 text-gray-400" />
            <h3 className="font-medium text-gray-800 text-sm dark:text-gray-200">
              What's in the box
            </h3>
          </div>
          <button
            type="button"
            onClick={addContent}
            className="inline-flex items-center gap-1 rounded-lg px-2 py-1 font-medium text-blue-600 text-xs hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/20"
          >
            <Plus className="h-3.5 w-3.5" /> Add item
          </button>
        </div>

        {data.contents.length === 0 ? (
          <p className="rounded-lg bg-gray-50 p-3 text-gray-400 text-xs dark:bg-gray-800">
            Nothing listed yet. Adding the box contents helps customers know what to expect.
          </p>
        ) : (
          <div className="space-y-2">
            {data.contents.map((row) => (
              <div key={row.id} className="flex items-center gap-2">
                <Input
                  value={row.name}
                  onChange={(event) => updateContent(row.id, { name: event.target.value })}
                  placeholder="Item name, e.g. Carry case"
                  className="h-10 flex-1"
                />
                <Input
                  type="number"
                  min="1"
                  step="1"
                  value={row.qty}
                  onChange={(event) => updateContent(row.id, { qty: event.target.value })}
                  placeholder="Qty"
                  className="h-10 w-20"
                />
                <button
                  type="button"
                  onClick={() => removeContent(row.id)}
                  aria-label="Remove item"
                  className="rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {billableKg != null && (
        <div className="flex flex-wrap items-center gap-x-6 gap-y-1 rounded-xl bg-gray-50 px-4 py-3 text-xs dark:bg-gray-800/60">
          <span className="font-medium text-gray-700 dark:text-gray-200">
            Billable weight: <span className="font-semibold">{formatKg(billableKg)}</span>
          </span>
          <span className="text-gray-500 dark:text-gray-400">
            Actual {formatKg(grossKg)} · volumetric {formatKg(volumetricKg)}
          </span>
        </div>
      )}
    </div>
  )
}
