import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Warehouse as WarehouseIcon, Plus, Search, Loader2, Pencil, Trash2, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/Toaster";
import { isApiError } from "@/lib/api-response";
import { warehousesApi, type Warehouse } from "@/api/warehouses";
import { WarehouseModal } from "@/components/warehouses/modals/WarehouseModal";

export default function WarehousesPage() {
  const queryClient = useQueryClient();
  const { success: showSuccess, error: showError } = useToast();
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Warehouse | null>(null);

  const { data: warehouses = [], isLoading } = useQuery({
    queryKey: ["warehouses", search],
    queryFn: () => warehousesApi.list(search || undefined),
    staleTime: 0,
  });

  const openAdd = () => { setEditing(null); setModalOpen(true); };
  const openEdit = (w: Warehouse) => { setEditing(w); setModalOpen(true); };

  const handleDelete = async (w: Warehouse) => {
    if (!confirm(`Delete warehouse "${w.name}"?`)) return;
    try {
      await warehousesApi.delete(w.uuid);
      showSuccess("Warehouse deleted");
      queryClient.invalidateQueries({ queryKey: ["warehouses"] });
    } catch (e) {
      showError(isApiError(e) ? e.message : "Failed to delete warehouse");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Warehouses</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Manage inventory locations
          </p>
        </div>
        <Button onClick={openAdd} className="inline-flex items-center gap-2">
          <Plus className="h-4 w-4" /> Add Warehouse
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <Input placeholder="Search warehouses..." value={search} onChange={(e) => setSearch(e.target.value)} className="h-10 pl-10" />
      </div>

      {/* Loading */}
      {isLoading ? (
        <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-gray-400" /></div>
      ) : warehouses.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-200 py-20 dark:border-gray-700">
          <WarehouseIcon className="mb-4 h-12 w-12 text-gray-300 dark:text-gray-600" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">No warehouses yet</h3>
          <p className="mt-1 text-sm text-gray-500">Add your first warehouse to track inventory.</p>
          <Button className="mt-6" onClick={openAdd}><Plus className="mr-1.5 h-4 w-4" /> Add Warehouse</Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {warehouses.map((w) => (
            <div key={w.uuid} className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
                    <WarehouseIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-white">{w.name}</h3>
                    {w.code && <span className="text-xs text-gray-400">{w.code}</span>}
                  </div>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => openEdit(w)} className="rounded p-1 text-gray-400 hover:text-blue-500"><Pencil className="h-4 w-4" /></button>
                  <button onClick={() => handleDelete(w)} className="rounded p-1 text-gray-400 hover:text-red-500"><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>

              {w.city && (
                <p className="mt-3 flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                  <MapPin className="h-3.5 w-3.5" />
                  {[w.city, w.state, w.country].filter(Boolean).join(", ")}
                </p>
              )}
              {w.contact_name && <p className="mt-1 text-xs text-gray-500">{w.contact_name}</p>}
              {w.email && <p className="mt-0.5 text-xs text-gray-400">{w.email}</p>}

              <span className={`mt-3 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                w.is_active ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400"
              }`}>
                {w.is_active ? "Active" : "Inactive"}
              </span>
            </div>
          ))}
        </div>
      )}

      <WarehouseModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        warehouse={editing}
        onSaved={() => queryClient.invalidateQueries({ queryKey: ["warehouses"] })}
      />
    </div>
  );
}
