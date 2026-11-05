import { useQuery } from '@tanstack/react-query'
import { Plus, Ruler, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { type Specification, specificationsApi } from '@/api/specifications'
import { type Unit, unitsApi } from '@/api/units'
import { Combobox, type ComboboxOption } from '@/components/ui/combobox'
import { Input } from '@/components/ui/input'

interface Spec {
  id: string
  key: string
  value: string
  unitId: number | null
  unitName: string
}

interface Props {
  data: { specs: Spec[] }
  onChange: (data: { specs: Spec[] }) => void
}

function unitLabel(unit: Unit): string {
  return `${unit.name} (${unit.symbol})`
}

export function SpecificationsStep({ data, onChange }: Props) {
  const [specKey, setSpecKey] = useState<string | null>(null)
  const [specValue, setSpecValue] = useState('')
  const [selectedUnit, setSelectedUnit] = useState<Unit | null>(null)

  const { data: units = [] } = useQuery({
    queryKey: ['units'],
    queryFn: () => unitsApi.list(),
    staleTime: 10 * 60 * 1000,
  })

  const { data: specifications = [], isLoading: specsLoading } = useQuery({
    queryKey: ['specifications', 'product'],
    queryFn: () => specificationsApi.list('product'),
    staleTime: 10 * 60 * 1000,
  })

  // Keys already on the product are hidden so a spec cannot be added twice.
  const usedKeys = useMemo(() => new Set(data.specs.map((spec) => spec.key)), [data.specs])

  const keyOptions = useMemo<ComboboxOption[]>(
    () =>
      specifications
        .filter((specification) => !usedKeys.has(specification.name))
        .map((specification) => ({
          value: specification.name,
          label: specification.name,
          group: specification.group,
          description: specification.description,
        })),
    [specifications, usedKeys]
  )

  const unitOptions = useMemo<ComboboxOption[]>(
    () =>
      units.map((unit) => ({
        value: String(unit.id),
        label: unitLabel(unit),
        group: unit.measurement?.name ?? 'Other',
      })),
    [units]
  )

  const suggestedUnit = (specification: Specification | undefined): Unit | null => {
    if (!specification?.unit) return null
    return units.find((unit) => unit.code === specification.unit) ?? null
  }

  const selectKey = (name: string | null) => {
    setSpecKey(name)
    setSelectedUnit(suggestedUnit(specifications.find((spec) => spec.name === name)))
  }

  const addSpec = () => {
    const key = specKey?.trim()
    const value = specValue.trim()
    if (!key || !value || usedKeys.has(key)) return

    onChange({
      specs: [
        ...data.specs,
        {
          id: `spec-${Date.now()}`,
          key,
          value,
          unitId: selectedUnit?.id ?? null,
          unitName: selectedUnit ? unitLabel(selectedUnit) : '',
        },
      ],
    })

    setSpecKey(null)
    setSpecValue('')
    setSelectedUnit(null)
  }

  const removeSpec = (id: string) => {
    onChange({ specs: data.specs.filter((s) => s.id !== id) })
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-100 dark:bg-indigo-900/30">
          <Ruler className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
        </div>
        <div>
          <h2 className="font-semibold text-gray-900 text-lg dark:text-white">Specifications</h2>
          <p className="text-gray-500 text-sm dark:text-gray-400">
            Pick a specification from the catalogue, then enter its value (optional)
          </p>
        </div>
      </div>

      {/* Add row */}
      <div className="flex flex-wrap gap-2">
        <Combobox
          options={keyOptions}
          value={specKey}
          onChange={selectKey}
          placeholder="Select specification"
          searchPlaceholder="Search specifications…"
          emptyMessage="No specifications available"
          loading={specsLoading}
          disabled={specsLoading}
          className="h-10 min-w-[180px] flex-[3]"
        />
        <Input
          value={specValue}
          onChange={(e) => setSpecValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              addSpec()
            }
          }}
          placeholder="Value (e.g. 250)"
          className="h-10 min-w-[100px] flex-[2]"
        />
        <Combobox
          options={unitOptions}
          value={selectedUnit ? String(selectedUnit.id) : null}
          onChange={(id) => setSelectedUnit(units.find((unit) => String(unit.id) === id) ?? null)}
          placeholder="Select unit"
          searchPlaceholder="Search units…"
          emptyMessage="No units found"
          allowClear
          className="h-10 min-w-[150px] flex-[2]"
        />
        <button
          type="button"
          onClick={addSpec}
          disabled={!specKey || !specValue.trim()}
          className="inline-flex h-10 items-center gap-1 rounded-lg bg-gray-100 px-3 font-medium text-gray-700 text-sm hover:bg-gray-200 disabled:opacity-50 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
        >
          <Plus className="h-4 w-4" /> Add
        </button>
      </div>

      {/* Spec list */}
      {data.specs.length === 0 ? (
        <div className="flex min-h-96 flex-col items-center justify-center rounded-lg border-2 border-gray-200 border-dashed py-10 text-gray-400 dark:border-gray-700">
          <Ruler className="mb-2 h-8 w-8" />
          <span className="text-sm">No specifications added yet</span>
          <span className="mt-1 text-xs">
            Pick from the catalogue above — dimensions, weight, voltage…
          </span>
        </div>
      ) : (
        <div className="min-h-96 space-y-2">
          {data.specs.map((spec) => (
            <div
              key={spec.id}
              className="flex items-center justify-between rounded-lg border border-gray-200 px-4 py-3 dark:border-gray-700"
            >
              <div className="flex items-center gap-2 text-sm">
                <span className="font-medium text-gray-700 dark:text-gray-200">{spec.key}</span>
                <span className="text-gray-400">&rarr;</span>
                <span className="text-gray-600 dark:text-gray-400">
                  {spec.value}
                  {spec.unitName && (
                    <span className="ml-1 text-gray-400 text-xs">{spec.unitName}</span>
                  )}
                </span>
              </div>
              <button
                type="button"
                onClick={() => removeSpec(spec.id)}
                className="text-gray-400 hover:text-red-500"
                aria-label={`Remove ${spec.key}`}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
