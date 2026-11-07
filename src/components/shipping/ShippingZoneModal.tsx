import { Loader2, Plus } from 'lucide-react'
import { useEffect, useState } from 'react'
import { type ShippingZone, type ShippingZonePayload, shippingZonesApi } from '@/api/shippingConfig'
import {
  newLocation,
  type ZoneLocationDraft,
  ZoneLocationRow,
} from '@/components/shipping/ZoneLocationRow'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Modal } from '@/components/ui/modal'
import { useToast } from '@/components/ui/Toaster'
import { isApiError } from '@/lib/api-response'

interface Props {
  isOpen: boolean
  onClose: () => void
  zone: ShippingZone | null
  onSaved: () => void
}

interface ZoneForm {
  name: string
  code: string
  description: string
  isActive: boolean
  sortOrder: string
  locations: ZoneLocationDraft[]
}

const EMPTY: ZoneForm = {
  name: '',
  code: '',
  description: '',
  isActive: true,
  sortOrder: '0',
  locations: [],
}

function toForm(zone: ShippingZone | null): ZoneForm {
  if (!zone) return { ...EMPTY, locations: [newLocation()] }

  return {
    name: zone.name,
    code: zone.code,
    description: zone.description ?? '',
    isActive: zone.is_active,
    sortOrder: String(zone.sort_order),
    locations: zone.locations.map((location) =>
      newLocation({
        type: location.type,
        countryId: location.country_id != null ? String(location.country_id) : '',
        cityId: location.city_id != null ? String(location.city_id) : '',
        state: location.state ?? '',
        postalCodePrefix: location.postal_code_prefix ?? '',
      })
    ),
  }
}

function toPayload(form: ZoneForm): ShippingZonePayload {
  return {
    name: form.name.trim(),
    code: form.code.trim() || undefined,
    description: form.description.trim() || undefined,
    is_active: form.isActive,
    sort_order: Number(form.sortOrder) || 0,
    locations: form.locations.map((location) => ({
      type: location.type,
      country_id: location.countryId ? Number(location.countryId) : null,
      city_id: location.type === 'city' && location.cityId ? Number(location.cityId) : null,
      state: location.type === 'state' ? location.state.trim() || null : null,
      postal_code_prefix:
        location.type === 'postal_prefix' ? location.postalCodePrefix.trim() || null : null,
    })),
  }
}

export function ShippingZoneModal({ isOpen, onClose, zone, onSaved }: Props) {
  const { success: showSuccess, error: showError } = useToast()
  const [form, setForm] = useState<ZoneForm>(EMPTY)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (isOpen) setForm(toForm(zone))
  }, [isOpen, zone])

  const set = <K extends keyof ZoneForm>(key: K, value: ZoneForm[K]) =>
    setForm((previous) => ({ ...previous, [key]: value }))

  const updateLocation = (index: number, location: ZoneLocationDraft) =>
    set(
      'locations',
      form.locations.map((row, rowIndex) => (rowIndex === index ? location : row))
    )

  const addLocation = () =>
    set('locations', [
      ...form.locations,
      newLocation({ countryId: form.locations[0]?.countryId ?? '' }),
    ])

  const removeLocation = (index: number) =>
    set(
      'locations',
      form.locations.filter((_, rowIndex) => rowIndex !== index)
    )

  const handleSave = async () => {
    if (!form.name.trim()) {
      showError('Give the zone a name.')
      return
    }

    setSaving(true)

    try {
      if (zone) {
        await shippingZonesApi.update(zone.uuid, toPayload(form))
        showSuccess('Shipping zone updated')
      } else {
        await shippingZonesApi.create(toPayload(form))
        showSuccess('Shipping zone created')
      }

      onSaved()
      onClose()
    } catch (error) {
      if (isApiError(error) && error.errors) {
        showError(Object.values(error.errors).flat()[0] ?? error.message)
      } else {
        showError(isApiError(error) ? error.message : 'Failed to save the shipping zone')
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={zone ? 'Edit shipping zone' : 'Add shipping zone'}
      maxWidth="4xl"
    >
      <div className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label className="font-medium text-gray-700 text-xs dark:text-gray-300">Name</Label>
            <Input
              value={form.name}
              onChange={(event) => set('name', event.target.value)}
              placeholder="Lahore Metro"
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
              placeholder="lahore-metro"
              className="h-10 font-mono"
            />
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <Label className="font-medium text-gray-700 text-xs dark:text-gray-300">
              Description <span className="font-normal text-gray-400">(optional)</span>
            </Label>
            <Input
              value={form.description}
              onChange={(event) => set('description', event.target.value)}
              placeholder="Same-day delivery inside Lahore city limits"
              className="h-10"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="font-medium text-gray-700 text-xs dark:text-gray-300">
              Sort order
            </Label>
            <Input
              type="number"
              min="0"
              value={form.sortOrder}
              onChange={(event) => set('sortOrder', event.target.value)}
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
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h3 className="font-medium text-gray-900 text-sm dark:text-white">Destinations</h3>
              <p className="text-gray-400 text-xs">
                The most specific match wins: city, then postal prefix, then state, then country.
              </p>
            </div>
            <button
              type="button"
              onClick={addLocation}
              className="inline-flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 font-medium text-blue-600 text-xs hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/20"
            >
              <Plus className="h-3.5 w-3.5" /> Add destination
            </button>
          </div>

          {form.locations.length === 0 ? (
            <p className="rounded-lg bg-gray-50 p-3 text-gray-400 text-xs dark:bg-gray-800">
              No destinations yet — this zone will not match any address.
            </p>
          ) : (
            form.locations.map((location, index) => (
              <ZoneLocationRow
                key={location.id}
                location={location}
                onChange={(next) => updateLocation(index, next)}
                onRemove={() => removeLocation(index)}
              />
            ))
          )}
        </div>
      </div>

      <div className="mt-6 flex justify-end gap-2">
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : null}
          {zone ? 'Update zone' : 'Create zone'}
        </Button>
      </div>
    </Modal>
  )
}
