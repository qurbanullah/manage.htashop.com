import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Specification } from '@/api/specifications'
import { SpecificationsStep } from './ProductSpecificationsStep'

const mocks = vi.hoisted(() => ({
  specifications: vi.fn(),
  units: vi.fn(),
}))

vi.mock('@/api/specifications', () => ({
  specificationsApi: { list: mocks.specifications },
}))

vi.mock('@/api/units', () => ({
  unitsApi: { list: mocks.units },
}))

interface SpecRow {
  id: string
  key: string
  value: string
  unitId: number | null
  unitName: string
}

function renderStep(specs: SpecRow[] = [], onChange = vi.fn()) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  })

  render(
    <QueryClientProvider client={queryClient}>
      <SpecificationsStep data={{ specs }} onChange={onChange} />
    </QueryClientProvider>
  )

  return onChange
}

function specification(
  name: string,
  group: string,
  unit: string | null,
  description: string | null = null
): Specification {
  return {
    id: name.length,
    name,
    slug: name.toLowerCase().replace(/\s+/g, '-'),
    group,
    unit,
    description,
  }
}

describe('SpecificationsStep', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    mocks.specifications.mockResolvedValue([
      specification('Weight', 'Weight & Capacity', 'kg', 'Product weight'),
      specification('Operating Voltage', 'Electrical', 'v', 'Nominal operating voltage'),
      specification('Length', 'Dimensions', 'mm', 'Overall length'),
    ])

    mocks.units.mockResolvedValue([
      {
        id: 2,
        uuid: 'u-2',
        name: 'Kilogram',
        code: 'kg',
        symbol: 'kg',
        measurement: { id: 1, name: 'Mass', code: 'mass' },
      },
      {
        id: 7,
        uuid: 'u-7',
        name: 'Volt',
        code: 'v',
        symbol: 'V',
        measurement: { id: 2, name: 'Electric Potential', code: 'voltage' },
      },
      {
        id: 3,
        uuid: 'u-3',
        name: 'Millimeter',
        code: 'mm',
        symbol: 'mm',
        measurement: { id: 3, name: 'Length', code: 'length' },
      },
    ])
  })

  it('takes the key from the catalogue instead of a free-text input', async () => {
    renderStep()

    expect(await screen.findByRole('button', { name: /Select specification/ })).toBeInTheDocument()
    expect(screen.queryByPlaceholderText(/Key \(e\.g\. Weight\)/)).not.toBeInTheDocument()
  })

  it('suggests the catalogue unit and adds the row', async () => {
    const onChange = renderStep()

    await userEvent.click(await screen.findByRole('button', { name: /Select specification/ }))
    await userEvent.click(await screen.findByRole('option', { name: /Operating Voltage/ }))

    // The suggested unit is preselected from the catalogue.
    expect(screen.getByRole('button', { name: /Volt \(V\)/ })).toBeInTheDocument()

    await userEvent.type(screen.getByPlaceholderText(/Value/), '24')
    await userEvent.click(screen.getByRole('button', { name: /^Add$/ }))

    expect(onChange).toHaveBeenCalledWith({
      specs: [
        expect.objectContaining({
          key: 'Operating Voltage',
          value: '24',
          unitId: 7,
          unitName: 'Volt (V)',
        }),
      ],
    })
  })

  it('does not offer keys the product already uses', async () => {
    renderStep([{ id: 'spec-1', key: 'Weight', value: '2', unitId: null, unitName: '' }])

    await userEvent.click(await screen.findByRole('button', { name: /Select specification/ }))

    await waitFor(() =>
      expect(screen.getByRole('option', { name: /Operating Voltage/ })).toBeInTheDocument()
    )
    expect(screen.queryByRole('option', { name: /Weight/ })).not.toBeInTheDocument()
  })

  it('keeps Add disabled until a key and a value are provided', async () => {
    renderStep()

    const add = await screen.findByRole('button', { name: /^Add$/ })
    expect(add).toBeDisabled()

    await userEvent.click(await screen.findByRole('button', { name: /Select specification/ }))
    await userEvent.click(await screen.findByRole('option', { name: /Length/ }))

    expect(add).toBeDisabled()

    await userEvent.type(screen.getByPlaceholderText(/Value/), '110')

    await waitFor(() => expect(add).toBeEnabled())
  })
})
