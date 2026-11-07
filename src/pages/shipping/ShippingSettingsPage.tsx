import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Loader2, Package, Pencil, Plus, Ruler, Search, Trash2, Truck } from 'lucide-react'
import { useState } from 'react'
import { currenciesApi } from '@/api/currencies'
import {
  type PackagingTemplate,
  packagingTemplatesApi,
  type ShippingRate,
  type ShippingZone,
  type ShippingZoneLocation,
  shippingRatesApi,
  shippingZonesApi,
} from '@/api/shippingConfig'
import { warehousesApi } from '@/api/warehouses'
import { PackagingTemplateModal } from '@/components/shipping/PackagingTemplateModal'
import { ShippingRateModal } from '@/components/shipping/ShippingRateModal'
import { ShippingZoneModal } from '@/components/shipping/ShippingZoneModal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/ui/Toaster'
import { isApiError } from '@/lib/api-response'
import { cn } from '@/lib/utils'

type Tab = 'zones' | 'rates' | 'packaging'

const TABS: Array<{ key: Tab; label: string }> = [
  { key: 'zones', label: 'Zones' },
  { key: 'rates', label: 'Delivery rates' },
  { key: 'packaging', label: 'Packaging' },
]

const ADD_LABELS: Record<Tab, string> = {
  zones: 'Add zone',
  rates: 'Add rate',
  packaging: 'Add packaging',
}

const cardClass =
  'rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800'

function money(value: number, currency: string): string {
  return `${currency} ${value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

function locationLabel(location: ShippingZoneLocation): string {
  switch (location.type) {
    case 'city':
      return location.city?.name ?? `City #${location.city_id}`
    case 'state':
      return location.state ?? 'State'
    case 'postal_prefix':
      return `Postal ${location.postal_code_prefix ?? ''}`.trim()
    default:
      return location.country?.name ?? `Country #${location.country_id}`
  }
}

function rateRule(rate: ShippingRate): string {
  if (rate.calculation === 'per_weight') {
    return `Base + ${money(rate.per_kg_amount, rate.currency)}/kg after ${rate.included_weight_kg} kg`
  }

  if (rate.calculation === 'tiered') {
    return `${rate.tiers.length} weight bracket${rate.tiers.length === 1 ? '' : 's'}`
  }

  return 'Flat amount'
}

function rateAmount(rate: ShippingRate): string {
  if (rate.calculation !== 'tiered') {
    return money(rate.base_amount, rate.currency)
  }

  const amounts = rate.tiers.map((tier) => tier.amount)

  if (amounts.length === 0) return '—'

  const min = Math.min(...amounts)
  const max = Math.max(...amounts)

  return min === max
    ? money(min, rate.currency)
    : `${money(min, rate.currency)} – ${money(max, rate.currency)}`
}

function ActiveBadge({ active }: { active: boolean }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 font-medium text-xs',
        active
          ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
          : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
      )}
    >
      {active ? 'Active' : 'Inactive'}
    </span>
  )
}

function RowActions({ onEdit, onDelete }: { onEdit: () => void; onDelete: () => void }) {
  return (
    <div className="flex shrink-0 gap-1">
      <button
        type="button"
        onClick={onEdit}
        aria-label="Edit"
        className="rounded p-1.5 text-gray-400 hover:text-blue-500"
      >
        <Pencil className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={onDelete}
        aria-label="Delete"
        className="rounded p-1.5 text-gray-400 hover:text-red-500"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  )
}

function EmptyState({ title, hint }: { title: string; hint: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border-2 border-gray-200 border-dashed py-16 dark:border-gray-700">
      <Truck className="mb-4 h-10 w-10 text-gray-300 dark:text-gray-600" />
      <h3 className="font-medium text-base text-gray-900 dark:text-white">{title}</h3>
      <p className="mt-1 text-gray-500 text-sm dark:text-gray-400">{hint}</p>
    </div>
  )
}

function filterItems<T extends { name: string; code: string | null }>(
  items: T[],
  term: string
): T[] {
  const needle = term.trim().toLowerCase()

  if (needle === '') return items

  return items.filter(
    (item) =>
      item.name.toLowerCase().includes(needle) || (item.code ?? '').toLowerCase().includes(needle)
  )
}

function ZonesTab({
  zones,
  onEdit,
  onDelete,
}: {
  zones: ShippingZone[]
  onEdit: (zone: ShippingZone) => void
  onDelete: (zone: ShippingZone) => void
}) {
  if (zones.length === 0) {
    return (
      <EmptyState
        title="No shipping zones yet"
        hint="Create a zone to price delivery by city, province or postal prefix."
      />
    )
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {zones.map((zone) => (
        <div key={zone.uuid} className={cardClass}>
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="font-medium text-gray-900 dark:text-white">{zone.name}</h3>
              <span className="text-gray-400 text-xs">{zone.code}</span>
            </div>
            <RowActions onEdit={() => onEdit(zone)} onDelete={() => onDelete(zone)} />
          </div>

          <div className="mt-3 flex flex-wrap gap-1.5">
            {zone.locations.length === 0 ? (
              <span className="text-gray-400 text-xs">No destinations</span>
            ) : (
              zone.locations.map((location) => (
                <span
                  key={location.id}
                  className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-gray-600 text-xs dark:bg-gray-700 dark:text-gray-300"
                >
                  {locationLabel(location)}
                </span>
              ))
            )}
          </div>

          <div className="mt-3">
            <ActiveBadge active={zone.is_active} />
          </div>
        </div>
      ))}
    </div>
  )
}

function RatesTab({
  rates,
  onEdit,
  onDelete,
}: {
  rates: ShippingRate[]
  onEdit: (rate: ShippingRate) => void
  onDelete: (rate: ShippingRate) => void
}) {
  if (rates.length === 0) {
    return (
      <EmptyState
        title="No delivery rates yet"
        hint="Add a rate to a zone, or a fallback rate for every destination."
      />
    )
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
      <table className="min-w-full divide-y divide-gray-100 dark:divide-gray-700">
        <thead className="bg-gray-50 dark:bg-gray-800">
          <tr>
            {['Rate', 'Zone', 'Origin', 'Rule', 'Price', 'Status', ''].map((heading) => (
              <th
                key={heading}
                className="px-4 py-2.5 text-left font-medium text-gray-500 text-xs uppercase tracking-wide dark:text-gray-400"
              >
                {heading}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
          {rates.map((rate) => (
            <tr key={rate.uuid} className="bg-white dark:bg-gray-800">
              <td className="px-4 py-3">
                <p className="font-medium text-gray-900 text-sm dark:text-white">{rate.name}</p>
                <p className="text-gray-400 text-xs">{rate.currency}</p>
              </td>
              <td className="px-4 py-3 text-gray-600 text-sm dark:text-gray-300">
                {rate.zone?.name ?? 'All zones'}
              </td>
              <td className="px-4 py-3 text-gray-600 text-sm dark:text-gray-300">
                {rate.warehouse ? (
                  <>
                    <span className="block">{rate.warehouse.name}</span>
                    <span className="text-gray-400 text-xs">{rate.warehouse.city ?? '—'}</span>
                  </>
                ) : (
                  <span className="text-gray-400">Any warehouse</span>
                )}
              </td>
              <td className="px-4 py-3 text-gray-600 text-sm dark:text-gray-300">
                {rateRule(rate)}
              </td>
              <td className="px-4 py-3 font-medium text-gray-900 text-sm dark:text-white">
                {rateAmount(rate)}
              </td>
              <td className="px-4 py-3">
                <div className="flex flex-wrap items-center gap-1">
                  <ActiveBadge active={rate.is_active} />
                  {!rate.carries_hazmat && (
                    <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 font-medium text-amber-700 text-xs dark:bg-amber-900/30 dark:text-amber-300">
                      No hazmat
                    </span>
                  )}
                </div>
              </td>
              <td className="px-4 py-3">
                <div className="flex justify-end">
                  <RowActions onEdit={() => onEdit(rate)} onDelete={() => onDelete(rate)} />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function PackagingTab({
  templates,
  onEdit,
  onDelete,
}: {
  templates: PackagingTemplate[]
  onEdit: (template: PackagingTemplate) => void
  onDelete: (template: PackagingTemplate) => void
}) {
  if (templates.length === 0) {
    return (
      <EmptyState
        title="No packaging yet"
        hint="Add reusable boxes so pick-pack can suggest what to ship an order in."
      />
    )
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {templates.map((template) => {
        const dimensions =
          template.length_cm != null && template.width_cm != null && template.height_cm != null
            ? `${template.length_cm} × ${template.width_cm} × ${template.height_cm} cm`
            : 'No dimensions'

        return (
          <div key={template.uuid} className={cardClass}>
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
                  <Package className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-white">{template.name}</h3>
                  <span className="text-gray-400 text-xs">
                    {template.packaging_type?.name ?? template.code}
                  </span>
                </div>
              </div>
              <RowActions onEdit={() => onEdit(template)} onDelete={() => onDelete(template)} />
            </div>

            <dl className="mt-3 space-y-1 text-xs">
              <div className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400">
                <Ruler className="h-3.5 w-3.5" />
                {dimensions}
              </div>
              <div className="flex items-center justify-between text-gray-500 dark:text-gray-400">
                <span>Max payload</span>
                <span className="font-medium text-gray-700 dark:text-gray-300">
                  {template.max_weight_kg != null ? `${template.max_weight_kg} kg` : '—'}
                </span>
              </div>
              <div className="flex items-center justify-between text-gray-500 dark:text-gray-400">
                <span>Tare</span>
                <span className="font-medium text-gray-700 dark:text-gray-300">
                  {template.tare_weight_kg != null ? `${template.tare_weight_kg} kg` : '—'}
                </span>
              </div>
            </dl>

            <div className="mt-3">
              <ActiveBadge active={template.is_active} />
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default function ShippingSettingsPage() {
  const queryClient = useQueryClient()
  const { success: showSuccess, error: showError } = useToast()

  const [tab, setTab] = useState<Tab>('zones')
  const [search, setSearch] = useState('')

  const [zoneModalOpen, setZoneModalOpen] = useState(false)
  const [editingZone, setEditingZone] = useState<ShippingZone | null>(null)
  const [rateModalOpen, setRateModalOpen] = useState(false)
  const [editingRate, setEditingRate] = useState<ShippingRate | null>(null)
  const [templateModalOpen, setTemplateModalOpen] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<PackagingTemplate | null>(null)

  const zonesQuery = useQuery({
    queryKey: ['shipping-zones'],
    queryFn: () => shippingZonesApi.list(),
  })

  const ratesQuery = useQuery({
    queryKey: ['shipping-rates'],
    queryFn: () => shippingRatesApi.list(),
    enabled: tab === 'rates',
  })

  const templatesQuery = useQuery({
    queryKey: ['packaging-templates'],
    queryFn: () => packagingTemplatesApi.list(),
    enabled: tab === 'packaging',
  })

  const currenciesQuery = useQuery({
    queryKey: ['currencies'],
    queryFn: () => currenciesApi.list(),
    staleTime: 24 * 60 * 60 * 1000,
  })

  const warehousesQuery = useQuery({
    queryKey: ['warehouses'],
    queryFn: () => warehousesApi.list(),
    staleTime: 5 * 60 * 1000,
  })

  const zones = zonesQuery.data ?? []
  const rates = ratesQuery.data ?? []
  const templates = templatesQuery.data ?? []
  const currencies = currenciesQuery.data ?? []
  const warehouses = warehousesQuery.data ?? []

  const handleDelete = async (label: string, action: () => Promise<unknown>, key: string) => {
    if (!confirm(`Delete "${label}"?`)) return

    try {
      await action()
      showSuccess(`${label} deleted`)
      queryClient.invalidateQueries({ queryKey: [key] })
    } catch (error) {
      showError(isApiError(error) ? error.message : 'Failed to delete')
    }
  }

  const openAdd = () => {
    if (tab === 'zones') {
      setEditingZone(null)
      setZoneModalOpen(true)
      return
    }

    if (tab === 'rates') {
      setEditingRate(null)
      setRateModalOpen(true)
      return
    }

    setEditingTemplate(null)
    setTemplateModalOpen(true)
  }

  const loading = zonesQuery.isLoading || ratesQuery.isLoading || templatesQuery.isLoading

  const defaultCurrency =
    currencies.find((currency) => currency.code === 'PKR')?.code ?? currencies[0]?.code ?? 'PKR'

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-bold text-2xl text-gray-900 dark:text-white">Shipping</h1>
          <p className="mt-1 text-gray-500 text-sm dark:text-gray-400">
            Zones, delivery rates and reusable packaging used to price and pack orders.
          </p>
        </div>
        <Button onClick={openAdd} className="inline-flex items-center gap-2">
          <Plus className="h-4 w-4" /> {ADD_LABELS[tab]}
        </Button>
      </div>

      <div className="flex gap-1 overflow-x-auto border-gray-200 border-b dark:border-gray-700">
        {TABS.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => {
              setTab(item.key)
              setSearch('')
            }}
            className={cn(
              'inline-flex shrink-0 items-center border-b-2 px-4 py-2.5 font-medium text-sm transition-colors',
              tab === item.key
                ? 'border-blue-500 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="relative">
        <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <Input
          placeholder="Search..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="h-10 pl-10"
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      ) : (
        <>
          {tab === 'zones' && (
            <ZonesTab
              zones={filterItems(zones, search)}
              onEdit={(zone) => {
                setEditingZone(zone)
                setZoneModalOpen(true)
              }}
              onDelete={(zone) =>
                handleDelete(zone.name, () => shippingZonesApi.remove(zone.uuid), 'shipping-zones')
              }
            />
          )}

          {tab === 'rates' && (
            <RatesTab
              rates={filterItems(rates, search)}
              onEdit={(rate) => {
                setEditingRate(rate)
                setRateModalOpen(true)
              }}
              onDelete={(rate) =>
                handleDelete(rate.name, () => shippingRatesApi.remove(rate.uuid), 'shipping-rates')
              }
            />
          )}

          {tab === 'packaging' && (
            <PackagingTab
              templates={filterItems(templates, search)}
              onEdit={(template) => {
                setEditingTemplate(template)
                setTemplateModalOpen(true)
              }}
              onDelete={(template) =>
                handleDelete(
                  template.name,
                  () => packagingTemplatesApi.remove(template.uuid),
                  'packaging-templates'
                )
              }
            />
          )}
        </>
      )}

      <ShippingZoneModal
        isOpen={zoneModalOpen}
        onClose={() => setZoneModalOpen(false)}
        zone={editingZone}
        onSaved={() => queryClient.invalidateQueries({ queryKey: ['shipping-zones'] })}
      />

      <ShippingRateModal
        isOpen={rateModalOpen}
        onClose={() => setRateModalOpen(false)}
        rate={editingRate}
        zones={zones}
        warehouses={warehouses}
        currencies={currencies}
        defaultCurrency={defaultCurrency}
        onSaved={() => queryClient.invalidateQueries({ queryKey: ['shipping-rates'] })}
      />

      <PackagingTemplateModal
        isOpen={templateModalOpen}
        onClose={() => setTemplateModalOpen(false)}
        template={editingTemplate}
        onSaved={() => queryClient.invalidateQueries({ queryKey: ['packaging-templates'] })}
      />
    </div>
  )
}
