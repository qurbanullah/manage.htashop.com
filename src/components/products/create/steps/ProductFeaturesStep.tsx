import { useQuery } from '@tanstack/react-query'
import { ListChecks, Plus, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { type Feature, featuresApi } from '@/api/features'
import { Input } from '@/components/ui/input'
import { MultiSelect } from '@/components/ui/multi-select'

interface Props {
  data: { featureNames: string[]; categoryIds?: number[] }
  onChange: (data: { featureNames: string[] }) => void
}

interface ChipGroupProps {
  features: Feature[]
  selected: string[]
  onToggle: (name: string) => void
}

function ChipGroup({ features, selected, onToggle }: ChipGroupProps) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {features.map((feature) => {
        const active = selected.includes(feature.name)

        return (
          <button
            key={feature.id}
            type="button"
            onClick={() => onToggle(feature.name)}
            className={`rounded-full px-3 py-1 font-medium text-xs transition-colors ${
              active
                ? 'border border-teal-300 bg-teal-100 text-teal-700 dark:border-teal-700 dark:bg-teal-900/30 dark:text-teal-300'
                : 'border border-gray-200 bg-gray-100 text-gray-600 hover:bg-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
            }`}
          >
            {feature.name}
          </button>
        )
      })}
    </div>
  )
}

export function FeaturesStep({ data, onChange }: Props) {
  const [customFeature, setCustomFeature] = useState('')
  const [showCustomInput, setShowCustomInput] = useState(false)
  const categoryId = data.categoryIds?.[0]

  // Features are a shared vocabulary: the API always returns all of them and
  // flags the ones recommended for the selected category.
  const { data: features = [], isLoading } = useQuery({
    queryKey: ['features', categoryId ?? 'all'],
    queryFn: () => featuresApi.list(categoryId),
  })

  const recommended = useMemo(
    () => features.filter((feature) => feature.matches_category),
    [features]
  )

  const options = useMemo(
    () =>
      features.map((feature) => ({
        value: feature.name,
        label: feature.name,
        hint: feature.matches_category ? 'Recommended' : undefined,
      })),
    [features]
  )

  const toggleFeature = (name: string) => {
    const names = data.featureNames.includes(name)
      ? data.featureNames.filter((f) => f !== name)
      : [...data.featureNames, name]
    onChange({ featureNames: names })
  }

  /**
   * Custom names are a last resort, so normalise the input and fold it into the
   * existing vocabulary when the user typed a near-duplicate.
   */
  const addCustomFeature = () => {
    const typed = customFeature.trim().replace(/\s+/g, ' ')
    if (!typed) return

    const match = features.find((feature) => feature.name.toLowerCase() === typed.toLowerCase())
    const name = match?.name ?? typed

    if (!data.featureNames.includes(name)) {
      onChange({ featureNames: [...data.featureNames, name] })
    }

    setCustomFeature('')
    setShowCustomInput(false)
  }

  const removeFeature = (name: string) => {
    onChange({ featureNames: data.featureNames.filter((f) => f !== name) })
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal-100 dark:bg-teal-900/30">
          <ListChecks className="h-5 w-5 text-teal-600 dark:text-teal-400" />
        </div>
        <div>
          <h2 className="font-semibold text-gray-900 text-lg dark:text-white">Features</h2>
          <p className="text-gray-500 text-sm dark:text-gray-400">
            Highlight what makes your product stand out
          </p>
        </div>
      </div>

      <MultiSelect
        options={options}
        selected={data.featureNames}
        onChange={(names) => onChange({ featureNames: names })}
        placeholder="Search and add features…"
        searchPlaceholder="Search all features…"
        emptyMessage="No feature matches. Add it as a custom feature below."
        loading={isLoading}
        disabled={isLoading}
      />

      {!isLoading && recommended.length > 0 && (
        <div>
          <h3 className="mb-2 font-semibold text-gray-700 text-sm dark:text-gray-200">
            Recommended for this category{' '}
            <span className="font-normal text-gray-400">({recommended.length})</span>
          </h3>
          <ChipGroup features={recommended} selected={data.featureNames} onToggle={toggleFeature} />
        </div>
      )}

      {data.featureNames.length > 0 && (
        <div>
          <h3 className="mb-2 font-semibold text-gray-700 text-sm dark:text-gray-200">
            Selected <span className="font-normal text-gray-400">({data.featureNames.length})</span>
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {data.featureNames.map((name) => (
              <span
                key={name}
                className="inline-flex items-center gap-1 rounded-full bg-teal-100 px-2.5 py-0.5 font-medium text-teal-700 text-xs dark:bg-teal-900/30 dark:text-teal-300"
              >
                {name}
                <button
                  type="button"
                  onClick={() => removeFeature(name)}
                  className="hover:text-red-500"
                  aria-label={`Remove ${name}`}
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Custom feature — deliberately low-key so the shared vocabulary is used first. */}
      <div>
        {showCustomInput ? (
          <div className="flex gap-2">
            <Input
              autoFocus
              value={customFeature}
              onChange={(e) => setCustomFeature(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  addCustomFeature()
                }
                if (e.key === 'Escape') {
                  setShowCustomInput(false)
                  setCustomFeature('')
                }
              }}
              placeholder="Name the feature"
              className="h-9 flex-1"
            />
            <button
              type="button"
              onClick={addCustomFeature}
              disabled={!customFeature.trim()}
              className="inline-flex items-center gap-1 rounded-lg bg-gray-100 px-3 font-medium text-gray-700 text-xs hover:bg-gray-200 disabled:opacity-50 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
            >
              <Plus className="h-3.5 w-3.5" /> Add
            </button>
            <button
              type="button"
              onClick={() => {
                setShowCustomInput(false)
                setCustomFeature('')
              }}
              className="rounded-lg px-2 text-gray-400 text-xs hover:text-gray-600 dark:hover:text-gray-200"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setShowCustomInput(true)}
            className="inline-flex items-center gap-1 text-gray-500 text-xs underline-offset-2 hover:text-teal-600 hover:underline dark:text-gray-400 dark:hover:text-teal-400"
          >
            <Plus className="h-3 w-3" /> Add new feature
          </button>
        )}
      </div>
    </div>
  )
}
