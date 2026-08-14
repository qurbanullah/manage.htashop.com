import { useState } from "react";
import { Globe, Send, Archive, Trash2, Copy, Calendar, Clock, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/Toaster";
import { isApiError } from "@/lib/api-response";
import { productsApi, type ProductData } from "@/api/products";
import { DeleteProductModal } from "@/components/products/delete/DeleteProductModal";

interface Props {
  product: ProductData;
  onUpdated: () => void;
  onEdit?: () => void;
  onDeleted?: () => void;
}

export function ProductSidebar({ product, onUpdated, onEdit, onDeleted }: Props) {
  const { success: showSuccess, error: showError } = useToast();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const isActive = product.status === "active";

  const handleStatusToggle = async () => {
    const newStatus = isActive ? "draft" : "active";
    try {
      await productsApi.update(product.uuid, { status: newStatus });
      showSuccess(`Product ${newStatus === "active" ? "published" : "unpublished"}`);
      onUpdated();
    } catch (e) {
      showError(isApiError(e) ? e.message : "Failed to update status");
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await productsApi.delete(product.uuid);
      showSuccess("Product deleted");
      setDeleteOpen(false);
      onDeleted?.();
    } catch (e) {
      showError(isApiError(e) ? e.message : "Failed to delete product");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="w-full lg:w-64 lg:flex-shrink-0">
      <div className="rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
        {/* Status */}
        <div className="border-b border-gray-100 p-4 dark:border-gray-700">
          <h4 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">Status</h4>
          <div className="flex items-center gap-2">
            <span className={`inline-flex h-2.5 w-2.5 rounded-full ${isActive ? "bg-green-500" : "bg-yellow-500"}`} />
            <span className={`text-sm font-medium ${isActive ? "text-green-700 dark:text-green-400" : "text-yellow-700 dark:text-yellow-400"}`}>
              {isActive ? "Published" : "Draft"}
            </span>
          </div>
          <Button onClick={handleStatusToggle} variant="outline" size="sm" className="mt-3 w-full">
            {isActive ? <><Archive className="mr-1.5 h-4 w-4" /> Unpublish</> : <><Send className="mr-1.5 h-4 w-4" /> Publish</>}
          </Button>
        </div>

        {/* Quick stats */}
        <div className="border-b border-gray-100 p-4 dark:border-gray-700">
          <h4 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">Details</h4>
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
              <Calendar className="h-4 w-4 shrink-0" />
              <span>Created {new Date(product.created_at).toLocaleDateString()}</span>
            </div>
            <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
              <Clock className="h-4 w-4 shrink-0" />
              <span>Updated {new Date(product.updated_at).toLocaleDateString()}</span>
            </div>
            <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
              <Globe className="h-4 w-4 shrink-0" />
              <span className="truncate">htashop.com/{product.slug}</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="border-b border-gray-100 p-4 dark:border-gray-700">
          <h4 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">Actions</h4>
          <div className="space-y-2">
            <Button size="sm" className="w-full justify-start" onClick={() => onEdit?.()}>
              <Pencil className="mr-2 h-4 w-4" />
              Edit Product
            </Button>
            <Button variant="outline" size="sm" className="w-full justify-start">
              <Copy className="mr-2 h-4 w-4" />
              Duplicate
            </Button>
          </div>
        </div>

        {/* Danger zone */}
        <div className="p-4">
          <h4 className="mb-3 text-xs font-semibold uppercase tracking-wide text-red-500">Danger Zone</h4>
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-900/20"
            onClick={() => setDeleteOpen(true)}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete Product
          </Button>
        </div>
      </div>

      <DeleteProductModal
        isOpen={deleteOpen}
        productName={product.name}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleDelete}
        isLoading={deleting}
      />
    </div>
  );
}
