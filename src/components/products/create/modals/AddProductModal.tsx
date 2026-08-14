import { useState, useEffect, useMemo } from "react";
import { ChevronRight, Check, Package, ImagePlus, FolderTree, ListChecks, Ruler, DollarSign, Boxes, Factory } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/Toaster";
import { isApiError } from "@/lib/api-response";
import { productsApi } from "@/api/products";
import { damApi } from "@/api/dam";
import { inventoryApi } from "@/api/inventory";
import type { UploadResult } from "@/hooks/storage/useS3Upload";
import { BasicInfoStep } from "@/components/products/create/steps/ProductBasicInfoStep";
import { ProductImagesStep } from "@/components/products/create/steps/ProductImagesStep";
import { CategoriesStep } from "@/components/products/create/steps/ProductCategoriesStep";
import { FeaturesStep } from "@/components/products/create/steps/ProductFeaturesStep";
import { SpecificationsStep } from "@/components/products/create/steps/ProductSpecificationsStep";
import { PricingStep } from "@/components/products/create/steps/ProductPricingStep";
import { InventoryStep, type InventoryFormData } from "@/components/products/create/steps/ProductInventoryStep";
import { BrandManufacturerStep } from "@/components/products/create/steps/BrandManufacturerStep";

interface Spec {
  id: string;
  key: string;
  value: string;
  unitId: number | null;
  unitName: string;
}

interface ProductData {
  name: string;
  slug: string;
  sellerSku: string;
  partNumber: string;
  hsCode: string;
  unspsc: string;
  ntn: string;
  barcode: string;
  modelNumber: string;
  manufacturerId: string;
  brandId: string;
  summary: string;
  description: string;
  featured: UploadResult | null;
  gallery: UploadResult[];
  categoryIds: number[];
  tags: string[];
  featureNames: string[];
  specs: Spec[];
  price: string;
  salePrice: string;
  currency: string;
  unitId: string;
  inventory: InventoryFormData;
}

const INITIAL: ProductData = {
  name: "",
  slug: "",
  sellerSku: "",
  partNumber: "",
  hsCode: "",
  unspsc: "",
  ntn: "",
  barcode: "",
  modelNumber: "",
  manufacturerId: "",
  brandId: "",
  summary: "",
  description: "",
  featured: null,
  gallery: [],
  categoryIds: [],
  tags: [],
  featureNames: [],
  specs: [],
  price: "",
  salePrice: "",
  currency: "USD",
  unitId: "",
  inventory: {
    trackInventory: true,
    quantity: "",
    lowStockThreshold: "",
    sku: "",
    warehouseId: "",
  },
};

const STEPS = [
  { key: "basic", label: "Basic Info", icon: Package },
  { key: "categories", label: "Categories", icon: FolderTree },
  { key: "brand-manufacturer", label: "Brand & Manufacturer", icon: Factory },
  { key: "pricing", label: "Pricing", icon: DollarSign },
  { key: "images", label: "Images", icon: ImagePlus },
  { key: "features", label: "Features", icon: ListChecks },
  { key: "specs", label: "Specifications", icon: Ruler },
  { key: "inventory", label: "Inventory", icon: Boxes },
];

function generateStorageKey() {
  // Use a UUID for stable, unique, high-cardinality object storage keys
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  // Fallback for older browsers
  return `prod-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onCreated?: () => void;
}

export function AddProductModal({ isOpen, onClose, onCreated }: Props) {
  const { success: showSuccess, error: showError } = useToast();
  const [step, setStep] = useState(0);
  const [data, setData] = useState<ProductData>(INITIAL);
  const [loading, setLoading] = useState(false);

  // Unique upload directory — generated once per modal open
  const uploadPrefix = useMemo(() => `products/${generateStorageKey()}`, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      setStep(0);
      setData(INITIAL);
    }
  }, [isOpen]);

  // Auto-generate slug from product name
  useEffect(() => {
    const generated = data.name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");

    if (generated && generated !== data.slug) {
      setData((prev) => ({ ...prev, slug: generated }));
    }
  }, [data.name]);

  const isStepComplete = (i: number) => {
    if (i === 0) return data.name.trim().length > 0;          // Basic Info
    if (i === 1) return data.categoryIds.length > 0;           // Categories
    if (i === 2) return true;                                  // Brand & Manufacturer (optional)
    if (i === 3) return data.price.trim().length > 0 && Number(data.price) > 0; // Pricing
    if (i === 4) return data.featured !== null;                // Images
    if (i === 5) return true;                                  // Features (optional)
    if (i === 6) return true;                                  // Specs (optional)
    if (i === 7) return true;                                  // Inventory (optional)
    return false;
  };

  // A step is navigable only if all previous required steps are complete
  const isStepAccessible = (i: number) => {
    for (let j = 0; j < i; j++) {
      if (!isStepComplete(j)) return false;
    }
    return true;
  };

  const handleNext = () => {
    if (step < STEPS.length - 1) setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 0) setStep(step - 1);
  };

  const handleCreate = async () => {
    try {
      setLoading(true);

      // 1. Create product
      const productRes = await productsApi.create({
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
        features: data.featureNames.length > 0 ? data.featureNames : undefined,
        metadata: {
          specs: data.specs.map((s) => ({ key: s.key, value: s.value, unit_id: s.unitId, unit_name: s.unitName })),
          price: data.price || undefined,
          sale_price: data.salePrice || undefined,
          currency: data.currency,
          unit_id: data.unitId || undefined,
          storage_key: uploadPrefix.replace(/^products\//, ""),
        },
      });

      if (!productRes.success || !productRes.data) {
        throw new Error("Failed to create product");
      }

      const product = productRes.data as { id: number; uuid: string };
      const imageCount = (data.featured ? 1 : 0) + data.gallery.length;

      // 2. Create DAM records (files already uploaded via S3FileUpload)
      if (data.featured) {
        await damApi.ingest({
          damable_type: "App\\Models\\Product",
          damable_id: product.id,
          file_name: data.featured.original_filename || "featured",
          object_key: data.featured.key,
          mime_type: "image/jpeg",
          collection_name: "featured",
          metadata: { variants: data.featured.variants ?? {} },
        });
      }

      for (const entry of data.gallery) {
        await damApi.ingest({
          damable_type: "App\\Models\\Product",
          damable_id: product.id,
          file_name: entry.original_filename || "gallery",
          object_key: entry.key,
          mime_type: "image/jpeg",
          collection_name: "gallery",
          metadata: { variants: entry.variants ?? {} },
        });
      }

      // 3. Save inventory record (if tracking enabled)
      if (data.inventory.trackInventory) {
        await inventoryApi.upsert({
          stockable_type: "App\\Models\\Product",
          stockable_id: product.id,
          warehouse_id: data.inventory.warehouseId ? Number(data.inventory.warehouseId) : undefined,
          sku: data.inventory.sku || data.sellerSku || undefined,
          quantity: data.inventory.quantity ? Number(data.inventory.quantity) : 0,
          low_stock_threshold: data.inventory.lowStockThreshold ? Number(data.inventory.lowStockThreshold) : undefined,
          track_inventory: true,
        });
      }

      showSuccess(
        imageCount > 0
          ? `Product created with ${imageCount} image${imageCount > 1 ? "s" : ""}!`
          : "Product created successfully!",
      );
      onCreated?.();
      onClose();
    } catch (error: unknown) {
      if (isApiError(error)) {
        if (error.errors) {
          const first = Object.values(error.errors).flat()[0];
          showError(first || error.message);
        } else {
          showError(error.message);
        }
      } else if (error instanceof Error) {
        showError(error.message);
      } else {
        showError("Failed to create product. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const currentComplete = isStepComplete(step);
  const isLastStep = step === STEPS.length - 1;
  const isFirstStep = step === 0;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Add Product"
      showCloseButton
      closeOnBackdropClick
      fullScreen
      noPadding
    >
      <div className="mx-auto flex h-full w-full max-w-7xl">
        {/* Left: Step indicator */}
        <div className="hidden w-52 shrink-0 overflow-y-auto border-r border-gray-100 bg-gray-50 p-6 dark:border-gray-700 dark:bg-gray-800/50 sm:block">
          <h3 className="mb-6 text-sm font-semibold text-gray-900 dark:text-white">Product Setup</h3>
          <div className="space-y-1">
            {STEPS.map((s, i) => {
              const complete = isStepComplete(i) && isStepAccessible(i);
              const current = i === step;
              return (
                <button
                  key={s.key}
                  onClick={() => { if ((isStepComplete(i) && isStepAccessible(i)) || i < step) setStep(i); }}
                  disabled={!isStepComplete(i) && i > step}
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors ${
                    current
                      ? "bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300"
                      : complete
                        ? "text-green-700 dark:text-green-400"
                        : "text-gray-400 dark:text-gray-500"
                  }`}
                >
                  <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                    complete
                      ? "bg-green-500 text-white"
                      : current
                        ? "bg-blue-600 text-white"
                        : "bg-gray-200 text-gray-500 dark:bg-gray-700"
                  }`}>
                    {complete ? <Check className="h-3.5 w-3.5" /> : i + 1}
                  </span>
                  <span className="font-medium">{s.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: Content */}
        <div className="flex min-w-0 flex-1 flex-col">
          {/* Mobile step dots */}
          <div className="flex items-center justify-center gap-2 border-b border-gray-100 px-6 py-3 sm:hidden dark:border-gray-700">
            {STEPS.map((_, i) => (
              <div
                key={i}
                className={`h-2 w-2 rounded-full ${i <= step ? "bg-blue-600" : "bg-gray-300 dark:bg-gray-600"}`}
              />
            ))}
          </div>

          <div className="flex flex-1 flex-col overflow-y-auto px-6 py-6">
            {/* Mobile step label */}
            <p className="mb-4 text-xs font-medium uppercase tracking-wide text-gray-400 sm:hidden">
              Step {step + 1} of {STEPS.length} &mdash; {STEPS[step]?.label}
            </p>

            {step === 0 && (
              <BasicInfoStep
                data={data}
                onChange={(partial) => setData((prev) => ({ ...prev, ...partial }))}
                slugDisabled
              />
            )}
            {step === 1 && (
              <CategoriesStep
                data={data}
                onChange={(partial) => setData((prev) => ({ ...prev, ...partial }))}
              />
            )}
            {step === 2 && (
              <BrandManufacturerStep
                data={{ manufacturerId: data.manufacturerId, brandId: data.brandId }}
                onChange={(partial) => setData((prev) => ({ ...prev, ...partial }))}
              />
            )}
            {step === 3 && (
              <PricingStep
                data={data}
                onChange={(partial) => setData((prev) => ({ ...prev, ...partial }))}
              />
            )}
            {step === 4 && (
              <ProductImagesStep
                data={{ featured: data.featured, gallery: data.gallery }}
                onChange={(images) => setData((prev) => ({ ...prev, ...images }))}
                uploadPrefix={uploadPrefix}
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
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between gap-3 border-t border-gray-100 px-6 py-4 dark:border-gray-700">
            <Button
              variant="outline"
              onClick={isFirstStep ? onClose : handleBack}
            >
              {isFirstStep ? "Cancel" : "Back"}
            </Button>

            {isLastStep ? (
              <Button
                onClick={handleCreate}
                disabled={!currentComplete || loading}
                className="inline-flex items-center gap-1"
              >
                {loading ? (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  <Check className="h-4 w-4" />
                )}
                Create Product
              </Button>
            ) : (
              <Button
                onClick={handleNext}
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
  );
}
