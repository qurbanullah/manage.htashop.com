import { ListChecks, Ruler } from 'lucide-react'

interface Props {
  product: {
    features?: Array<{ id: number; name: string; slug: string }>
    metadata?: Record<string, unknown>
  }
}

export function FeaturesTab({ product }: Props) {
  const metadata = (product.metadata as Record<string, unknown>) ?? {}
  const features = (product.features ?? []).map((f) => f.name)
  const specs = (metadata.specs as Array<{ key: string; value: string; unit_name?: string }>) ?? []

  return (
    <div className="space-y-6">
      {/* Features */}
      <div>
        <div className="mb-3 flex items-center gap-2">
          <ListChecks className="h-4 w-4 text-teal-600" />
          <h3 className="font-semibold text-gray-700 text-sm dark:text-gray-200">Features</h3>
        </div>
        {features.length === 0 ? (
          <p className="text-gray-400 text-xs">No features added.</p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {features.map((f) => (
              <span
                key={f}
                className="inline-flex items-center rounded-full bg-teal-100 px-2.5 py-0.5 font-medium text-teal-700 text-xs dark:bg-teal-900/30 dark:text-teal-300"
              >
                {f}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Specifications */}
      <div>
        <div className="mb-3 flex items-center gap-2">
          <Ruler className="h-4 w-4 text-indigo-600" />
          <h3 className="font-semibold text-gray-700 text-sm dark:text-gray-200">Specifications</h3>
        </div>
        {specs.length === 0 ? (
          <p className="text-gray-400 text-xs">No specifications added.</p>
        ) : (
          <div className="space-y-2">
            {specs.map((s, i) => (
              <div
                // biome-ignore lint/suspicious/noArrayIndexKey: spec entries have no stable identifier
                key={i}
                className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm dark:border-gray-700"
              >
                <span className="font-medium text-gray-700 dark:text-gray-200">{s.key}</span>
                <span className="text-gray-400">&rarr;</span>
                <span className="text-gray-600 dark:text-gray-400">
                  {s.value}
                  {s.unit_name && <span className="ml-1 text-gray-400 text-xs">{s.unit_name}</span>}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
