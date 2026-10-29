import { SlidersHorizontal } from 'lucide-react'
import type { BuyerForm } from '@/lib/punchout-buyer-form'
import { BuyerField, BuyerStepHeader } from './BuyerField'

interface Props {
  data: BuyerForm
  onChange: (data: Partial<BuyerForm>) => void
}

const TOGGLES: Array<{ key: keyof BuyerForm; label: string; description: string }> = [
  {
    key: 'hidePrices',
    label: 'Hide prices',
    description: 'Show the catalogue without prices in the buyer’s storefront.',
  },
  {
    key: 'allowReviews',
    label: 'Allow reviews',
    description: 'Let this buyer submit product reviews from punchout sessions.',
  },
  {
    key: 'customerPartNumberRequired',
    label: 'Require customer part number',
    description: 'Reject order lines that arrive without the buyer’s own part number.',
  },
]

export function BuyerDefaultsStep({ data, onChange }: Props) {
  return (
    <div className="space-y-5">
      <BuyerStepHeader
        icon={SlidersHorizontal}
        title="Catalog Defaults"
        description="Presentation defaults and order limits applied to this buyer"
        tone="emerald"
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <BuyerField
          label="Currency"
          value={data.defaultCurrency}
          onChange={(value) => onChange({ defaultCurrency: value })}
          placeholder="USD"
          hint="ISO 4217, three letters. Blank uses the tenant default."
        />
        <BuyerField
          label="Locale"
          value={data.defaultLocale}
          onChange={(value) => onChange({ defaultLocale: value })}
          placeholder="en"
          hint="e.g. en, ur, de. Blank uses the tenant default."
        />
        <BuyerField
          label="Max line items"
          value={data.maxLineItems}
          onChange={(value) => onChange({ maxLineItems: value })}
          type="number"
          min="1"
          hint="Maximum distinct lines allowed in one order."
        />
        <BuyerField
          label="Max quantity per line"
          value={data.maxQuantityPerLine}
          onChange={(value) => onChange({ maxQuantityPerLine: value })}
          type="number"
          min="1"
          hint="Upper bound for a single order line."
        />
      </div>

      <div className="space-y-2">
        <h3 className="font-semibold text-gray-900 text-sm dark:text-white">Behavior</h3>
        {TOGGLES.map((toggle) => (
          <label
            key={toggle.key}
            className="flex cursor-pointer items-start gap-3 rounded-lg border border-gray-200 p-4 transition-colors hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600"
          >
            <input
              type="checkbox"
              checked={Boolean(data[toggle.key])}
              onChange={(event) =>
                onChange({ [toggle.key]: event.target.checked } as Partial<BuyerForm>)
              }
              className="mt-0.5 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span>
              <span className="block font-medium text-gray-700 text-sm dark:text-gray-200">
                {toggle.label}
              </span>
              <span className="block text-gray-400 text-xs dark:text-gray-500">
                {toggle.description}
              </span>
            </span>
          </label>
        ))}
      </div>
    </div>
  )
}
