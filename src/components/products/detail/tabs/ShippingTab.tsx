import { useQuery } from '@tanstack/react-query'
import { AlertTriangle, Boxes, Info, Loader2, Package, Ruler, Scale, Truck } from 'lucide-react'
import type { ReactNode } from 'react'
import { type ProductShipping, shippingApi } from '@/api/shipping'

interface Props {
  product: { uuid: string }
}

function formatWeight(value: number | null, unit: string | null): string {
  if (value == null) return '—'
  return `${value}${unit ? ` ${unit}` : ''}`
}

function FactRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-gray-500 dark:text-gray-400">{label}</dt>
      <dd className="text-right font-medium text-gray-900 dark:text-white">{value}</dd>
    </div>
  )
}

function Card({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
      <div className="mb-3 flex items-center gap-2">
        {icon}
        <span className="font-medium text-gray-900 text-sm dark:text-white">{title}</span>
      </div>
      <dl className="space-y-2 text-sm">{children}</dl>
    </div>
  )
}

function WeightCard({ shipping }: { shipping: ProductShipping }) {
  const unit = shipping.weight_unit?.symbol ?? null

  return (
    <Card icon={<Scale className="h-4 w-4 text-gray-400" />} title="Weight">
      <FactRow label="Net" value={formatWeight(shipping.net_weight, unit)} />
      <FactRow label="Gross" value={formatWeight(shipping.gross_weight, unit)} />
      <FactRow label="Gross (kg)" value={formatWeight(shipping.gross_weight_kg, 'kg')} />
    </Card>
  )
}

function DimensionsCard({ shipping }: { shipping: ProductShipping }) {
  const size =
    shipping.length != null && shipping.width != null && shipping.height != null
      ? `${shipping.length} × ${shipping.width} × ${shipping.height} ${
          shipping.dimension_unit?.symbol ?? ''
        }`.trim()
      : '—'

  const billable =
    shipping.gross_weight_kg == null && shipping.volumetric_weight_kg == null
      ? null
      : Math.max(shipping.gross_weight_kg ?? 0, shipping.volumetric_weight_kg ?? 0)

  return (
    <Card icon={<Ruler className="h-4 w-4 text-gray-400" />} title="Dimensions">
      <FactRow label="L × W × H" value={size} />
      <FactRow
        label="Volumetric weight"
        value={formatWeight(shipping.volumetric_weight_kg, 'kg')}
      />
      <FactRow label="Billable weight" value={formatWeight(billable, 'kg')} />
    </Card>
  )
}

function PackagingCard({ shipping }: { shipping: ProductShipping }) {
  return (
    <Card icon={<Package className="h-4 w-4 text-gray-400" />} title="Packaging">
      <FactRow label="Type" value={shipping.packaging_type?.name ?? '—'} />
      <FactRow label="Units per case" value={String(shipping.units_per_case)} />
    </Card>
  )
}

function HandlingFlags({ shipping }: { shipping: ProductShipping }) {
  return (
    <div className="flex flex-wrap gap-2">
      {shipping.ships_alone && (
        <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-1 font-medium text-blue-700 text-xs dark:bg-blue-900/30 dark:text-blue-300">
          Ships separately
        </span>
      )}
      {shipping.is_fragile && (
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 font-medium text-amber-700 text-xs dark:bg-amber-900/30 dark:text-amber-400">
          <AlertTriangle className="h-3 w-3" /> Fragile
        </span>
      )}
      <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-1 font-medium text-gray-600 text-xs dark:bg-gray-800 dark:text-gray-300">
        {shipping.is_stackable ? 'Stackable' : 'Do not stack'}
      </span>
      {shipping.is_hazmat && (
        <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-1 font-medium text-red-700 text-xs dark:bg-red-900/30 dark:text-red-400">
          <AlertTriangle className="h-3 w-3" /> Dangerous goods
        </span>
      )}
    </div>
  )
}

function HazardCard({ shipping }: { shipping: ProductShipping }) {
  if (!shipping.is_hazmat) return null

  return (
    <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-900/40 dark:bg-red-900/10">
      <h4 className="mb-2 font-medium text-red-800 text-sm dark:text-red-300">Hazard details</h4>
      <div className="grid gap-3 text-sm sm:grid-cols-3">
        <div>
          <span className="text-red-600/80 text-xs dark:text-red-400/80">UN number</span>
          <p className="font-medium font-mono text-gray-900 dark:text-white">
            {shipping.un_number || '—'}
          </p>
        </div>
        <div>
          <span className="text-red-600/80 text-xs dark:text-red-400/80">Hazard class</span>
          <p className="font-medium text-gray-900 dark:text-white">
            {shipping.hazard_class?.name ?? '—'}
          </p>
        </div>
        <div>
          <span className="text-red-600/80 text-xs dark:text-red-400/80">Packing group</span>
          <p className="font-medium text-gray-900 dark:text-white">
            {shipping.packing_group?.name ?? '—'}
          </p>
        </div>
      </div>
    </div>
  )
}

function NotesCard({ notes }: { notes: string }) {
  return (
    <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
      <div className="mb-2 flex items-center gap-2">
        <Info className="h-4 w-4 text-gray-400" />
        <h4 className="font-medium text-gray-900 text-sm dark:text-white">Handling notes</h4>
      </div>
      <p className="whitespace-pre-line text-gray-600 text-sm dark:text-gray-300">{notes}</p>
    </div>
  )
}

function ContentsCard({ contents }: { contents: ProductShipping['contents'] }) {
  return (
    <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
      <div className="mb-3 flex items-center gap-2">
        <Boxes className="h-4 w-4 text-gray-400" />
        <h4 className="font-medium text-gray-900 text-sm dark:text-white">In the box</h4>
      </div>
      {contents.length === 0 ? (
        <p className="text-gray-400 text-xs">No box contents listed.</p>
      ) : (
        <ul className="divide-y divide-gray-100 dark:divide-gray-800">
          {contents.map((item) => (
            <li
              key={`${item.name}-${item.qty ?? 0}`}
              className="flex items-center justify-between py-1.5 text-sm"
            >
              <span className="text-gray-700 dark:text-gray-300">{item.name}</span>
              <span className="font-medium text-gray-500 dark:text-gray-400">×{item.qty ?? 1}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export function ShippingTab({ product }: Props) {
  const { data: shipping, isLoading } = useQuery({
    queryKey: ['product-shipping', product.uuid],
    queryFn: () => shippingApi.get(product.uuid),
  })

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    )
  }

  if (!shipping) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border-2 border-gray-200 border-dashed py-12 dark:border-gray-700">
        <Truck className="mb-3 h-10 w-10 text-gray-300 dark:text-gray-600" />
        <h3 className="font-medium text-gray-900 text-sm dark:text-white">No packaging data</h3>
        <p className="mt-1 text-gray-500 text-xs dark:text-gray-400">
          Edit the product and open the “Shipping &amp; Packaging” step to add weights and
          dimensions.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Truck className="h-5 w-5 text-blue-600 dark:text-blue-400" />
        <h3 className="font-semibold text-gray-700 text-sm dark:text-gray-200">
          Shipping &amp; Packaging
        </h3>
        {shipping.is_rateable && (
          <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 font-medium text-green-700 text-xs dark:bg-green-900/30 dark:text-green-400">
            Rateable
          </span>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <WeightCard shipping={shipping} />
        <DimensionsCard shipping={shipping} />
        <PackagingCard shipping={shipping} />
      </div>

      <HandlingFlags shipping={shipping} />
      <HazardCard shipping={shipping} />
      {shipping.handling_notes && <NotesCard notes={shipping.handling_notes} />}
      <ContentsCard contents={shipping.contents} />
    </div>
  )
}
