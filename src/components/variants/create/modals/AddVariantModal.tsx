import { useState, useEffect } from "react";
import { ChevronRight, Check, Package, SlidersHorizontal, DollarSign, ImagePlus, Boxes } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/Toaster";
import { isApiError } from "@/lib/api-response";
import { variantsApi } from "@/api/variants";
import { storageApi } from "@/api/storage";
import { inventoryApi } from "@/api/inventory";
import { generateImageVariants } from "@/utils/image-resize";
import { VariantBasicStep } from "@/components/variants/create/steps/VariantBasicInfoStep";
import { VariantConfigStep } from "@/components/variants/create/steps/VariantConfigStep";
import { VariantPricingStep } from "@/components/variants/create/steps/VariantPricingStep";
import { VariantImageStep } from "@/components/variants/create/steps/VariantImageStep";
import { VariantInventoryStep, type InventoryFormData } from "@/components/variants/create/steps/VariantInventoryStep";

interface ConfigEntry { definition_id: number | null; code: string; key: string; value: string; unitId: string; unitName: string }
interface VariantData {
  name: string; sellerSku: string; summary: string;
  configuration: ConfigEntry[];
  price: string; salePrice: string;
  imageFile: File | null; imagePreview: string | null;
  inventory: InventoryFormData;
}

const INITIAL: VariantData = {
  name: "", sellerSku: "", summary: "",
  configuration: [],
  price: "", salePrice: "",
  imageFile: null, imagePreview: null,
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
  { key: "config", label: "Configuration", icon: SlidersHorizontal },
  { key: "pricing", label: "Pricing", icon: DollarSign },
  { key: "image", label: "Image", icon: ImagePlus },
  { key: "inventory", label: "Inventory", icon: Boxes },
];

interface Props {
  isOpen: boolean;
  onClose: () => void;
  productId: number;
  productStorageKey: string;
  onCreated: () => void;
}

function generateVariantStorageKey() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `var-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function AddVariantModal({ isOpen, onClose, productId, productStorageKey, onCreated }: Props) {
  const { success: showSuccess, error: showError } = useToast();
  const [step, setStep] = useState(0);
  const [maxVisitedStep, setMaxVisitedStep] = useState(0);
  const [data, setData] = useState<VariantData>(INITIAL);
  const [loading, setLoading] = useState(false);
  const [variantStorageKey] = useState(() => generateVariantStorageKey());

  useEffect(() => { if (isOpen) { setStep(0); setMaxVisitedStep(0); setData(INITIAL); } }, [isOpen]);

  const isStepComplete = (i: number) => {
    if (i === 0) return data.name.trim().length > 0;
    // Optional steps are complete once visited
    return maxVisitedStep >= i;
  };

  const isStepAccessible = (i: number) => {
    for (let j = 0; j < i; j++) {
      if (!isStepComplete(j)) return false;
    }
    return true;
  };

  const handleNext = () => {
    if (step < STEPS.length - 1) {
      const next = step + 1;
      setStep(next);
      setMaxVisitedStep((prev) => Math.max(prev, next));
    }
  };

  const handleCreate = async () => {
    try {
      setLoading(true);

      // Upload variant image to S3 with thumbnails (if provided)
      let uploadedKey: string | undefined;
      let uploadedVariants: Record<string, string> | undefined;
      if (data.imageFile) {
        const ext = data.imageFile.name.split(".").pop();
        const directory = `products/${productStorageKey}/variants/${variantStorageKey}`;
        const variants = await generateImageVariants(data.imageFile);
        const uploaded: Record<string, string> = {};

        for (const [suffix, blob] of Object.entries(variants)) {
          const filename = suffix === "original" ? `image.${ext}` : `image-${suffix}.jpg`;
          const presigned = await storageApi.getPresignedUrl(filename, "image/jpeg", directory, blob.size);
          if (!presigned.success || !presigned.data?.url) throw new Error("Failed to get upload URL");

          await new Promise<void>((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.open("PUT", presigned.data!.url, true);
            xhr.setRequestHeader("Content-Type", "image/jpeg");
            xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`Upload failed: ${xhr.status}`)));
            xhr.onerror = () => reject(new Error("Network error"));
            xhr.send(blob);
          });

          uploaded[suffix] = presigned.data.key;
          if (suffix === "original") uploadedKey = presigned.data.key;
        }
        uploadedVariants = uploaded;
      }

      const variantRes = await variantsApi.create({
        product_id: productId,
        name: data.name,
        seller_sku: data.sellerSku || undefined,
        summary: data.summary,
        configuration: Object.fromEntries(
          data.configuration.filter((c) => c.value).map((c) => [c.code, c.value]),
        ),
        metadata: {
          image: uploadedKey,
          image_variants: uploadedVariants,
          price: data.price || undefined,
          sale_price: data.salePrice || undefined,
          storage_key: variantStorageKey,
          config_details: data.configuration.filter((c) => c.value).map((c) => ({
            code: c.code, value: c.value, unit_id: c.unitId || null, unit_name: c.unitName || null,
          })),
        },
      });

      // Save inventory if tracking enabled
      if (data.inventory.trackInventory && variantRes.success && variantRes.data) {
        const variant = variantRes.data as { id: number };
        await inventoryApi.upsert({
          stockable_type: "App\\Models\\Variant",
          stockable_id: variant.id,
          warehouse_id: data.inventory.warehouseId ? Number(data.inventory.warehouseId) : undefined,
          sku: data.inventory.sku || data.sellerSku || undefined,
          quantity: data.inventory.quantity ? Number(data.inventory.quantity) : 0,
          low_stock_threshold: data.inventory.lowStockThreshold ? Number(data.inventory.lowStockThreshold) : undefined,
          track_inventory: true,
        });
      }

      showSuccess("Variant created!");
      onCreated();
      onClose();
    } catch (e) {
      if (isApiError(e) && e.errors) {
        const first = Object.values(e.errors).flat()[0];
        showError(first || e.message);
      } else {
        showError(isApiError(e) ? e.message : "Failed to create variant");
      }
    } finally {
      setLoading(false);
    }
  };

  const currentComplete = isStepComplete(step);
  const isLastStep = step === STEPS.length - 1;
  const isFirstStep = step === 0;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add Variant" showCloseButton closeOnBackdropClick fullScreen noPadding>
      <div className="mx-auto flex h-full w-full max-w-7xl">
        <div className="hidden w-56 shrink-0 border-r border-gray-100 bg-gray-50 p-6 dark:border-gray-700 dark:bg-gray-800/50 sm:block">
          <h3 className="mb-6 text-sm font-semibold text-gray-900 dark:text-white">Variant Setup</h3>
          <div className="space-y-1">
            {STEPS.map((s, i) => {
              const complete = isStepComplete(i) && isStepAccessible(i);
              const current = i === step;
              return (
                <button key={s.key} onClick={() => { if ((isStepComplete(i) && isStepAccessible(i)) || i < step) setStep(i); }} disabled={!isStepComplete(i) && i > step}
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors ${
                    current ? "bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300"
                    : complete ? "text-green-700 dark:text-green-400" : "text-gray-400 dark:text-gray-500"
                  }`}
                >
                  <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                    complete ? "bg-green-500 text-white" : current ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-500 dark:bg-gray-700"
                  }`}>
                    {complete ? <Check className="h-3.5 w-3.5" /> : i + 1}
                  </span>
                  <span className="font-medium">{s.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex flex-1 overflow-y-auto px-6 py-6">
            {step === 0 && <VariantBasicStep data={data} onChange={(p) => setData((prev) => ({ ...prev, ...p }))} />}
            {step === 1 && <VariantConfigStep data={data} onChange={(p) => setData((prev) => ({ ...prev, ...p }))} />}
            {step === 2 && <VariantPricingStep data={data} onChange={(p) => setData((prev) => ({ ...prev, ...p }))} />}
            {step === 3 && <VariantImageStep data={data} onChange={(p) => setData((prev) => ({ ...prev, ...p }))} />}
            {step === 4 && <VariantInventoryStep data={data.inventory} onChange={(inventory) => setData((prev) => ({ ...prev, inventory }))} defaultSku={data.sellerSku} />}
          </div>

          <div className="flex items-center justify-between gap-3 border-t border-gray-100 px-6 py-4 dark:border-gray-700">
            <Button variant="outline" onClick={isFirstStep ? onClose : () => setStep(step - 1)}>
              {isFirstStep ? "Cancel" : "Back"}
            </Button>
            {isLastStep ? (
              <Button onClick={handleCreate} disabled={!currentComplete || loading}>
                {loading ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> : <Check className="h-4 w-4" />}
                Create Variant
              </Button>
            ) : (
              <Button onClick={handleNext} disabled={!currentComplete}>
                Next <ChevronRight className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}
