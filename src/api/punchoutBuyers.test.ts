import { beforeEach, describe, expect, it, vi } from 'vitest'
import { punchoutBuyersApi } from '@/api/punchoutBuyers'

const mocks = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
}))

vi.mock('@/api/client', () => ({ default: mocks }))

function jsonResponse(body: unknown): Response {
  return {
    ok: true,
    status: 200,
    json: async () => body,
  } as unknown as Response
}

describe('punchoutBuyersApi.list', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('sends filters without a tenant, which the server derives from membership', async () => {
    mocks.get.mockResolvedValue(
      jsonResponse({ success: true, message: 'ok', data: { items: [], meta: {} } })
    )

    await punchoutBuyersApi.list({
      search: 'acme',
      protocol: 'oci',
      is_active: '0',
      page: 3,
      per_page: 15,
    })

    expect(mocks.get).toHaveBeenCalledWith(
      'manage/punchout/buyers',
      expect.objectContaining({
        searchParams: {
          search: 'acme',
          protocol: 'oci',
          is_active: '0',
          page: '3',
          per_page: '15',
        },
      })
    )
  })

  it('normalizes the items/meta envelope and falls back to an empty page', async () => {
    mocks.get.mockResolvedValueOnce(
      jsonResponse({
        success: true,
        message: 'ok',
        data: {
          items: [{ uuid: 'buyer-1' }],
          meta: { current_page: 1, last_page: 1, per_page: 15, total: 1 },
        },
      })
    )

    const result = await punchoutBuyersApi.list()

    expect(result.items).toHaveLength(1)
    expect(result.meta.total).toBe(1)
  })
})

describe('punchoutBuyersApi.options', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('scopes contracts to the selected organization', async () => {
    mocks.get.mockResolvedValue(
      jsonResponse({ success: true, message: 'ok', data: { organizations: [], contracts: [] } })
    )

    await punchoutBuyersApi.options({ organization_id: 9, search: 'acme' })

    expect(mocks.get).toHaveBeenCalledWith(
      'manage/punchout/buyers/options',
      expect.objectContaining({ searchParams: { organization_id: '9', search: 'acme' } })
    )
  })
})

describe('punchoutBuyersApi mutations', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('creates through the manager endpoint', async () => {
    mocks.post.mockResolvedValue(
      jsonResponse({ success: true, message: 'ok', data: { uuid: 'buyer-1' } })
    )

    await punchoutBuyersApi.create({ name: 'Acme', code: 'acme' })

    expect(mocks.post).toHaveBeenCalledWith(
      'manage/punchout/buyers',
      expect.objectContaining({ json: { name: 'Acme', code: 'acme' } })
    )
  })

  it('sends the rotation overlap flag', async () => {
    mocks.post.mockResolvedValue(
      jsonResponse({ success: true, message: 'ok', data: { uuid: 'buyer-1' } })
    )

    await punchoutBuyersApi.rotateSecret('buyer-1', 'new-secret-value', false)

    expect(mocks.post).toHaveBeenCalledWith(
      'manage/punchout/buyers/buyer-1/rotate-secret',
      expect.objectContaining({
        json: { shared_secret: 'new-secret-value', keep_previous: false },
      })
    )
  })
})
