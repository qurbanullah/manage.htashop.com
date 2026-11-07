import { Loader2, PackageCheck, TriangleAlert } from 'lucide-react'
import type { PackingPlanPreview, ShipmentPlanItem } from '@/api/shipments'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface Props {
  plan: PackingPlanPreview
  planItems: ShipmentPlanItem[]
  applying: boolean
  onApply: () => void
  onDiscard: () => void
}

/**
 * Read-only preview of the packing planner's suggestion. Nothing is written
 * until the operator confirms, because the planner is advice, not authority.
 */
export function PackingPlanPreviewPanel({ plan, planItems, applying, onApply, onDiscard }: Props) {
  const nameFor = (orderItemId: number) =>
    planItems.find((item) => item.id === orderItemId)?.name ?? `Item #${orderItemId}`

  return (
    <div className="space-y-3 rounded-lg border border-blue-200 bg-blue-50/60 p-3 dark:border-blue-900/60 dark:bg-blue-900/10">
      <div className="flex items-center justify-between gap-2">
        <p className="font-medium text-blue-800 text-sm dark:text-blue-300">
          Suggested packing · {plan.boxes.length} box{plan.boxes.length === 1 ? '' : 'es'}
        </p>
        <button
          type="button"
          onClick={onDiscard}
          className="text-blue-700 text-xs underline-offset-2 hover:underline dark:text-blue-300"
        >
          Discard
        </button>
      </div>

      {plan.warnings.length > 0 && (
        <ul className="space-y-1">
          {plan.warnings.map((warning) => (
            <li
              key={warning}
              className="flex items-start gap-1.5 text-amber-700 text-xs dark:text-amber-400"
            >
              <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              {warning}
            </li>
          ))}
        </ul>
      )}

      <div className="grid gap-2 sm:grid-cols-2">
        {plan.boxes.map((box, index) => (
          <div
            // Boxes have no id before they are written; the order is the identity.
            // biome-ignore lint/suspicious/noArrayIndexKey: preview rows are positional
            key={`plan-box-${index}`}
            className="rounded-lg border border-blue-100 bg-white p-2.5 dark:border-blue-900/40 dark:bg-gray-800"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="font-medium text-gray-900 text-xs dark:text-white">
                Box {index + 1}
              </span>
              {box.contains_hazmat && (
                <span className="rounded-full bg-red-100 px-2 py-0.5 font-medium text-red-700 text-xs dark:bg-red-900/30 dark:text-red-300">
                  Hazmat
                </span>
              )}
            </div>
            <p className="mt-0.5 text-gray-400 text-xs">
              {box.packaging_template?.name ?? 'Custom box'}
              {box.length_cm != null && box.width_cm != null && box.height_cm != null
                ? ` · ${box.length_cm} × ${box.width_cm} × ${box.height_cm} cm`
                : ''}
              {` · ${box.weight_kg} kg`}
            </p>
            <ul className={cn('mt-1.5 space-y-0.5')}>
              {box.items.map((line) => (
                <li
                  key={line.order_item_id}
                  className="flex justify-between gap-2 text-gray-600 text-xs dark:text-gray-300"
                >
                  <span className="truncate">{nameFor(line.order_item_id)}</span>
                  <span className="font-medium">×{line.quantity}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="flex justify-end gap-2">
        <Button size="sm" variant="outline" onClick={onDiscard} disabled={applying}>
          Keep my boxes
        </Button>
        <Button size="sm" onClick={onApply} disabled={applying}>
          {applying ? (
            <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
          ) : (
            <PackageCheck className="mr-1.5 h-4 w-4" />
          )}
          Apply suggestion
        </Button>
      </div>
    </div>
  )
}
