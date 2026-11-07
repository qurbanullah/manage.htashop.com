import { Plus, Trash2 } from 'lucide-react'
import { Input } from '@/components/ui/input'

export interface TierDraft {
  id: string
  min: string
  max: string
  amount: string
}

let tierSequence = 0

export function newTier(min = '', max = '', amount = ''): TierDraft {
  tierSequence += 1
  return { id: `tier-${tierSequence}`, min, max, amount }
}

interface Props {
  tiers: TierDraft[]
  onChange: (tiers: TierDraft[]) => void
}

/**
 * Weight brackets for a tiered rate.
 *
 * The lower bound is inclusive and the upper bound exclusive; leaving the
 * upper bound blank makes the last bracket open-ended.
 */
export function RateTiersEditor({ tiers, onChange }: Props) {
  const update = (id: string, partial: Partial<TierDraft>) =>
    onChange(tiers.map((tier) => (tier.id === id ? { ...tier, ...partial } : tier)))

  const remove = (id: string) => onChange(tiers.filter((tier) => tier.id !== id))

  return (
    <div className="space-y-2">
      {tiers.length === 0 ? (
        <p className="rounded-lg bg-gray-50 p-3 text-gray-400 text-xs dark:bg-gray-800">
          Add at least one bracket, e.g. 0–2 kg for PKR 250.
        </p>
      ) : (
        tiers.map((tier) => (
          <div key={tier.id} className="flex items-center gap-2">
            <Input
              type="number"
              min="0"
              step="0.001"
              value={tier.min}
              onChange={(event) => update(tier.id, { min: event.target.value })}
              placeholder="From kg"
              aria-label="Minimum weight in kilograms"
              className="h-10"
            />
            <span className="text-gray-400 text-xs">to</span>
            <Input
              type="number"
              min="0"
              step="0.001"
              value={tier.max}
              onChange={(event) => update(tier.id, { max: event.target.value })}
              placeholder="Open"
              aria-label="Maximum weight in kilograms"
              className="h-10"
            />
            <Input
              type="number"
              min="0"
              step="0.01"
              value={tier.amount}
              onChange={(event) => update(tier.id, { amount: event.target.value })}
              placeholder="Amount"
              aria-label="Bracket amount"
              className="h-10"
            />
            <button
              type="button"
              onClick={() => remove(tier.id)}
              aria-label="Remove bracket"
              className="rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))
      )}

      <button
        type="button"
        onClick={() => onChange([...tiers, newTier()])}
        className="inline-flex items-center gap-1 rounded-lg px-2 py-1 font-medium text-blue-600 text-xs hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/20"
      >
        <Plus className="h-3.5 w-3.5" /> Add bracket
      </button>
    </div>
  )
}
