import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/Toaster";
import { isApiError } from "@/lib/api-response";
import { manufacturersApi, type Manufacturer } from "@/api/manufacturers";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  manufacturer: Manufacturer | null;
  onSaved: () => void;
}

const EMPTY = {
  name: "",
  code: "",
  type: "manufacturer",
  country: "",
  website: "",
  logo: "",
  description: "",
  is_active: true,
};

export function ManufacturerModal({ isOpen, onClose, manufacturer, onSaved }: Props) {
  const { success: showSuccess, error: showError } = useToast();
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setForm(
        manufacturer
          ? {
              name: manufacturer.name,
              code: manufacturer.code ?? "",
              type: manufacturer.type ?? "manufacturer",
              country: manufacturer.country ?? "",
              website: manufacturer.website ?? "",
              logo: manufacturer.logo ?? "",
              description: manufacturer.description ?? "",
              is_active: manufacturer.is_active,
            }
          : EMPTY,
      );
    }
  }, [isOpen, manufacturer]);

  const set = (key: keyof typeof EMPTY, value: string | boolean) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      if (manufacturer) {
        await manufacturersApi.update(manufacturer.uuid, form);
        showSuccess("Manufacturer updated");
      } else {
        await manufacturersApi.create(form);
        showSuccess("Manufacturer created");
      }
      onSaved();
      onClose();
    } catch (e) {
      if (isApiError(e) && e.errors) {
        const first = Object.values(e.errors).flat()[0];
        showError(first || e.message);
      } else {
        showError(isApiError(e) ? e.message : "Failed to save manufacturer");
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
      title={manufacturer ? "Edit Manufacturer" : "Add Manufacturer"}
      description="Manufacturer and OEM are the same entity — the type simply distinguishes them."
      maxWidth="3xl"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        {field("Name", "name", "e.g. Foxconn", "text")}
        {field("Code", "code", "e.g. FXCN", "text")}

        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-gray-700 dark:text-gray-300">Type</Label>
          <select
            value={form.type}
            onChange={(e) => set("type", e.target.value)}
            className="h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="manufacturer">Manufacturer</option>
            <option value="oem">OEM</option>
          </select>
        </div>

        {field("Country", "country", "e.g. Taiwan", "text")}
        {field("Website", "website", "https://example.com", "url")}
        {field("Logo URL", "logo", "https://cdn.htashop.com/...", "url")}

        <div className="space-y-1.5 sm:col-span-2">
          <Label className="text-xs font-medium text-gray-700 dark:text-gray-300">Description</Label>
          <Textarea
            value={form.description}
            onChange={(e) => set("description", e.target.value)}
            placeholder="Short description of this manufacturer..."
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
          {manufacturer ? "Update" : "Create"}
        </Button>
      </div>
    </Modal>
  );
}
