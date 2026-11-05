import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ManageHighlight, ProductHighlightAssignment } from '@/api/highlights'
import { ToasterProvider } from '@/components/ui/Toaster'
import { ProductHighlightsStep } from './ProductHighlightsStep'

const mocks = vi.hoisted(() => ({
  list: vi.fn(),
  create: vi.fn(),
  productHighlights: vi.fn(),
  sync: vi.fn(),
}))

vi.mock('@/api/highlights', () => ({
  highlightsApi: {
    list: mocks.list,
    create: mocks.create,
    productHighlights: mocks.productHighlights,
    sync: mocks.sync,
  },
}))

function highlight(
  overrides: Partial<ManageHighlight> & Pick<ManageHighlight, 'id'>
): ManageHighlight {
  return {
    uuid: `uuid-${overrides.id}`,
    label: null,
    heading: `Heading ${overrides.id}`,
    body: `Body ${overrides.id}`,
    code: `code-${overrides.id}`,
    is_active: true,
    sort_order: 1,
    ...overrides,
  }
}

function renderStep(
  categoryIds: number[] = [5],
  highlights: ProductHighlightAssignment[] = [],
  onChange = vi.fn()
) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  })

  render(
    <QueryClientProvider client={queryClient}>
      <ToasterProvider>
        <ProductHighlightsStep data={{ categoryIds, highlights }} onChange={onChange} />
      </ToasterProvider>
    </QueryClientProvider>
  )

  return onChange
}

describe('ProductHighlightsStep', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.list.mockResolvedValue([
      highlight({ id: 1, heading: 'Business Ready', body: 'Built for fleet deployment.' }),
      highlight({ id: 2, heading: 'Fast Storage', body: 'Keeps boot times short.' }),
    ])
  })

  it('lists the highlights available for the product categories', async () => {
    renderStep([5])

    expect(await screen.findByText('Business Ready')).toBeInTheDocument()
    expect(screen.getByText('Fast Storage')).toBeInTheDocument()
    expect(mocks.list).toHaveBeenCalledWith([5])
  })

  it('selects a highlight and exposes the override fields', async () => {
    const onChange = renderStep([5])

    await userEvent.click(await screen.findByRole('checkbox', { name: /Business Ready/ }))

    expect(onChange).toHaveBeenCalledWith({
      highlights: [{ highlight_id: 1, heading_override: '', body_override: '' }],
    })
  })

  it('asks for categories before showing highlights', () => {
    renderStep([])

    expect(screen.getByText(/Select categories first/)).toBeInTheDocument()
    expect(mocks.list).not.toHaveBeenCalled()
  })

  it('explains when the branch has no highlights', async () => {
    mocks.list.mockResolvedValue([])

    renderStep([5])

    expect(await screen.findByText(/No highlights available/)).toBeInTheDocument()
  })
})
