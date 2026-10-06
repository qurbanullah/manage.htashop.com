import { useQuery } from '@tanstack/react-query'
import { ChevronDown, Plus, Ruler, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { type Unit, unitsApi } from '@/api/units'
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

export function SpecificationsStep({ data, onChange }: Props) {
  const [specKey, setSpecKey] = useState('')
  const [specValue, setSpecValue] = useState('')
  const [selectedUnit, setSelectedUnit] = useState<Unit | null>(null)
  const [unitSearch, setUnitSearch] = useState('')
  const [unitDropdownOpen, setUnitDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const { data: units = [] } = useQuery({
    queryKey: ['units'],
    queryFn: () => unitsApi.list(),
    staleTime: 10 * 60 * 1000,
  })

  // Group units by measurement
  const groupedUnits = units.reduce<Record<string, Unit[]>>((acc, unit) => {
    const group = unit.measurement?.name ?? 'Other'
    if (!acc[group]) acc[group] = []
    acc[group].push(unit)
    return acc
  }, {})

  const filteredUnits = unitSearch
    ? units.filter(
        (u) =>
          u.name.toLowerCase().includes(unitSearch.toLowerCase()) ||
          u.symbol.toLowerCase().includes(unitSearch.toLowerCase()) ||
          u.code.toLowerCase().includes(unitSearch.toLowerCase())
      )
    : units

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setUnitDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const addSpec = () => {
    const key = specKey.trim()
    const value = specValue.trim()
    if (key && value) {
      const id = `spec-${Date.now()}`
      onChange({
        specs: [
          ...data.specs,
          {
            id,
            key,
            value,
            unitId: selectedUnit?.id ?? null,
            unitName: selectedUnit ? `${selectedUnit.name} (${selectedUnit.symbol})` : '',
          },
        ],
      })
      setSpecKey('')
      setSpecValue('')
      setSelectedUnit(null)
      setUnitSearch('')
    }
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
            Add technical specs with units of measurement (optional)
          </p>
        </div>
      </div>

      {/* Add row */}
      <div className="flex flex-wrap gap-2">
        <Input
          value={specKey}
          onChange={(e) => setSpecKey(e.target.value)}
          placeholder="Key (e.g. Weight)"
          className="h-10 min-w-[120px] flex-[2]"
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
        {/* Unit dropdown */}
        <div ref={dropdownRef} className="relative min-w-[160px] flex-[2]">
          <button
            type="button"
            onClick={() => setUnitDropdownOpen(!unitDropdownOpen)}
            className="flex h-10 w-full items-center justify-between rounded-lg border border-gray-300 bg-white px-3 text-gray-700 text-sm hover:border-gray-400 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:border-gray-500"
          >
            {selectedUnit ? (
              <span>
                <span className="font-medium">{selectedUnit.name}</span>
                <span className="ml-1 text-gray-400">({selectedUnit.symbol})</span>
              </span>
            ) : (
              <span className="text-gray-400">Select unit</span>
            )}
            <ChevronDown className="h-4 w-4 shrink-0 text-gray-400" />
          </button>

          {unitDropdownOpen && (
            <div className="absolute top-full left-0 z-20 mt-1 w-full overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-600 dark:bg-gray-800">
              <div className="border-gray-100 border-b p-2 dark:border-gray-700">
                <Input
                  value={unitSearch}
                  onChange={(e) => setUnitSearch(e.target.value)}
                  placeholder="Search units..."
                  className="h-8 text-xs"
                  autoFocus
                />
              </div>
              <div className="max-h-48 overflow-y-auto">
                {unitSearch ? (
                  filteredUnits.length === 0 ? (
                    <div className="px-3 py-4 text-center text-gray-400 text-xs">
                      No units found
                    </div>
                  ) : (
                    filteredUnits.map((unit) => (
                      <button
                        key={unit.id}
                        type="button"
                        onClick={() => {
                          setSelectedUnit(unit)
                          setUnitDropdownOpen(false)
                          setUnitSearch('')
                        }}
                        className="flex w-full items-center justify-between px-3 py-2 text-sm hover:bg-blue-50 dark:hover:bg-blue-900/20"
                      >
                        <span className="text-gray-700 dark:text-gray-300">{unit.name}</span>
                        <span className="text-gray-400 text-xs">{unit.symbol}</span>
                      </button>
                    ))
                  )
                ) : (
                  Object.entries(groupedUnits).map(([group, groupUnits]) => (
                    <div key={group}>
                      <div className="sticky top-0 bg-gray-50 px-3 py-1 font-semibold text-[10px] text-gray-400 uppercase dark:bg-gray-800/50">
                        {group}
                      </div>
                      {groupUnits.map((unit) => (
                        <button
                          key={unit.id}
                          type="button"
                          onClick={() => {
                            setSelectedUnit(unit)
                            setUnitDropdownOpen(false)
                          }}
                          className="flex w-full items-center justify-between px-4 py-2 text-sm hover:bg-blue-50 dark:hover:bg-blue-900/20"
                        >
                          <span className="text-gray-700 dark:text-gray-300">{unit.name}</span>
                          <span className="text-gray-400 text-xs">{unit.symbol}</span>
                        </button>
                      ))}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={addSpec}
          disabled={!specKey.trim() || !specValue.trim()}
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
          <span className="mt-1 text-xs">Add details like dimensions, weight, material, etc.</span>
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
