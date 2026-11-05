import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Feature } from '@/api/features'
import { FeaturesStep } from './ProductFeaturesStep'

const mocks = vi.hoisted(() => ({
  list: vi.fn(),
}))

vi.mock('@/api/features', () => ({
  featuresApi: { list: mocks.list },
}))

function feature(name: string, matchesCategory = false): Feature {
  return {
    id: name.length + name.charCodeAt(0),
    name,
    slug: name.toLowerCase().replace(/\s+/g, '-'),
    matches_category: matchesCategory,
  }
}

function renderStep(selected: string[] = [], onChange = vi.fn()) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  })

  render(
    <QueryClientProvider client={queryClient}>
      <FeaturesStep data={{ featureNames: selected, categoryIds: [5] }} onChange={onChange} />
    </QueryClientProvider>
  )

  return onChange
}

describe('FeaturesStep', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.list.mockResolvedValue([
      feature('ESD Safe', true),
      feature('Surface Mount', true),
      feature('Gluten Free'),
      feature('Bluetooth'),
    ])
  })

  it('lists only the category recommendations as chips', async () => {
    renderStep()

    expect(await screen.findByText('Recommended for this category')).toBeInTheDocument()

    const recommended = screen.getByText('Recommended for this category').parentElement
    expect(within(recommended as HTMLElement).getByText('(2)')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'ESD Safe' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Surface Mount' })).toBeInTheDocument()

    // The full vocabulary is not rendered as chips.
    expect(screen.queryByRole('button', { name: 'Gluten Free' })).not.toBeInTheDocument()
  })

  it('searches the full vocabulary in the combobox', async () => {
    const onChange = renderStep()

    await userEvent.click(await screen.findByRole('button', { name: /Search and add features/ }))

    const search = screen.getByPlaceholderText('Search all features…')
    await userEvent.type(search, 'gluten')

    await waitFor(() =>
      expect(screen.getByRole('option', { name: /Gluten Free/ })).toBeInTheDocument()
    )
    expect(screen.queryByRole('option', { name: /Bluetooth/ })).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('option', { name: /Gluten Free/ }))

    expect(onChange).toHaveBeenCalledWith({ featureNames: ['Gluten Free'] })
  })

  it('lists the current selection as removable tags', async () => {
    const onChange = renderStep(['Bluetooth', 'ESD Safe'])

    expect(await screen.findByText('Selected')).toBeInTheDocument()
    expect(screen.getByText('(2)')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Remove Bluetooth' }))

    expect(onChange).toHaveBeenCalledWith({ featureNames: ['ESD Safe'] })
  })

  it('hides the custom feature input until asked and folds near-duplicates into the vocabulary', async () => {
    const onChange = renderStep()

    expect(screen.queryByPlaceholderText('Name the feature')).not.toBeInTheDocument()

    await userEvent.click(await screen.findByRole('button', { name: /Add new feature/ }))

    await userEvent.type(screen.getByPlaceholderText('Name the feature'), '  esd   safe ')
    await userEvent.click(screen.getByRole('button', { name: /^Add$/ }))

    expect(onChange).toHaveBeenCalledWith({ featureNames: ['ESD Safe'] })
  })
})
