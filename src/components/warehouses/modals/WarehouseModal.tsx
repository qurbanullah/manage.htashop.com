import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/Toaster";
import { isApiError } from "@/lib/api-response";
import { warehousesApi, type Warehouse } from "@/api/warehouses";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  warehouse: Warehouse | null;
  onSaved: () => void;
}

const EMPTY = {
  name: "", code: "", contact_name: "", email: "", phone: "",
  address_line_1: "", address_line_2: "", city: "", state: "",
  postal_code: "", country: "", is_active: true,
};

export function WarehouseModal({ isOpen, onClose, warehouse, onSaved }: Props) {
  const { success: showSuccess, error: showError } = useToast();
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setForm(warehouse ? {
        name: warehouse.name, code: warehouse.code ?? "", contact_name: warehouse.contact_name ?? "",
        email: warehouse.email ?? "", phone: warehouse.phone ?? "",
        address_line_1: warehouse.address_line_1 ?? "", address_line_2: warehouse.address_line_2 ?? "",
        city: warehouse.city ?? "", state: warehouse.state ?? "",
        postal_code: warehouse.postal_code ?? "", country: warehouse.country ?? "",
        is_active: warehouse.is_active,
      } : EMPTY);
    }
  }, [isOpen, warehouse]);

  const set = (key: string, value: string) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      if (warehouse) {
        await warehousesApi.update(warehouse.uuid, form);
        showSuccess("Warehouse updated");
      } else {
        await warehousesApi.create(form);
        showSuccess("Warehouse created");
      }
      onSaved();
      onClose();
    } catch (e) {
      if (isApiError(e) && e.errors) {
        const first = Object.values(e.errors).flat()[0];
        showError(first || e.message);
      } else {
        showError(isApiError(e) ? e.message : "Failed to save warehouse");
      }
    } finally {
      setSaving(false);
    }
  };

  const field = (label: string, key: keyof typeof EMPTY, type = "text", placeholder = "") => (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium text-gray-700 dark:text-gray-300">{label}</Label>
      <Input type={type} value={form[key] as string} onChange={(e) => set(key, e.target.value)} placeholder={placeholder} className="h-10" />
    </div>
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={warehouse ? "Edit Warehouse" : "Add Warehouse"} maxWidth="3xl">
      <div className="grid gap-4 sm:grid-cols-2">
        {field("Name", "name", "text", "Main Warehouse")}
        {field("Code", "code", "text", "WH-001")}
        {field("Contact Name", "contact_name", "text", "John Doe")}
        {field("Email", "email", "email", "warehouse@htashop.com")}
        {field("Phone", "phone", "text", "+92 ...")}
        <div className="sm:col-span-2">{field("Address Line 1", "address_line_1", "text", "Street address")}</div>
        {field("Address Line 2", "address_line_2", "text", "Suite, building")}
        {field("City", "city", "text", "Lahore")}
        {field("State / Province", "state", "text", "Punjab")}
        {field("Postal Code", "postal_code", "text", "54000")}
        {field("Country", "country", "text", "Pakistan")}
      </div>

      <div className="mt-6 flex justify-end gap-2">
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button onClick={handleSave} disabled={!form.name.trim() || saving}>
          {saving ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : null}
          {warehouse ? "Update" : "Create"}
        </Button>
      </div>
    </Modal>
  );
}
