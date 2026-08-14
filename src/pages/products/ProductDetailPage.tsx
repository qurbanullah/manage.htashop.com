import { useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Loader2, Package, DollarSign, ImagePlus, FolderTree, ListChecks, Layers, Boxes } from "lucide-react";
import { Button } from "@/components/ui/button";
import { productsApi, type ProductData } from "@/api/products";
import { OverviewTab } from "@/components/products/detail/tabs/OverviewTab";
import { PricingTab } from "@/components/products/detail/tabs/PricingTab";
import { ImagesTab } from "@/components/products/detail/tabs/ImagesTab";
import { CategoriesTab } from "@/components/products/detail/tabs/CategoriesTab";
import { FeaturesTab } from "@/components/products/detail/tabs/FeaturesTab";
import { VariantsTab } from "@/components/products/detail/tabs/VariantsTab";
import { InventoryTab } from "@/components/products/detail/tabs/InventoryTab";
import { ProductSidebar } from "@/components/products/detail/sidebars/ProductSidebar";
import { UpdateProductModal } from "@/components/products/update/UpdateProductModal";

type Tab = "overview" | "pricing" | "images" | "categories" | "features" | "variants" | "inventory";

const TABS: { key: Tab; label: string; icon: typeof Package }[] = [
  { key: "overview", label: "Overview", icon: Package },
  { key: "variants", label: "Variants", icon: Layers },
  { key: "pricing", label: "Pricing", icon: DollarSign },
  { key: "inventory", label: "Inventory", icon: Boxes },
  { key: "images", label: "Images", icon: ImagePlus },
  { key: "categories", label: "Categories", icon: FolderTree },
  { key: "features", label: "Features & Specs", icon: ListChecks },
];

export default function ProductDetailPage() {
  const { slugUuid } = useParams<{ slugUuid: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [isEditOpen, setIsEditOpen] = useState(false);

  const { data: productRes, isLoading, isError, refetch } = useQuery({
    queryKey: ["product", slugUuid],
    queryFn: () => productsApi.get(slugUuid!),
    enabled: !!slugUuid,
  });

  const product = productRes?.data as (ProductData & { metadata?: Record<string, unknown> }) | undefined;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (isError || !product) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Package className="mb-4 h-12 w-12 text-red-300 dark:text-red-600" />
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">Product not found</h3>
        <p className="mt-1 text-sm text-gray-500">The product you're looking for doesn't exist or has been removed.</p>
        <Link to="/products" className="mt-4">
          <Button variant="outline" size="sm"><ArrowLeft className="mr-1 h-4 w-4" /> Back to Products</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 lg:flex-row">
      {/* Main content */}
      <div className="flex-1 space-y-6 min-w-0">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link to="/products" className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-300">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">{product.name}</h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {product.slug} &middot; {product.status || "draft"}
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-gray-200 dark:border-gray-700 overflow-x-auto">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`inline-flex shrink-0 items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? "border-blue-500 text-blue-600 dark:border-blue-400 dark:text-blue-400"
                  : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
              }`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="min-h-[300px]">
          {activeTab === "overview" && <OverviewTab product={product} />}
          {activeTab === "variants" && <VariantsTab product={product} />}
          {activeTab === "pricing" && <PricingTab product={product} />}
          {activeTab === "inventory" && <InventoryTab product={product} />}
          {activeTab === "images" && <ImagesTab product={product} />}
          {activeTab === "categories" && <CategoriesTab product={product} />}
          {activeTab === "features" && <FeaturesTab product={product} />}
        </div>
      </div>

      {/* Right sidebar */}
      <ProductSidebar
        product={product}
        onUpdated={() => refetch()}
        onEdit={() => setIsEditOpen(true)}
        onDeleted={() => navigate("/products")}
      />

      <UpdateProductModal
        product={product}
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        onUpdated={() => refetch()}
      />
    </div>
  );
}
