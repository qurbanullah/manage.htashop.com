import api from '@/api/client'
import { parseApiResponse } from '@/lib/api-response'
import { authHeaders } from '@/lib/auth-header'

export interface SalesChannelOption {
  code: string
  name: string
  description: string | null
}

/**
 * Canonical channel metadata. Used when the options endpoint is unavailable
 * (older backend deployments) or the request fails, so the product form never
 * blocks on channel lookup. The codes mirror App\Enums\SalesChannel.
 */
export const FALLBACK_SALES_CHANNELS: SalesChannelOption[] = [
  {
    code: 'storefront',
    name: 'Consumer storefront',
    description: 'Publish the product in the public consumer storefront catalog.',
  },
  {
    code: 'punchout',
    name: 'Punchout catalog',
    description: 'Expose the product to connected procurement systems through punchout catalogs.',
  },
  {
    code: 'marketplace',
    name: 'Marketplace',
    description: 'List the product on third-party marketplaces.',
  },
  {
    code: 'api',
    name: 'API / partner',
    description:
      'Make the product available to partner integrations reading the catalog over the API.',
  },
]

export const salesChannelsApi = {
  async list(): Promise<SalesChannelOption[]> {
    try {
      const res = await api.get('sales-channels', {
        headers: authHeaders(),
        throwHttpErrors: false,
      })

      if (!res.ok) return FALLBACK_SALES_CHANNELS

      const body = await parseApiResponse<SalesChannelOption[]>(res)
      return (body.data as SalesChannelOption[]) ?? []
    } catch {
      return FALLBACK_SALES_CHANNELS
    }
  },
}
