import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/Toaster";
import { isApiError } from "@/lib/api-response";
import { brandsApi, type Brand } from "@/api/brands";
import { manufacturersApi } from "@/api/manufacturers";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  brand: Brand | null;
  onSaved: () => void;
}

const EMPTY = {
  name: "",
  manufacturer_id: "",
  logo: "",
  website: "",
  description: "",
  is_active: true,
};

export function BrandModal({ isOpen, onClose, brand, onSaved }: Props) {
  const { success: showSuccess, error: showError } = useToast();
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  const { data: manufacturers = [] } = useQuery({
    queryKey: ["manufacturers"],
    queryFn: () => manufacturersApi.list(),
    staleTime: 10 * 60 * 1000,
    enabled: isOpen,
  });

  useEffect(() => {
    if (isOpen) {
      setForm(
        brand
          ? {
              name: brand.name,
              manufacturer_id: brand.manufacturer_id != null ? String(brand.manufacturer_id) : "",
              logo: brand.logo ?? "",
              website: brand.website ?? "",
              description: brand.description ?? "",
              is_active: brand.is_active,
            }
          : EMPTY,
      );
    }
  }, [isOpen, brand]);

  const set = (key: keyof typeof EMPTY, value: string | boolean) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const payload = {
        ...form,
        manufacturer_id: form.manufacturer_id ? Number(form.manufacturer_id) : null,
      };
      if (brand) {
        await brandsApi.update(brand.uuid, payload);
        showSuccess("Brand updated");
      } else {
        await brandsApi.create(payload);
        showSuccess("Brand created");
      }
      onSaved();
      onClose();
    } catch (e) {
      if (isApiError(e) && e.errors) {
        const first = Object.values(e.errors).flat()[0];
        showError(first || e.message);
      } else {
        showError(isApiError(e) ? e.message : "Failed to save brand");
      }
    } finally {
      setSaving(false);
    }
  };

  const field = (label: string, key: keyof typeof EMPTY, placeholder = "", type = "text") => (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium text-gray-700 dark:text-gray-300">{label}</Label>
      <Input
        type={type}
        value={form[key] as string}
        onChange={(e) => set(key, e.target.value)}
        placeholder={placeholder}
        className="h-10"
      />
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={brand ? "Edit Brand" : "Add Brand"}
      description="Brands belong to a manufacturer or OEM."
      maxWidth="3xl"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        {field("Name", "name", "e.g. Apple", "text")}

        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-gray-700 dark:text-gray-300">
            Manufacturer / OEM <span className="font-normal text-gray-400">(optional)</span>
          </Label>
          <select
            value={form.manufacturer_id}
            onChange={(e) => set("manufacturer_id", e.target.value)}
            className="h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">No manufacturer</option>
            {manufacturers.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </div>

        {field("Logo URL", "logo", "https://cdn.htashop.com/...", "url")}
        {field("Website", "website", "https://example.com", "url")}

        <div className="space-y-1.5 sm:col-span-2">
          <Label className="text-xs font-medium text-gray-700 dark:text-gray-300">Description</Label>
          <Textarea
            value={form.description}
            onChange={(e) => set("description", e.target.value)}
            placeholder="Short description of this brand..."
            rows={3}
            className="resize-none"
          />
        </div>

        <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 sm:col-span-2">
          <input
            type="checkbox"
            checked={form.is_active}
            onChange={(e) => set("is_active", e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          Active
        </label>
      </div>

      <div className="mt-6 flex justify-end gap-2">
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button onClick={handleSave} disabled={!form.name.trim() || saving}>
          {saving ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : null}
          {brand ? "Update" : "Create"}
        </Button>
      </div>
    </Modal>
  );
}
