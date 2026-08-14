import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Factory, Plus, Search, Loader2, Pencil, Trash2, Globe, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/Toaster";
import { isApiError } from "@/lib/api-response";
import { manufacturersApi, type Manufacturer } from "@/api/manufacturers";
import { ManufacturerModal } from "@/components/manufacturers/modals/ManufacturerModal";

export default function ManufacturersPage() {
  const queryClient = useQueryClient();
  const { success: showSuccess, error: showError } = useToast();
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Manufacturer | null>(null);

  const { data: manufacturers = [], isLoading } = useQuery({
    queryKey: ["manufacturers", search],
    queryFn: () => manufacturersApi.list(search || undefined, true),
    staleTime: 0,
  });

  const openAdd = () => { setEditing(null); setModalOpen(true); };
  const openEdit = (m: Manufacturer) => { setEditing(m); setModalOpen(true); };

  const handleDelete = async (m: Manufacturer) => {
    if (!confirm(`Delete manufacturer "${m.name}"?`)) return;
    try {
      await manufacturersApi.delete(m.uuid);
      showSuccess("Manufacturer deleted");
      queryClient.invalidateQueries({ queryKey: ["manufacturers"] });
    } catch (e) {
      showError(isApiError(e) ? e.message : "Failed to delete manufacturer");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Manufacturers</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Manage manufacturers and OEMs
          </p>
        </div>
        <Button onClick={openAdd} className="inline-flex items-center gap-2">
          <Plus className="h-4 w-4" /> Add Manufacturer
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <Input placeholder="Search manufacturers..." value={search} onChange={(e) => setSearch(e.target.value)} className="h-10 pl-10" />
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-gray-400" /></div>
      ) : manufacturers.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-200 py-20 dark:border-gray-700">
          <Factory className="mb-4 h-12 w-12 text-gray-300 dark:text-gray-600" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">No manufacturers yet</h3>
          <p className="mt-1 text-sm text-gray-500">Add your first manufacturer or OEM.</p>
          <Button className="mt-6" onClick={openAdd}><Plus className="mr-1.5 h-4 w-4" /> Add Manufacturer</Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {manufacturers.map((m) => (
            <div key={m.uuid} className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sky-100 dark:bg-sky-900/30">
                    <Factory className="h-5 w-5 text-sky-600 dark:text-sky-400" />
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-white">{m.name}</h3>
                    {m.code && <span className="text-xs text-gray-400">{m.code}</span>}
                  </div>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => openEdit(m)} className="rounded p-1 text-gray-400 hover:text-blue-500"><Pencil className="h-4 w-4" /></button>
                  <button onClick={() => handleDelete(m)} className="rounded p-1 text-gray-400 hover:text-red-500"><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>

              {m.country && (
                <p className="mt-3 flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                  <MapPin className="h-3.5 w-3.5" />
                  {m.country}
                </p>
              )}
              {m.website && (
                <a
                  href={m.website}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-1 flex items-center gap-1 text-xs text-blue-500 hover:underline"
                >
                  <Globe className="h-3.5 w-3.5" />
                  {m.website}
                </a>
              )}

              <div className="mt-3 flex items-center gap-2">
                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                  m.type === "oem" ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" : "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400"
                }`}>
                  {m.type === "oem" ? "OEM" : "Manufacturer"}
                </span>
                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                  m.is_active ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400"
                }`}>
                  {m.is_active ? "Active" : "Inactive"}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      <ManufacturerModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        manufacturer={editing}
        onSaved={() => {
          queryClient.invalidateQueries({ queryKey: ["manufacturers"] });
          queryClient.invalidateQueries({ queryKey: ["brands"] });
        }}
      />
    </div>
  );
}
