import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Category } from '@/api/categories'
import { CategoriesStep } from './ProductCategoriesStep'

const mocks = vi.hoisted(() => ({ tree: vi.fn() }))

vi.mock('@/api/categories', () => ({
  categoriesApi: { tree: mocks.tree },
}))

const TREE: Category[] = [
  {
    id: 1,
    name: 'Electronics',
    slug: 'electronics',
    parent_id: null,
    level: 0,
    children: [
      {
        id: 2,
        name: 'Computers',
        slug: 'computers',
        parent_id: 1,
        level: 1,
        children: [
          {
            id: 3,
            name: 'Laptops',
            slug: 'laptops',
            parent_id: 2,
            level: 2,
            children: [],
          },
        ],
      },
      { id: 4, name: 'Audio', slug: 'audio', parent_id: 1, level: 1, children: [] },
    ],
  },
]

function Harness({ initial }: { initial: number[] }) {
  const [data, setData] = useState<{ categoryIds: number[]; tags: string[] }>({
    categoryIds: initial,
    tags: [],
  })

  return (
    <div>
      <CategoriesStep data={data} onChange={setData} />
      <output data-testid="ids">{data.categoryIds.join(',')}</output>
    </div>
  )
}

function renderStep(initial: number[] = []) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const user = userEvent.setup()

  render(
    <QueryClientProvider client={client}>
      <Harness initial={initial} />
    </QueryClientProvider>
  )

  return { user }
}

async function openTree(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: 'Categories' }))
  await screen.findByRole('checkbox', { name: /Electronics/ })
}

const ids = () => screen.getByTestId('ids').textContent

describe('CategoriesStep tree', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.tree.mockResolvedValue(TREE)
  })

  it('renders the tree with roots expanded', async () => {
    const { user } = renderStep()
    await openTree(user)

    expect(screen.getByText('Electronics')).toBeInTheDocument()
    expect(screen.getByText('Computers')).toBeInTheDocument()
    expect(screen.getByText('Audio')).toBeInTheDocument()
    // Grandchildren stay collapsed until their parent is expanded.
    expect(screen.queryByText('Laptops')).not.toBeInTheDocument()
  })

  it('selects the parent when a child is selected', async () => {
    const { user } = renderStep()
    await openTree(user)

    await user.click(screen.getByRole('checkbox', { name: /Computers/ }))

    await waitFor(() => expect(ids()).toBe('2,1'))
    expect(screen.getByRole('checkbox', { name: /Electronics/ })).toBeChecked()
    expect(screen.getByRole('checkbox', { name: /Computers/ })).toBeChecked()
  })

  it('selects every ancestor when a grandchild is selected', async () => {
    const { user } = renderStep()
    await openTree(user)

    await user.click(screen.getByRole('button', { name: 'Expand Computers' }))
    await user.click(screen.getByRole('checkbox', { name: /Laptops/ }))

    await waitFor(() => expect(ids()).toBe('3,2,1'))
    expect(screen.getByRole('checkbox', { name: /Electronics/ })).toBeChecked()
    expect(screen.getByRole('checkbox', { name: /Computers/ })).toBeChecked()
    expect(screen.getByRole('checkbox', { name: /Laptops/ })).toBeChecked()
  })

  it('removes descendants when a parent is unchecked', async () => {
    const { user } = renderStep([3, 2, 1])
    await openTree(user)

    await waitFor(() => expect(ids()).toBe('3,2,1'))
    await user.click(screen.getByRole('checkbox', { name: /Electronics/ }))

    await waitFor(() => expect(ids()).toBe(''))
  })

  it('closes an existing leaf-only selection over its ancestors on mount', async () => {
    renderStep([3])

    await waitFor(() => expect(ids()).toBe('3,2,1'))
  })

  it('finds categories through search and selects their ancestors', async () => {
    const { user } = renderStep()
    await openTree(user)

    await user.type(screen.getByPlaceholderText('Search categories...'), 'lapt')
    const result = await screen.findByText('Laptops')
    await user.click(result)

    await waitFor(() => expect(ids()).toBe('3,2,1'))
  })

  it('clears the whole selection with Clear all', async () => {
    const { user } = renderStep([3, 2, 1])

    const clear = await screen.findByRole('button', { name: 'Clear all' })
    await user.click(clear)

    await waitFor(() => expect(ids()).toBe(''))
  })
})
