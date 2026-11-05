import api from '@/api/client'
import { parseApiResponse } from '@/lib/api-response'
import { authHeaders } from '@/lib/auth-header'

export interface Specification {
  id: number
  name: string
  slug: string
  group: string | null
  /** Suggested unit code from the `units` table (e.g. mm, kg, V). */
  unit: string | null
  description: string | null
}

export const specificationsApi = {
  async list(type = 'product'): Promise<Specification[]> {
    const res = await api.get('specifications', {
      searchParams: { type },
      headers: authHeaders(),
    })
    const body = await parseApiResponse<Specification[]>(res)
    return (body.data as Specification[]) ?? []
  },
}
