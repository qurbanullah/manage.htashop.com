import { Loader2, Plus, Wand2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import {
  type PackingPlanPreview,
  type Shipment,
  type ShipmentPayload,
  type ShipmentPlanItem,
  shipmentsApi,
} from '@/api/shipments'
import type { PackagingTemplate, ShippingCarrier } from '@/api/shippingConfig'
import type { Warehouse } from '@/api/warehouses'
import { PackingPlanPreviewPanel } from '@/components/orders/shipments/PackingPlanPreview'
import {
  newParcel,
  type ParcelDraft,
  ParcelDraftRow,
} from '@/components/orders/shipments/ParcelDraftRow'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Modal } from '@/components/ui/modal'
import { useToast } from '@/components/ui/Toaster'
import { isApiError } from '@/lib/api-response'

interface Props {
  isOpen: boolean
  onClose: () => void
  orderUuid: string
  shipment: Shipment | null
  planItems: ShipmentPlanItem[]
  templates: PackagingTemplate[]
  carriers: ShippingCarrier[]
  warehouses: Warehouse[]
  onSaved: () => void
}

interface ShipmentForm {
  warehouseId: string
  carrier: string
  service: string
  trackingNumber: string
  trackingUrl: string
  notes: string
  autoPack: boolean
  quantities: Record<string, string>
  parcels: ParcelDraft[]
}

function toNumber(value: string): number | null {
  const trimmed = value.trim()

  if (trimmed === '') return null

  const parsed = Number(trimmed)

  return Number.isFinite(parsed) ? parsed : null
}

function toParcelDraft(parcel: Shipment['parcels'][number]): ParcelDraft {
  return {
    ...newParcel(),
    packagingTemplateId:
      parcel.packaging_template_id != null ? String(parcel.packaging_template_id) : '',
    length: parcel.length_cm != null ? String(parcel.length_cm) : '',
    width: parcel.width_cm != null ? String(parcel.width_cm) : '',
    height: parcel.height_cm != null ? String(parcel.height_cm) : '',
    weight: parcel.weight_kg != null ? String(parcel.weight_kg) : '',
    trackingNumber: parcel.tracking_number ?? '',
  }
}

function buildForm(shipment: Shipment | null, planItems: ShipmentPlanItem[]): ShipmentForm {
  if (shipment) {
    const quantities: Record<string, string> = {}

    for (const item of shipment.items) {
      quantities[String(item.order_item_id)] = String(item.quantity)
    }

    return {
      warehouseId: shipment.warehouse_id != null ? String(shipment.warehouse_id) : '',
      carrier: shipment.carrier || 'manual',
      service: shipment.service ?? '',
      trackingNumber: shipment.tracking_number ?? '',
      trackingUrl: shipment.tracking_url ?? '',
      notes: shipment.notes ?? '',
      autoPack: false,
      quantities,
      parcels: shipment.parcels.length ? shipment.parcels.map(toParcelDraft) : [newParcel()],
    }
  }

  const quantities: Record<string, string> = {}

  for (const item of planItems) {
    if (item.remaining > 0) {
      quantities[String(item.id)] = String(item.remaining)
    }
  }

  return {
    warehouseId: '',
    carrier: 'manual',
    service: '',
    trackingNumber: '',
    trackingUrl: '',
    notes: '',
    autoPack: false,
    quantities,
    parcels: [newParcel()],
  }
}

function buildItems(
  planItems: ShipmentPlanItem[],
  quantities: Record<string, string>
): ShipmentPayload['items'] {
  return planItems
    .map((item) => ({
      order_item_id: item.id,
      quantity: Number(quantities[String(item.id)] || 0),
    }))
    .filter((row) => row.quantity > 0)
}

function isBlankParcel(parcel: ParcelDraft): boolean {
  return (
    !parcel.packagingTemplateId &&
    !parcel.weight &&
    !parcel.length &&
    !parcel.width &&
    !parcel.height &&
    !parcel.trackingNumber
  )
}

function buildParcels(parcels: ParcelDraft[]): ShipmentPayload['parcels'] {
  return parcels
    .filter((parcel) => !isBlankParcel(parcel))
    .map((parcel, index) => ({
      packaging_template_id: parcel.packagingTemplateId ? Number(parcel.packagingTemplateId) : null,
      sequence: index + 1,
      length_cm: toNumber(parcel.length),
      width_cm: toNumber(parcel.width),
      height_cm: toNumber(parcel.height),
      weight_kg: toNumber(parcel.weight),
      tracking_number: parcel.trackingNumber.trim() || null,
    }))
}

function saveErrorMessage(error: unknown): string {
  if (isApiError(error)) {
    if (error.errors) {
      return Object.values(error.errors).flat()[0] ?? error.message
    }

    return error.message
  }

  return error instanceof Error ? error.message : 'Failed to save the shipment'
}

function buildPayload(form: ShipmentForm, planItems: ShipmentPlanItem[]): ShipmentPayload {
  return {
    warehouse_id: form.warehouseId ? Number(form.warehouseId) : null,
    carrier: form.carrier || 'manual',
    service: form.service.trim() || null,
    tracking_number: form.trackingNumber.trim() || null,
    tracking_url: form.trackingUrl.trim() || null,
    notes: form.notes.trim() || null,
    items: buildItems(planItems, form.quantities),
    parcels: buildParcels(form.parcels),
  }
}

/**
 * Persist the form. Returns false when there is nothing to ship. A dispatched
 * shipment only sends carrier details, because the API freezes its contents.
 */
async function persistShipment(
  shipment: Shipment | null,
  orderUuid: string,
  form: ShipmentForm,
  planItems: ShipmentPlanItem[],
  locked: boolean
): Promise<boolean> {
  const payload = buildPayload(form, planItems)

  if (!locked && payload.items.length === 0) {
    return false
  }

  if (!shipment) {
    await shipmentsApi.create(orderUuid, {
      ...payload,
      auto_pack: form.autoPack || undefined,
    })
    return true
  }

  await shipmentsApi.update(
    shipment.uuid,
    locked
      ? {
          carrier: payload.carrier,
          service: payload.service,
          tracking_number: payload.tracking_number,
          tracking_url: payload.tracking_url,
          notes: payload.notes,
        }
      : payload
  )

  return true
}

export function ShipmentModal({
  isOpen,
  onClose,
  orderUuid,
  shipment,
  planItems,
  templates,
  carriers,
  warehouses,
  onSaved,
}: Props) {
  const { success: showSuccess, error: showError } = useToast()
  const [form, setForm] = useState<ShipmentForm>(() => buildForm(null, []))
  const [saving, setSaving] = useState(false)
  const [plan, setPlan] = useState<PackingPlanPreview | null>(null)
  const [planning, setPlanning] = useState(false)
  const [applying, setApplying] = useState(false)

  // Once dispatched, the contents are an audit trail; only carrier details move.
  const locked = shipment !== null && !shipment.is_open

  useEffect(() => {
    if (isOpen) {
      setForm(buildForm(shipment, planItems))
      setPlan(null)
    }
  }, [isOpen, shipment, planItems])

  const set = <K extends keyof ShipmentForm>(key: K, value: ShipmentForm[K]) =>
    setForm((previous) => ({ ...previous, [key]: value }))

  const ownQuantity = (orderItemId: number): number =>
    shipment?.items.find((item) => item.order_item_id === orderItemId)?.quantity ?? 0

  const available = (item: ShipmentPlanItem): number => item.remaining + ownQuantity(item.id)

  const updateParcel = (index: number, parcel: ParcelDraft) =>
    set(
      'parcels',
      form.parcels.map((row, rowIndex) => (rowIndex === index ? parcel : row))
    )

  const parcelWeight = form.parcels.reduce(
    (total, parcel) => total + (toNumber(parcel.weight) ?? 0),
    0
  )

  const handleSave = async () => {
    setSaving(true)

    try {
      const saved = await persistShipment(shipment, orderUuid, form, planItems, locked)

      if (!saved) {
        showError('Add at least one item to the shipment.')
        return
      }

      showSuccess(shipment ? 'Shipment updated' : 'Shipment created')
      onSaved()
      onClose()
    } catch (error) {
      showError(saveErrorMessage(error))
    } finally {
      setSaving(false)
    }
  }

  const handlePreviewPlan = async () => {
    if (!shipment) return

    setPlanning(true)

    try {
      setPlan(await shipmentsApi.packingPlan(shipment.uuid))
    } catch (error) {
      showError(saveErrorMessage(error))
    } finally {
      setPlanning(false)
    }
  }

  const handleApplyPlan = async () => {
    if (!shipment) return

    setApplying(true)

    try {
      await shipmentsApi.applyPlan(shipment.uuid)
      showSuccess('Boxes re-packed from the planner')
      onSaved()
      onClose()
    } catch (error) {
      showError(saveErrorMessage(error))
    } finally {
      setApplying(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={shipment ? 'Edit shipment' : 'Create shipment'}
      maxWidth="4xl"
    >
      <div className="space-y-5">
        {locked ? (
          <p className="rounded-lg bg-amber-50 p-3 text-amber-700 text-xs dark:bg-amber-900/20 dark:text-amber-400">
            This shipment has been dispatched. Items and boxes can no longer be changed; you can
            still update the carrier, service and tracking details.
          </p>
        ) : (
          <>
            <div>
              <h3 className="mb-2 font-medium text-gray-900 text-sm dark:text-white">Items</h3>
              <div className="space-y-2">
                {planItems.map((item) => {
                  const max = available(item)

                  return (
                    <div
                      key={item.id}
                      className="flex items-center gap-3 rounded-lg border border-gray-200 px-3 py-2 dark:border-gray-700"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-gray-900 text-sm dark:text-white">
                          {item.name}
                        </p>
                        <p className="text-gray-400 text-xs">
                          {item.sku ?? 'No SKU'} · ordered {item.quantity} · shipped {item.shipped}
                        </p>
                      </div>

                      <span className="shrink-0 text-gray-400 text-xs">{max} available</span>

                      <Input
                        type="number"
                        min="0"
                        max={max}
                        step="0.001"
                        value={form.quantities[String(item.id)] ?? ''}
                        onChange={(event) =>
                          set('quantities', {
                            ...form.quantities,
                            [String(item.id)]: event.target.value,
                          })
                        }
                        disabled={max <= 0}
                        aria-label={`Quantity to ship for ${item.name}`}
                        className="h-9 w-24"
                      />
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="font-medium text-gray-900 text-sm dark:text-white">Boxes</h3>
                  <p className="text-gray-400 text-xs">
                    A shipment needs at least one box before it can be marked as shipped.
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {!shipment && (
                    <label className="inline-flex cursor-pointer items-center gap-1.5 text-gray-600 text-xs dark:text-gray-300">
                      <input
                        type="checkbox"
                        checked={form.autoPack}
                        onChange={(event) => set('autoPack', event.target.checked)}
                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      Auto-pack on save
                    </label>
                  )}
                  {shipment?.is_open && (
                    <button
                      type="button"
                      onClick={handlePreviewPlan}
                      disabled={planning}
                      className="inline-flex items-center gap-1 rounded-lg px-2 py-1 font-medium text-blue-600 text-xs hover:bg-blue-50 disabled:opacity-50 dark:text-blue-400 dark:hover:bg-blue-900/20"
                    >
                      {planning ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Wand2 className="h-3.5 w-3.5" />
                      )}
                      Suggest boxes
                    </button>
                  )}
                  {!form.autoPack && (
                    <button
                      type="button"
                      onClick={() => set('parcels', [...form.parcels, newParcel()])}
                      className="inline-flex items-center gap-1 rounded-lg px-2 py-1 font-medium text-blue-600 text-xs hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/20"
                    >
                      <Plus className="h-3.5 w-3.5" /> Add box
                    </button>
                  )}
                </div>
              </div>

              {plan && (
                <PackingPlanPreviewPanel
                  plan={plan}
                  planItems={planItems}
                  applying={applying}
                  onApply={handleApplyPlan}
                  onDiscard={() => setPlan(null)}
                />
              )}

              {form.autoPack ? (
                <p className="rounded-lg bg-blue-50 p-3 text-blue-700 text-xs dark:bg-blue-900/20 dark:text-blue-300">
                  Boxes will be planned from the packaging templates when you save. Compliance rules
                  (ships-alone and dangerous goods separation) are always applied.
                </p>
              ) : (
                form.parcels.map((parcel, index) => (
                  <ParcelDraftRow
                    key={parcel.id}
                    parcel={parcel}
                    index={index}
                    templates={templates}
                    onChange={(next) => updateParcel(index, next)}
                    onRemove={() =>
                      set(
                        'parcels',
                        form.parcels.filter((row) => row.id !== parcel.id)
                      )
                    }
                  />
                ))
              )}

              {!form.autoPack && parcelWeight > 0 && (
                <p className="text-gray-500 text-xs dark:text-gray-400">
                  Total packed weight:{' '}
                  <span className="font-semibold">{parcelWeight.toFixed(3)} kg</span>
                </p>
              )}
            </div>
          </>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label className="font-medium text-gray-700 text-xs dark:text-gray-300">
              Ships from
            </Label>
            <select
              value={form.warehouseId}
              onChange={(event) => set('warehouseId', event.target.value)}
              disabled={locked}
              className="h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm disabled:opacity-60 dark:border-gray-600 dark:bg-gray-800"
            >
              <option value="">Default warehouse</option>
              {warehouses.map((warehouse) => (
                <option key={warehouse.id} value={warehouse.id}>
                  {warehouse.name}
                  {warehouse.city ? ` · ${warehouse.city}` : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <Label className="font-medium text-gray-700 text-xs dark:text-gray-300">Carrier</Label>
            <select
              value={form.carrier}
              onChange={(event) => set('carrier', event.target.value)}
              className="h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm dark:border-gray-600 dark:bg-gray-800"
            >
              <option value="manual">Manual / other</option>
              {carriers.map((carrier) => (
                <option key={carrier.code} value={carrier.code}>
                  {carrier.name}
                </option>
              ))}
              {form.carrier !== 'manual' &&
                !carriers.some((carrier) => carrier.code === form.carrier) && (
                  <option value={form.carrier}>{form.carrier}</option>
                )}
            </select>
          </div>

          <div className="space-y-1.5">
            <Label className="font-medium text-gray-700 text-xs dark:text-gray-300">
              Service <span className="font-normal text-gray-400">(optional)</span>
            </Label>
            <Input
              value={form.service}
              onChange={(event) => set('service', event.target.value)}
              placeholder="Overnight"
              className="h-10"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="font-medium text-gray-700 text-xs dark:text-gray-300">
              Tracking number <span className="font-normal text-gray-400">(optional)</span>
            </Label>
            <Input
              value={form.trackingNumber}
              onChange={(event) => set('trackingNumber', event.target.value)}
              placeholder="TRK-123"
              className="h-10 font-mono"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="font-medium text-gray-700 text-xs dark:text-gray-300">
              Tracking URL <span className="font-normal text-gray-400">(optional)</span>
            </Label>
            <Input
              value={form.trackingUrl}
              onChange={(event) => set('trackingUrl', event.target.value)}
              placeholder="https://…"
              className="h-10"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="font-medium text-gray-700 text-xs dark:text-gray-300">
            Notes <span className="font-normal text-gray-400">(optional)</span>
          </Label>
          <Input
            value={form.notes}
            onChange={(event) => set('notes', event.target.value)}
            placeholder="Handling instructions for this dispatch"
            className="h-10"
          />
        </div>
      </div>

      <div className="mt-6 flex justify-end gap-2">
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : null}
          {shipment ? 'Update shipment' : 'Create shipment'}
        </Button>
      </div>
    </Modal>
  )
}
