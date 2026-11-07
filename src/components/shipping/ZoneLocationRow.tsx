import { useQuery } from '@tanstack/react-query'
import { Trash2 } from 'lucide-react'
import { citiesApi } from '@/api/cities'
import { countriesApi } from '@/api/countries'
import type { ZoneLocationType } from '@/api/shippingConfig'
import { Input } from '@/components/ui/input'

export interface ZoneLocationDraft {
  id: string
  type: ZoneLocationType
  countryId: string
  cityId: string
  state: string
  postalCodePrefix: string
}

let locationSequence = 0

/** Draft rows carry a local id so React can keep their state while editing. */
export function newLocation(
  partial: Partial<Omit<ZoneLocationDraft, 'id'>> = {}
): ZoneLocationDraft {
  locationSequence += 1

  return {
    id: `zone-location-${locationSequence}`,
    type: 'country',
    countryId: '',
    cityId: '',
    state: '',
    postalCodePrefix: '',
    ...partial,
  }
}

const TYPES: Array<{ value: ZoneLocationType; label: string }> = [
  { value: 'country', label: 'Country' },
  { value: 'city', label: 'City' },
  { value: 'state', label: 'State / province' },
  { value: 'postal_prefix', label: 'Postal prefix' },
]

const selectClass =
  'h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm dark:border-gray-600 dark:bg-gray-800'

interface Props {
  location: ZoneLocationDraft
  onChange: (location: ZoneLocationDraft) => void
  onRemove: () => void
}

/**
 * One destination matcher. The `type` decides which field the row asks for, so
 * the editor never invites data the rate engine will ignore.
 */
export function ZoneLocationRow({ location, onChange, onRemove }: Props) {
  const { data: countries = [] } = useQuery({
    queryKey: ['countries'],
    queryFn: () => countriesApi.list(),
    staleTime: 24 * 60 * 60 * 1000,
  })

  const countryId = Number(location.countryId) || null

  const { data: cities = [] } = useQuery({
    queryKey: ['cities', countryId],
    queryFn: () => citiesApi.list(countryId as number),
    enabled: countryId !== null,
    staleTime: 24 * 60 * 60 * 1000,
  })

  const set = (partial: Partial<ZoneLocationDraft>) => onChange({ ...location, ...partial })

  const setType = (type: ZoneLocationType) =>
    onChange({
      ...location,
      type,
      // City implies its country, so keep it; everything else is type-specific.
      cityId: type === 'city' ? location.cityId : '',
      state: type === 'state' ? location.state : '',
      postalCodePrefix: type === 'postal_prefix' ? location.postalCodePrefix : '',
    })

  return (
    <div className="grid gap-2 rounded-lg border border-gray-200 p-3 sm:grid-cols-12 dark:border-gray-700">
      <div className="sm:col-span-3">
        <select
          value={location.type}
          onChange={(event) => setType(event.target.value as ZoneLocationType)}
          className={selectClass}
          aria-label="Location type"
        >
          {TYPES.map((type) => (
            <option key={type.value} value={type.value}>
              {type.label}
            </option>
          ))}
        </select>
      </div>

      <div className="sm:col-span-3">
        <select
          value={location.countryId}
          onChange={(event) => set({ countryId: event.target.value, cityId: '' })}
          className={selectClass}
          aria-label="Country"
        >
          <option value="">Country...</option>
          {countries.map((country) => (
            <option key={country.id} value={country.id}>
              {country.name}
            </option>
          ))}
        </select>
      </div>

      {location.type === 'city' && (
        <div className="sm:col-span-3">
          <select
            value={location.cityId}
            onChange={(event) => set({ cityId: event.target.value })}
            className={selectClass}
            aria-label="City"
            disabled={countryId === null}
          >
            <option value="">City...</option>
            {cities.map((city) => (
              <option key={city.id} value={city.id}>
                {city.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {location.type === 'state' && (
        <div className="sm:col-span-3">
          <Input
            value={location.state}
            onChange={(event) => set({ state: event.target.value })}
            placeholder="Punjab"
            aria-label="State"
            className="h-10"
          />
        </div>
      )}

      {location.type === 'postal_prefix' && (
        <div className="sm:col-span-3">
          <Input
            value={location.postalCodePrefix}
            onChange={(event) => set({ postalCodePrefix: event.target.value })}
            placeholder="545"
            aria-label="Postal code prefix"
            className="h-10 font-mono"
          />
        </div>
      )}

      <div className="flex items-center justify-end sm:col-span-3">
        <button
          type="button"
          onClick={onRemove}
          aria-label="Remove location"
          className="rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
