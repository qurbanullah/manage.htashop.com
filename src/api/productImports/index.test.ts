import { beforeEach, describe, expect, it, vi } from 'vitest'
import { productImportsApi } from '@/api/productImports'

const mocks = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
}))

vi.mock('@/api/client', () => ({ default: mocks }))

function jsonResponse(body: unknown, ok = true, status = 200): Response {
  return {
    ok,
    status,
    json: async () => body,
  } as unknown as Response
}

const importRecord = {
  id: 1,
  uuid: 'import-uuid',
  original_filename: 'products.csv',
  format: 'csv',
  size_bytes: 1024,
  status: 'validated',
  status_label: 'Validating rows',
  is_finished: false,
  progress: 0,
  options: {},
  counts: {
    total: 3,
    processed: 1,
    created: 0,
    updated: 0,
    skipped: 0,
    failed: 1,
    valid: 2,
    invalid: 1,
    imported: 0,
  },
  error_message: null,
  tenant_id: 1,
  organization_id: 2,
  started_at: null,
  finished_at: null,
  created_at: '2026-11-08T10:00:00+00:00',
  updated_at: '2026-11-08T10:00:00+00:00',
}

describe('productImportsApi', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('normalises the paginated list envelope and drops empty filters', async () => {
    mocks.get.mockResolvedValue(
      jsonResponse({
        success: true,
        message: 'ok',
        data: {
          data: [importRecord],
          meta: { current_page: 1, last_page: 2, per_page: 10, total: 11, from: 1, to: 10 },
        },
      })
    )

    const page = await productImportsApi.list({ page: 1, per_page: 10, status: '' })

    expect(mocks.get).toHaveBeenCalledWith(
      'product-imports',
      expect.objectContaining({ searchParams: { page: '1', per_page: '10' } })
    )
    expect(page.items).toHaveLength(1)
    expect(page.items[0]?.uuid).toBe('import-uuid')
    expect(page.meta.total).toBe(11)
  })

  it('falls back to an empty page when the payload is missing', async () => {
    mocks.get.mockResolvedValue(jsonResponse({ success: true, message: 'ok', data: null }))

    const page = await productImportsApi.list()

    expect(page.items).toEqual([])
    expect(page.meta.current_page).toBe(1)
    expect(page.meta.total).toBe(0)
  })

  it('sends the upload as multipart with booleans as 1/0', async () => {
    mocks.post.mockResolvedValue(
      jsonResponse({ success: true, message: 'File validated.', data: importRecord }, true, 201)
    )

    const file = new File(['external_id,name\nHTA-1,Arduino\n'], 'products.csv', {
      type: 'text/csv',
    })

    const response = await productImportsApi.upload({
      file,
      kind: 'images',
      warehouse: 'MAIN',
      create_missing: true,
      dry_run: false,
      download_images: false,
    })

    const [url, options] = mocks.post.mock.calls[0] as [string, { body: FormData }]

    expect(url).toBe('product-imports')
    expect(options.body).toBeInstanceOf(FormData)
    expect(options.body.get('file')).toBeInstanceOf(File)
    expect(options.body.get('kind')).toBe('images')
    expect(options.body.get('warehouse')).toBe('MAIN')
    expect(options.body.get('create_missing')).toBe('1')
    expect(options.body.get('dry_run')).toBe('0')
    expect(options.body.get('download_images')).toBe('0')
    expect(response.data.status).toBe('validated')
  })

  it('commits and cancels through the import uuid', async () => {
    mocks.post.mockResolvedValue(
      jsonResponse({ success: true, message: 'Import queued.', data: importRecord }, true, 202)
    )

    await productImportsApi.commit('import-uuid')
    await productImportsApi.cancel('import-uuid')

    expect(mocks.post).toHaveBeenNthCalledWith(
      1,
      'product-imports/import-uuid/commit',
      expect.objectContaining({})
    )
    expect(mocks.post).toHaveBeenNthCalledWith(
      2,
      'product-imports/import-uuid/cancel',
      expect.objectContaining({})
    )
  })

  it('surfaces the server error message when a commit is refused', async () => {
    mocks.post.mockResolvedValue(
      jsonResponse(
        { success: false, message: 'There are no valid rows left to import.' },
        false,
        422
      )
    )

    await expect(productImportsApi.commit('import-uuid')).rejects.toThrow(
      'There are no valid rows left to import.'
    )
  })
})
