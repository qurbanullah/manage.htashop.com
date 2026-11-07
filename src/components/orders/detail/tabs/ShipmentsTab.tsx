import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Boxes, Loader2, PackageCheck, Pencil, Plus, Trash2, Truck } from 'lucide-react'
import { useState } from 'react'
import { type Shipment, shipmentsApi } from '@/api/shipments'
import {
  packagingTemplatesApi,
  type ShippingCarrier,
  shippingCarriersApi,
} from '@/api/shippingConfig'
import { warehousesApi } from '@/api/warehouses'
import { ShipmentModal } from '@/components/orders/shipments/ShipmentModal'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/Toaster'
import { isApiError } from '@/lib/api-response'
import { cn } from '@/lib/utils'

interface Props {
  order: { uuid: string }
}

const NEXT_ACTION: Record<string, { status: string; label: string }> = {
  pending: { status: 'packing', label: 'Start packing' },
  packing: { status: 'packed', label: 'Mark packed' },
  packed: { status: 'shipped', label: 'Dispatch shipment' },
  shipped: { status: 'delivered', label: 'Mark delivered' },
}

const STATUS_TONE: Record<string, string> = {
  pending: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
  packing: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  packed: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  shipped: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300',
  delivered: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  cancelled: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
}

function errorText(error: unknown, fallback: string): string {
  if (isApiError(error)) {
    if (error.errors) {
      return Object.values(error.errors).flat()[0] ?? error.message
    }

    return error.message
  }

  return error instanceof Error ? error.message : fallback
}

function StatusBadge({ shipment }: { shipment: Shipment }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 font-medium text-xs',
        STATUS_TONE[shipment.status] ?? STATUS_TONE.pending
      )}
    >
      {shipment.status_label}
    </span>
  )
}

/** Compliance and completeness flags shown next to the status. */
function ShipmentFlags({ shipment }: { shipment: Shipment }) {
  return (
    <>
      {shipment.contains_hazmat && (
        <span className="rounded-full bg-red-100 px-2 py-0.5 font-medium text-red-700 text-xs dark:bg-red-900/30 dark:text-red-300">
          Hazmat
        </span>
      )}
      {shipment.unpacked && shipment.is_open && (
        <span className="rounded-full bg-amber-100 px-2 py-0.5 font-medium text-amber-700 text-xs dark:bg-amber-900/30 dark:text-amber-300">
          Unpacked
        </span>
      )}
    </>
  )
}

function ParcelList({ shipment }: { shipment: Shipment }) {
  if (shipment.parcels.length === 0) {
    return <p className="text-amber-600 text-xs dark:text-amber-400">No boxes recorded.</p>
  }

  return (
    <ul className="space-y-1.5">
      {shipment.parcels.map((parcel) => (
        <li
          key={parcel.uuid}
          className="rounded-md border border-gray-100 px-2 py-1.5 dark:border-gray-700"
        >
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-gray-500 text-xs dark:text-gray-400">
            <span className="font-medium text-gray-700 dark:text-gray-300">
              Box {parcel.sequence}
            </span>
            <span>{parcel.packaging_template?.name ?? 'Custom box'}</span>
            {parcel.length_cm != null && parcel.width_cm != null && parcel.height_cm != null && (
              <span>
                {parcel.length_cm} × {parcel.width_cm} × {parcel.height_cm} cm
              </span>
            )}
            <span>{parcel.weight_kg != null ? `${parcel.weight_kg} kg` : 'No weight'}</span>
            {parcel.tracking_number && <span className="font-mono">{parcel.tracking_number}</span>}
            {parcel.contains_hazmat && (
              <span className="rounded-full bg-red-100 px-1.5 py-0.5 font-medium text-red-700 dark:bg-red-900/30 dark:text-red-300">
                Hazmat
              </span>
            )}
          </div>
          {parcel.items.length > 0 && (
            <p className="mt-0.5 text-gray-400 text-xs">
              {parcel.items.map((line) => `${line.name ?? 'Item'} ×${line.quantity}`).join(', ')}
            </p>
          )}
        </li>
      ))}
    </ul>
  )
}

interface CardProps {
  shipment: Shipment
  index: number
  carriers: ShippingCarrier[]
  onEdit: () => void
  onDelete: () => void
  onAdvance: (status: string) => void
  onRepack: () => void
  onBook: () => void
  onCancelBooking: () => void
}

function ShipmentCard({
  shipment,
  index,
  carriers,
  onEdit,
  onDelete,
  onAdvance,
  onRepack,
  onBook,
  onCancelBooking,
}: CardProps) {
  const next = NEXT_ACTION[shipment.status]
  const canBook =
    shipment.is_open &&
    !shipment.carrier_booking_id &&
    carriers.some((carrier) => carrier.code === shipment.carrier && carrier.booking)

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
            <Truck className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h4 className="font-medium text-gray-900 text-sm dark:text-white">
              Shipment {index + 1}
            </h4>
            <p className="text-gray-400 text-xs">
              {shipment.carrier}
              {shipment.service ? ` · ${shipment.service}` : ''}
              {shipment.tracking_number ? ` · ${shipment.tracking_number}` : ''}
            </p>
            {shipment.warehouse && (
              <p className="text-gray-400 text-xs">
                From {shipment.warehouse.name}
                {shipment.warehouse.city ? ` · ${shipment.warehouse.city}` : ''}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <ShipmentFlags shipment={shipment} />
          <StatusBadge shipment={shipment} />
          {shipment.status !== 'cancelled' && (
            <button
              type="button"
              onClick={onEdit}
              aria-label="Edit shipment"
              className="rounded p-1.5 text-gray-400 hover:text-blue-500"
            >
              <Pencil className="h-4 w-4" />
            </button>
          )}
          {shipment.is_open && (
            <button
              type="button"
              onClick={onDelete}
              aria-label="Delete shipment"
              className="rounded p-1.5 text-gray-400 hover:text-red-500"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div>
          <p className="mb-1 font-medium text-gray-500 text-xs uppercase tracking-wide dark:text-gray-400">
            Items
          </p>
          <ul className="space-y-1">
            {shipment.items.map((item) => (
              <li key={item.id} className="flex justify-between gap-2 text-sm">
                <span className="truncate text-gray-700 dark:text-gray-300">{item.name}</span>
                <span className="font-medium text-gray-900 dark:text-white">×{item.quantity}</span>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="mb-1 font-medium text-gray-500 text-xs uppercase tracking-wide dark:text-gray-400">
            Boxes ({shipment.parcel_count})
          </p>
          <ParcelList shipment={shipment} />
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-gray-100 border-t pt-3 dark:border-gray-700">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-gray-500 text-xs dark:text-gray-400">
            {shipment.weight_kg != null ? `${shipment.weight_kg} kg total` : 'No weight recorded'}
          </span>
          {shipment.label_url && (
            <a
              href={shipment.label_url}
              target="_blank"
              rel="noreferrer"
              className="font-medium text-blue-600 text-xs hover:underline dark:text-blue-400"
            >
              Download label
            </a>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          {canBook && (
            <Button size="sm" variant="outline" onClick={onBook}>
              Book TTN
            </Button>
          )}
          {shipment.carrier_booking_id && shipment.is_open && (
            <Button size="sm" variant="outline" onClick={onCancelBooking}>
              Cancel booking
            </Button>
          )}
          {shipment.is_open && (
            <Button size="sm" variant="outline" onClick={onRepack}>
              Re-pack
            </Button>
          )}
          {shipment.is_open && (
            <Button size="sm" variant="outline" onClick={() => onAdvance('cancelled')}>
              Cancel
            </Button>
          )}
          {next && (
            <Button size="sm" onClick={() => onAdvance(next.status)}>
              {next.label}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

export function ShipmentsTab({ order }: Props) {
  const queryClient = useQueryClient()
  const { success: showSuccess, error: showError } = useToast()
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Shipment | null>(null)

  const planQuery = useQuery({
    queryKey: ['shipment-plan', order.uuid],
    queryFn: () => shipmentsApi.plan(order.uuid),
    // Reset the create form only when the operator reopens it, not on a refocus.
    refetchOnWindowFocus: false,
  })

  const templatesQuery = useQuery({
    queryKey: ['packaging-templates'],
    queryFn: () => packagingTemplatesApi.list(),
    staleTime: 5 * 60 * 1000,
  })

  const carriersQuery = useQuery({
    queryKey: ['shipping-carriers'],
    queryFn: () => shippingCarriersApi.list(),
    staleTime: 5 * 60 * 1000,
  })

  const warehousesQuery = useQuery({
    queryKey: ['warehouses'],
    queryFn: () => warehousesApi.list(),
    staleTime: 5 * 60 * 1000,
  })

  const plan = planQuery.data
  const templates = templatesQuery.data ?? []
  const carriers = carriersQuery.data ?? []
  const warehouses = warehousesQuery.data ?? []
  const shipments = plan?.shipments ?? []
  const items = plan?.items ?? []

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ['shipment-plan', order.uuid] })

  const openCreate = () => {
    setEditing(null)
    setModalOpen(true)
  }

  const openEdit = (shipment: Shipment) => {
    setEditing(shipment)
    setModalOpen(true)
  }

  const advance = async (shipment: Shipment, status: string) => {
    try {
      await shipmentsApi.updateStatus(shipment.uuid, status)
      showSuccess(`Shipment ${status}`)
      invalidate()
    } catch (error) {
      showError(errorText(error, 'Failed to update the shipment'))
    }
  }

  const remove = async (shipment: Shipment) => {
    if (!confirm('Delete this shipment? The items become available again.')) return

    try {
      await shipmentsApi.remove(shipment.uuid)
      showSuccess('Shipment deleted')
      invalidate()
    } catch (error) {
      showError(errorText(error, 'Failed to delete the shipment'))
    }
  }

  const repack = async (shipment: Shipment) => {
    if (!confirm('Replace the boxes with the planner suggestion? Contents are redistributed.')) {
      return
    }

    try {
      await shipmentsApi.applyPlan(shipment.uuid)
      showSuccess('Boxes re-packed')
      invalidate()
    } catch (error) {
      showError(errorText(error, 'Failed to re-pack the shipment'))
    }
  }

  const book = async (shipment: Shipment) => {
    try {
      await shipmentsApi.book(shipment.uuid)
      showSuccess('Shipment booked with the carrier')
      invalidate()
    } catch (error) {
      showError(errorText(error, 'Failed to book the shipment'))
    }
  }

  const cancelBooking = async (shipment: Shipment) => {
    if (!confirm('Cancel the carrier booking? The TTN will be voided.')) return

    try {
      await shipmentsApi.cancelBooking(shipment.uuid)
      showSuccess('Carrier booking cancelled')
      invalidate()
    } catch (error) {
      showError(errorText(error, 'Failed to cancel the booking'))
    }
  }

  if (planQuery.isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="font-semibold text-base text-gray-900 dark:text-white">Shipments</h3>
          <p className="text-gray-500 text-sm dark:text-gray-400">
            Pack the order into one or more boxes and hand it to a carrier.
          </p>
        </div>
        <Button
          onClick={openCreate}
          disabled={!plan?.can_ship}
          className="inline-flex items-center gap-2"
        >
          <Plus className="h-4 w-4" /> Create shipment
        </Button>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700">
        <table className="min-w-full divide-y divide-gray-100 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              {['Item', 'Ordered', 'Shipped', 'Remaining'].map((heading) => (
                <th
                  key={heading}
                  className="px-3 py-2 text-left font-medium text-gray-500 text-xs uppercase tracking-wide dark:text-gray-400"
                >
                  {heading}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
            {items.map((item) => (
              <tr key={item.id} className="bg-white dark:bg-gray-800">
                <td className="px-3 py-2">
                  <p className="font-medium text-gray-900 text-sm dark:text-white">{item.name}</p>
                  <p className="text-gray-400 text-xs">{item.sku ?? 'No SKU'}</p>
                </td>
                <td className="px-3 py-2 text-gray-600 text-sm dark:text-gray-300">
                  {item.quantity}
                </td>
                <td className="px-3 py-2 text-gray-600 text-sm dark:text-gray-300">
                  {item.shipped}
                </td>
                <td className="px-3 py-2 font-medium text-sm dark:text-white">
                  <span
                    className={
                      item.remaining > 0
                        ? 'text-amber-600 dark:text-amber-400'
                        : 'text-green-600 dark:text-green-400'
                    }
                  >
                    {item.remaining}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {shipments.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border-2 border-gray-200 border-dashed py-12 dark:border-gray-700">
          <Boxes className="mb-3 h-9 w-9 text-gray-300 dark:text-gray-600" />
          <h4 className="font-medium text-gray-900 text-sm dark:text-white">Nothing shipped yet</h4>
          <p className="mt-1 text-gray-500 text-xs dark:text-gray-400">
            Create a shipment to record what leaves the warehouse.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {shipments.map((shipment, index) => (
            <ShipmentCard
              key={shipment.uuid}
              shipment={shipment}
              index={index}
              carriers={carriers}
              onEdit={() => openEdit(shipment)}
              onDelete={() => remove(shipment)}
              onAdvance={(status) => advance(shipment, status)}
              onRepack={() => repack(shipment)}
              onBook={() => book(shipment)}
              onCancelBooking={() => cancelBooking(shipment)}
            />
          ))}
        </div>
      )}

      {plan?.can_ship === false && shipments.length > 0 && (
        <p className="flex items-center gap-1.5 text-gray-400 text-xs">
          <PackageCheck className="h-3.5 w-3.5" />
          Every ordered unit is allocated to a shipment.
        </p>
      )}

      <ShipmentModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        orderUuid={order.uuid}
        shipment={editing}
        planItems={items}
        templates={templates}
        carriers={carriers}
        warehouses={warehouses}
        onSaved={invalidate}
      />
    </div>
  )
}
