import { Loader2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { Currency } from '@/api/currencies'
import {
  type ShippingCalculation,
  type ShippingRate,
  type ShippingRatePayload,
  type ShippingZone,
  shippingRatesApi,
} from '@/api/shippingConfig'
import type { Warehouse } from '@/api/warehouses'
import { newTier, RateTiersEditor, type TierDraft } from '@/components/shipping/RateTiersEditor'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Modal } from '@/components/ui/modal'
import { useToast } from '@/components/ui/Toaster'
import { isApiError } from '@/lib/api-response'

interface Props {
  isOpen: boolean
  onClose: () => void
  rate: ShippingRate | null
  zones: ShippingZone[]
  warehouses: Warehouse[]
  currencies: Currency[]
  defaultCurrency: string
  onSaved: () => void
}

interface RateForm {
  name: string
  code: string
  description: string
  zoneId: string
  warehouseId: string
  calculation: ShippingCalculation
  currency: string
  baseAmount: string
  includedWeight: string
  perKgAmount: string
  minWeight: string
  maxWeight: string
  freeOver: string
  etaMin: string
  etaMax: string
  priority: string
  isActive: boolean
  carriesHazmat: boolean
  tiers: TierDraft[]
}

const CALCULATIONS: Array<{ value: ShippingCalculation; label: string }> = [
  { value: 'flat', label: 'Flat amount' },
  { value: 'per_weight', label: 'Base + per kg' },
  { value: 'tiered', label: 'Weight brackets' },
]

const selectClass =
  'h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm dark:border-gray-600 dark:bg-gray-800'

function emptyForm(currency: string): RateForm {
  return {
    name: '',
    code: '',
    description: '',
    zoneId: '',
    warehouseId: '',
    calculation: 'flat',
    currency,
    baseAmount: '250',
    includedWeight: '0',
    perKgAmount: '0',
    minWeight: '',
    maxWeight: '',
    freeOver: '',
    etaMin: '',
    etaMax: '',
    priority: '0',
    isActive: true,
    carriesHazmat: true,
    tiers: [newTier('0', '', '250')],
  }
}

function toForm(rate: ShippingRate | null, currency: string): RateForm {
  if (!rate) return emptyForm(currency)

  return {
    name: rate.name,
    code: rate.code,
    description: rate.description ?? '',
    zoneId: rate.shipping_zone_id != null ? String(rate.shipping_zone_id) : '',
    warehouseId: rate.warehouse_id != null ? String(rate.warehouse_id) : '',
    calculation: rate.calculation,
    currency: rate.currency,
    baseAmount: String(rate.base_amount ?? ''),
    includedWeight: String(rate.included_weight_kg ?? ''),
    perKgAmount: String(rate.per_kg_amount ?? ''),
    minWeight: rate.min_weight_kg != null ? String(rate.min_weight_kg) : '',
    maxWeight: rate.max_weight_kg != null ? String(rate.max_weight_kg) : '',
    freeOver: rate.free_over_amount != null ? String(rate.free_over_amount) : '',
    etaMin: rate.estimated_days_min != null ? String(rate.estimated_days_min) : '',
    etaMax: rate.estimated_days_max != null ? String(rate.estimated_days_max) : '',
    priority: String(rate.priority ?? 0),
    isActive: rate.is_active,
    carriesHazmat: rate.carries_hazmat,
    tiers: rate.tiers.length
      ? rate.tiers.map((tier) =>
          newTier(
            String(tier.min_weight_kg),
            tier.max_weight_kg != null ? String(tier.max_weight_kg) : '',
            String(tier.amount)
          )
        )
      : [newTier('0', '', '250')],
  }
}

const toNumber = (value: string): number | null => {
  const trimmed = value.trim()
  if (trimmed === '') return null
  const parsed = Number(trimmed)
  return Number.isFinite(parsed) ? parsed : null
}

function toPayload(form: RateForm): ShippingRatePayload {
  return {
    name: form.name.trim(),
    code: form.code.trim() || undefined,
    description: form.description.trim() || undefined,
    shipping_zone_id: form.zoneId ? Number(form.zoneId) : null,
    warehouse_id: form.warehouseId ? Number(form.warehouseId) : null,
    calculation: form.calculation,
    currency: form.currency.toUpperCase(),
    base_amount: toNumber(form.baseAmount) ?? 0,
    included_weight_kg: toNumber(form.includedWeight) ?? 0,
    per_kg_amount: toNumber(form.perKgAmount) ?? 0,
    min_weight_kg: toNumber(form.minWeight),
    max_weight_kg: toNumber(form.maxWeight),
    free_over_amount: toNumber(form.freeOver),
    estimated_days_min: toNumber(form.etaMin),
    estimated_days_max: toNumber(form.etaMax),
    priority: toNumber(form.priority) ?? 0,
    is_active: form.isActive,
    carries_hazmat: form.carriesHazmat,
    tiers:
      form.calculation === 'tiered'
        ? form.tiers.map((tier) => ({
            min_weight_kg: toNumber(tier.min) ?? 0,
            max_weight_kg: toNumber(tier.max),
            amount: toNumber(tier.amount) ?? 0,
          }))
        : [],
  }
}

export function ShippingRateModal({
  isOpen,
  onClose,
  rate,
  zones,
  warehouses,
  currencies,
  defaultCurrency,
  onSaved,
}: Props) {
  const { success: showSuccess, error: showError } = useToast()
  const [form, setForm] = useState<RateForm>(() => emptyForm(defaultCurrency))
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (isOpen) setForm(toForm(rate, defaultCurrency))
  }, [isOpen, rate, defaultCurrency])

  const set = <K extends keyof RateForm>(key: K, value: RateForm[K]) =>
    setForm((previous) => ({ ...previous, [key]: value }))

  const handleSave = async () => {
    if (!form.name.trim()) {
      showError('Give the delivery option a name.')
      return
    }

    setSaving(true)

    try {
      if (rate) {
        await shippingRatesApi.update(rate.uuid, toPayload(form))
        showSuccess('Delivery rate updated')
      } else {
        await shippingRatesApi.create(toPayload(form))
        showSuccess('Delivery rate created')
      }

      onSaved()
      onClose()
    } catch (error) {
      if (isApiError(error) && error.errors) {
        showError(Object.values(error.errors).flat()[0] ?? error.message)
      } else {
        showError(isApiError(error) ? error.message : 'Failed to save the delivery rate')
      }
    } finally {
      setSaving(false)
    }
  }

  const amountLabel =
    form.calculation === 'per_weight'
      ? 'Handling fee'
      : form.calculation === 'tiered'
        ? 'Not used for brackets'
        : 'Amount'

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={rate ? 'Edit delivery rate' : 'Add delivery rate'}
      maxWidth="4xl"
    >
      <div className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label className="font-medium text-gray-700 text-xs dark:text-gray-300">Name</Label>
            <Input
              value={form.name}
              onChange={(event) => set('name', event.target.value)}
              placeholder="Standard delivery"
              className="h-10"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="font-medium text-gray-700 text-xs dark:text-gray-300">
              Code <span className="font-normal text-gray-400">(optional)</span>
            </Label>
            <Input
              value={form.code}
              onChange={(event) => set('code', event.target.value)}
              placeholder="standard"
              className="h-10 font-mono"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="font-medium text-gray-700 text-xs dark:text-gray-300">Zone</Label>
            <select
              value={form.zoneId}
              onChange={(event) => set('zoneId', event.target.value)}
              className={selectClass}
            >
              <option value="">All zones (fallback)</option>
              {zones.map((zone) => (
                <option key={zone.id} value={zone.id}>
                  {zone.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <Label className="font-medium text-gray-700 text-xs dark:text-gray-300">
              Ships from <span className="font-normal text-gray-400">(optional)</span>
            </Label>
            <select
              value={form.warehouseId}
              onChange={(event) => set('warehouseId', event.target.value)}
              className={selectClass}
            >
              <option value="">Any warehouse</option>
              {warehouses.map((warehouse) => (
                <option key={warehouse.id} value={warehouse.id}>
                  {warehouse.name}
                  {warehouse.city ? ` · ${warehouse.city}` : ''}
                </option>
              ))}
            </select>
            <p className="text-gray-400 text-xs">
              A warehouse-scoped rate is only offered for baskets that ship from it.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label className="font-medium text-gray-700 text-xs dark:text-gray-300">Currency</Label>
            <select
              value={form.currency}
              onChange={(event) => set('currency', event.target.value)}
              className={selectClass}
            >
              {currencies.length === 0 && <option value="PKR">PKR</option>}
              {currencies.map((currency) => (
                <option key={currency.code} value={currency.code}>
                  {currency.code}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <Label className="font-medium text-gray-700 text-xs dark:text-gray-300">
              Calculation
            </Label>
            <select
              value={form.calculation}
              onChange={(event) => set('calculation', event.target.value as ShippingCalculation)}
              className={selectClass}
            >
              {CALCULATIONS.map((calculation) => (
                <option key={calculation.value} value={calculation.value}>
                  {calculation.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <Label className="font-medium text-gray-700 text-xs dark:text-gray-300">
              {amountLabel}
            </Label>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={form.baseAmount}
              onChange={(event) => set('baseAmount', event.target.value)}
              disabled={form.calculation === 'tiered'}
              className="h-10"
            />
          </div>

          {form.calculation === 'per_weight' && (
            <>
              <div className="space-y-1.5">
                <Label className="font-medium text-gray-700 text-xs dark:text-gray-300">
                  Included weight (kg)
                </Label>
                <Input
                  type="number"
                  min="0"
                  step="0.001"
                  value={form.includedWeight}
                  onChange={(event) => set('includedWeight', event.target.value)}
                  className="h-10"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="font-medium text-gray-700 text-xs dark:text-gray-300">
                  Charge per extra kg
                </Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.perKgAmount}
                  onChange={(event) => set('perKgAmount', event.target.value)}
                  className="h-10"
                />
              </div>
            </>
          )}
        </div>

        {form.calculation === 'tiered' && (
          <div className="space-y-3">
            <div>
              <h3 className="font-medium text-gray-900 text-sm dark:text-white">Weight brackets</h3>
              <p className="text-gray-400 text-xs">
                The lower bound is inclusive; a blank upper bound makes the bracket open-ended.
              </p>
            </div>
            <RateTiersEditor tiers={form.tiers} onChange={(tiers) => set('tiers', tiers)} />
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1.5">
            <Label className="font-medium text-gray-700 text-xs dark:text-gray-300">
              Min weight (kg)
            </Label>
            <Input
              type="number"
              min="0"
              step="0.001"
              value={form.minWeight}
              onChange={(event) => set('minWeight', event.target.value)}
              placeholder="Any"
              className="h-10"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="font-medium text-gray-700 text-xs dark:text-gray-300">
              Max weight (kg)
            </Label>
            <Input
              type="number"
              min="0"
              step="0.001"
              value={form.maxWeight}
              onChange={(event) => set('maxWeight', event.target.value)}
              placeholder="Any"
              className="h-10"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="font-medium text-gray-700 text-xs dark:text-gray-300">
              Free over
            </Label>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={form.freeOver}
              onChange={(event) => set('freeOver', event.target.value)}
              placeholder="Never"
              className="h-10"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="font-medium text-gray-700 text-xs dark:text-gray-300">Priority</Label>
            <Input
              type="number"
              min="0"
              value={form.priority}
              onChange={(event) => set('priority', event.target.value)}
              className="h-10"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="font-medium text-gray-700 text-xs dark:text-gray-300">
              ETA from (days)
            </Label>
            <Input
              type="number"
              min="0"
              value={form.etaMin}
              onChange={(event) => set('etaMin', event.target.value)}
              placeholder="1"
              className="h-10"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="font-medium text-gray-700 text-xs dark:text-gray-300">
              ETA to (days)
            </Label>
            <Input
              type="number"
              min="0"
              value={form.etaMax}
              onChange={(event) => set('etaMax', event.target.value)}
              placeholder="3"
              className="h-10"
            />
          </div>

          <label className="flex cursor-pointer items-center gap-3 self-end pb-2">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(event) => set('isActive', event.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="font-medium text-gray-700 text-sm dark:text-gray-200">Active</span>
          </label>

          <label className="flex cursor-pointer items-center gap-3 self-end pb-2">
            <input
              type="checkbox"
              checked={form.carriesHazmat}
              onChange={(event) => set('carriesHazmat', event.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="font-medium text-gray-700 text-sm dark:text-gray-200">
              Carries dangerous goods
            </span>
          </label>
        </div>

        <div className="space-y-1.5">
          <Label className="font-medium text-gray-700 text-xs dark:text-gray-300">
            Description <span className="font-normal text-gray-400">(optional)</span>
          </Label>
          <Input
            value={form.description}
            onChange={(event) => set('description', event.target.value)}
            placeholder="Shown to the customer at checkout"
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
          {rate ? 'Update rate' : 'Create rate'}
        </Button>
      </div>
    </Modal>
  )
}
