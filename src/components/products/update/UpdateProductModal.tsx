import { useQuery } from '@tanstack/react-query'
import {
  Boxes,
  Check,
  ChevronRight,
  DollarSign,
  Factory,
  FolderTree,
  Globe2,
  ListChecks,
  Package,
  Ruler,
  Sparkles,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { highlightsApi, type ProductHighlightAssignment } from '@/api/highlights'
import { inventoryApi } from '@/api/inventory'
import { type ProductData, productsApi } from '@/api/products'
import { BrandManufacturerStep } from '@/components/products/create/steps/BrandManufacturerStep'
import { BasicInfoStep } from '@/components/products/create/steps/ProductBasicInfoStep'
import { CategoriesStep } from '@/components/products/create/steps/ProductCategoriesStep'
import { FeaturesStep } from '@/components/products/create/steps/ProductFeaturesStep'
import { ProductHighlightsStep } from '@/components/products/create/steps/ProductHighlightsStep'
import {
  type InventoryFormData,
  InventoryStep,
} from '@/components/products/create/steps/ProductInventoryStep'
import { PricingStep } from '@/components/products/create/steps/ProductPricingStep'
import { ProductSalesChannelsStep } from '@/components/products/create/steps/ProductSalesChannelsStep'
import { SpecificationsStep } from '@/components/products/create/steps/ProductSpecificationsStep'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import { useToast } from '@/components/ui/Toaster'
import { isApiError } from '@/lib/api-response'

interface Spec {
  id: string
  key: string
  value: string
  unitId: number | null
  unitName: string
}

interface EditProductData {
  name: string
  slug: string
  sellerSku: string
  partNumber: string
  hsCode: string
  unspsc: string
  ntn: string
  barcode: string
  modelNumber: string
  manufacturerId: string
  brandId: string
  channelCodes: string[]
  summary: string
  description: string
  categoryIds: number[]
  tags: string[]
  featureNames: string[]
  specs: Spec[]
  price: string
  salePrice: string
  currency: string
  unitId: string
  inventory: InventoryFormData
  highlights: ProductHighlightAssignment[]
}

const STEPS = [
  { key: 'basic', label: 'Basic Info', icon: Package },
  { key: 'categories', label: 'Categories', icon: FolderTree },
  { key: 'channels', label: 'Sales Channels', icon: Globe2 },
  { key: 'brand-manufacturer', label: 'Brand & Manufacturer', icon: Factory },
  { key: 'pricing', label: 'Pricing', icon: DollarSign },
  { key: 'features', label: 'Features', icon: ListChecks },
  { key: 'specs', label: 'Specifications', icon: Ruler },
  { key: 'inventory', label: 'Inventory', icon: Boxes },
  { key: 'highlights', label: 'Highlights', icon: Sparkles },
]

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: maps deeply nested product data into edit form shape
function buildInitialData(product: ProductData): EditProductData {
  const metadata = (product.metadata ?? {}) as Record<string, unknown>
  const specs = Array.isArray(metadata.specs)
    ? (metadata.specs as Array<Record<string, unknown>>).map((s, i) => ({
        id: String(s.id ?? `spec-${i}`),
        key: String(s.key ?? ''),
        value: String(s.value ?? ''),
        unitId: (s.unit_id as number) ?? null,
        unitName: String(s.unit_name ?? ''),
      }))
    : []

  const firstManufacturer = (product.manufacturers ?? [])[0]
  const firstBrand = (product.brands ?? [])[0]

  return {
    name: product.name ?? '',
    slug: product.slug ?? '',
    sellerSku: product.seller_sku ?? '',
    partNumber: product.part_number ?? '',
    hsCode: product.hs_code ?? '',
    unspsc: product.unspsc ?? '',
    ntn: product.ntn ?? '',
    barcode: product.barcode ?? '',
    modelNumber: product.model_number ?? '',
    manufacturerId: firstManufacturer?.id != null ? String(firstManufacturer.id) : '',
    brandId: firstBrand?.id != null ? String(firstBrand.id) : '',
    channelCodes:
      product.channels && product.channels.length > 0 ? product.channels : ['storefront'],
    summary: product.summary ?? '',
    description: product.description ?? '',
    categoryIds: (product.categories ?? []).map((c) => c.id),
    tags: (product.tags ?? []).map((t) => t.name),
    featureNames: (product.features ?? []).map((f) => f.name),
    specs,
    price: String(metadata.price ?? ''),
    salePrice: String(metadata.sale_price ?? ''),
    currency: String(metadata.currency ?? 'USD'),
    unitId: String(metadata.unit_id ?? ''),
    inventory: {
      trackInventory: true,
      quantity: '',
      lowStockThreshold: '',
      sku: '',
      warehouseId: '',
    },
    highlights: [],
  }
}

interface Props {
  product: ProductData
  isOpen: boolean
  onClose: () => void
  onUpdated?: () => void
}

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: multi-step edit modal with several effects
export function UpdateProductModal({ product, isOpen, onClose, onUpdated }: Props) {
  const { success: showSuccess, error: showError } = useToast()
  const [step, setStep] = useState(0)
  const [data, setData] = useState<EditProductData>(() => buildInitialData(product))
  const [loading, setLoading] = useState(false)

  const { data: inventories = [] } = useQuery({
    queryKey: ['inventory', 'product', product.id],
    queryFn: () =>
      inventoryApi.list({ stockable_type: 'App\\Models\\Product', stockable_id: product.id }),
    enabled: isOpen && !!product,
  })

  const { data: existingHighlights = [] } = useQuery({
    queryKey: ['product-highlights', product.uuid],
    queryFn: () => highlightsApi.productHighlights(product.uuid),
    enabled: isOpen && !!product,
  })

  useEffect(() => {
    if (isOpen) {
      setStep(0)
      setData(buildInitialData(product))
    }
  }, [isOpen, product])

  // Auto-generate slug from the name while typing, for draft products only.
  // Published (active) products keep their frozen slug.
  useEffect(() => {
    if (product.status === 'active') return

    const generated = data.name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')

    if (generated && generated !== data.slug) {
      setData((prev) => ({ ...prev, slug: generated }))
    }
  }, [data.name, product.status, data.slug])

  // Pre-populate highlights from existing product assignments
  useEffect(() => {
    if (existingHighlights.length) {
      setData((prev) => ({ ...prev, highlights: existingHighlights }))
    }
  }, [existingHighlights])

  // Pre-populate the inventory step from the first inventory record (Phase 1:
  // single inventory record is assumed; multi-warehouse editing comes later).
  useEffect(() => {
    const inv = inventories[0]
    if (!inv) return

    setData((prev) => ({
      ...prev,
      inventory: {
        trackInventory: inv.track_inventory,
        quantity: String(inv.quantity ?? ''),
        lowStockThreshold: inv.low_stock_threshold != null ? String(inv.low_stock_threshold) : '',
        sku: inv.sku ?? '',
        warehouseId: inv.warehouse_id != null ? String(inv.warehouse_id) : '',
      },
    }))
  }, [inventories])

  const isStepComplete = (i: number) => {
    if (i === 0) return data.name.trim().length > 0
    if (i === 1) return data.categoryIds.length > 0
    if (i === 2) return data.channelCodes.length > 0
    if (i === 3) return true // Brand & Manufacturer (optional)
    if (i === 4) return data.price.trim().length > 0 && Number(data.price) > 0
    return true // features, specs, inventory, highlights are optional
  }

  const isStepAccessible = (i: number) => {
    for (let j = 0; j < i; j++) {
      if (!isStepComplete(j)) return false
    }
    return true
  }

  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: sequential multi-step update flow
  const handleUpdate = async () => {
    try {
      setLoading(true)

      await productsApi.update(product.uuid, {
        name: data.name,
        slug: data.slug,
        seller_sku: data.sellerSku || undefined,
        part_number: data.partNumber || undefined,
        hs_code: data.hsCode || undefined,
        unspsc: data.unspsc || undefined,
        ntn: data.ntn || undefined,
        barcode: data.barcode || undefined,
        model_number: data.modelNumber || undefined,
        summary: data.summary || undefined,
        description: data.description || undefined,
        category_ids: data.categoryIds.length > 0 ? data.categoryIds : undefined,
        manufacturer_ids: data.manufacturerId ? [Number(data.manufacturerId)] : undefined,
        brand_ids: data.brandId ? [Number(data.brandId)] : undefined,
        channel_codes: data.channelCodes,
        features: data.featureNames.length > 0 ? data.featureNames : undefined,
        metadata: {
          specs: data.specs.map((s) => ({
            key: s.key,
            value: s.value,
            unit_id: s.unitId,
            unit_name: s.unitName,
          })),
          price: data.price || undefined,
          sale_price: data.salePrice || undefined,
          currency: data.currency,
          unit_id: data.unitId || undefined,
        },
      })

      if (data.inventory.trackInventory) {
        await inventoryApi.upsert({
          stockable_type: 'App\\Models\\Product',
          stockable_id: product.id,
          warehouse_id: data.inventory.warehouseId ? Number(data.inventory.warehouseId) : undefined,
          sku: data.inventory.sku || undefined,
          quantity: data.inventory.quantity ? Number(data.inventory.quantity) : 0,
          low_stock_threshold: data.inventory.lowStockThreshold
            ? Number(data.inventory.lowStockThreshold)
            : undefined,
          track_inventory: true,
        })
      }

      await highlightsApi.sync(
        product.uuid,
        data.highlights.map((h, i) => ({ ...h, sort_order: i }))
      )

      showSuccess('Product updated')
      onUpdated?.()
      onClose()
    } catch (e: unknown) {
      if (isApiError(e)) {
        if (e.errors) {
          const first = Object.values(e.errors).flat()[0]
          showError(first || e.message)
        } else {
          showError(e.message)
        }
      } else if (e instanceof Error) {
        showError(e.message)
      } else {
        showError('Failed to update product. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  const currentComplete = isStepComplete(step)
  const isLastStep = step === STEPS.length - 1
  const isFirstStep = step === 0

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Edit Product"
      showCloseButton
      closeOnBackdropClick
      fullScreen
      noPadding
    >
      <div className="mx-auto flex h-full w-full max-w-7xl">
        {/* Left: Step indicator */}
        <div className="hidden w-52 shrink-0 overflow-y-auto border-gray-100 border-r bg-gray-50 p-6 sm:block dark:border-gray-700 dark:bg-gray-800/50">
          <h3 className="mb-6 font-semibold text-gray-900 text-sm dark:text-white">
            Product Setup
          </h3>
          <div className="space-y-1">
            {STEPS.map((s, i) => {
              const complete = isStepComplete(i) && isStepAccessible(i)
              const current = i === step
              return (
                <button
                  key={s.key}
                  type="button"
                  onClick={() => {
                    if ((isStepComplete(i) && isStepAccessible(i)) || i < step) setStep(i)
                  }}
                  disabled={!isStepComplete(i) && i > step}
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors ${
                    current
                      ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300'
                      : complete
                        ? 'text-green-700 dark:text-green-400'
                        : 'text-gray-400 dark:text-gray-500'
                  }`}
                >
                  <span
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full font-bold text-xs ${
                      complete
                        ? 'bg-green-500 text-white'
                        : current
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-200 text-gray-500 dark:bg-gray-700'
                    }`}
                  >
                    {complete ? <Check className="h-3.5 w-3.5" /> : i + 1}
                  </span>
                  <span className="font-medium">{s.label}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Right: Content */}
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex flex-1 flex-col overflow-y-auto px-6 py-6">
            <p className="mb-4 font-medium text-gray-400 text-xs uppercase tracking-wide sm:hidden">
              Step {step + 1} of {STEPS.length} &mdash; {STEPS[step]?.label}
            </p>

            {step === 0 && (
              <BasicInfoStep
                data={data}
                onChange={(partial) => setData((prev) => ({ ...prev, ...partial }))}
                slugDisabled={product.status === 'active'}
                systemSku={product.sku ?? undefined}
              />
            )}
            {step === 1 && (
              <CategoriesStep
                data={data}
                onChange={(partial) => setData((prev) => ({ ...prev, ...partial }))}
              />
            )}
            {step === 2 && (
              <ProductSalesChannelsStep
                data={{ channelCodes: data.channelCodes }}
                onChange={(partial) => setData((prev) => ({ ...prev, ...partial }))}
              />
            )}
            {step === 3 && (
              <BrandManufacturerStep
                data={{ manufacturerId: data.manufacturerId, brandId: data.brandId }}
                onChange={(partial) => setData((prev) => ({ ...prev, ...partial }))}
              />
            )}
            {step === 4 && (
              <PricingStep
                data={data}
                onChange={(partial) => setData((prev) => ({ ...prev, ...partial }))}
              />
            )}
            {step === 5 && (
              <FeaturesStep
                data={data}
                onChange={(partial) => setData((prev) => ({ ...prev, ...partial }))}
              />
            )}
            {step === 6 && (
              <SpecificationsStep
                data={data}
                onChange={(partial) => setData((prev) => ({ ...prev, ...partial }))}
              />
            )}
            {step === 7 && (
              <InventoryStep
                data={data.inventory}
                onChange={(inventory) => setData((prev) => ({ ...prev, inventory }))}
                defaultSku={data.sellerSku}
              />
            )}
            {step === 8 && (
              <ProductHighlightsStep
                data={{ categoryIds: data.categoryIds, highlights: data.highlights }}
                onChange={(partial) => setData((prev) => ({ ...prev, ...partial }))}
              />
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between gap-3 border-gray-100 border-t px-6 py-4 dark:border-gray-700">
            <Button variant="outline" onClick={isFirstStep ? onClose : () => setStep(step - 1)}>
              {isFirstStep ? 'Cancel' : 'Back'}
            </Button>

            {isLastStep ? (
              <Button
                onClick={handleUpdate}
                disabled={!currentComplete || loading}
                className="inline-flex items-center gap-1"
              >
                {loading ? (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  <Check className="h-4 w-4" />
                )}
                Update Product
              </Button>
            ) : (
              <Button
                onClick={() => setStep(step + 1)}
                disabled={!currentComplete}
                className="inline-flex items-center gap-1"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </Modal>
  )
}
