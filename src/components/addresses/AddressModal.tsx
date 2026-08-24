import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Search, ChevronDown, MapPin, Check } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/Toaster";
import { isApiError } from "@/lib/api-response";
import { addressesApi, type AddressData, type AddressPayload } from "@/api/addresses";
import { countriesApi } from "@/api/countries";
import { citiesApi, type City } from "@/api/cities";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  address: AddressData | null;
  addressableType?: "user" | "organization";
}

interface FormState {
  type: string;
  label: string;
  contact_name: string;
  phone: string;
  email: string;
  address_line_1: string;
  address_line_2: string;
  city: string;
  city_id: string;
  state: string;
  state_code: string;
  postal_code: string;
  country_id: string;
  is_primary: boolean;
}

const EMPTY: FormState = {
  type: "shipping",
  label: "",
  contact_name: "",
  phone: "",
  email: "",
  address_line_1: "",
  address_line_2: "",
  city: "",
  city_id: "",
  state: "",
  state_code: "",
  postal_code: "",
  country_id: "",
  is_primary: false,
};

const ADDRESS_TYPES = [
  { value: "shipping", label: "Shipping" },
  { value: "billing", label: "Billing" },
  { value: "warehouse", label: "Warehouse" },
  { value: "vendor", label: "Vendor" },
  { value: "other", label: "Other" },
];

export function AddressModal({ isOpen, onClose, onSaved, address, addressableType = "user" }: Props) {
  const { success: showSuccess, error: showError } = useToast();
  const [form, setForm] = useState<FormState>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [countryOpen, setCountryOpen] = useState(false);
  const [countrySearch, setCountrySearch] = useState("");
  const countryRef = useRef<HTMLDivElement>(null);

  const { data: countries = [] } = useQuery({
    queryKey: ["countries"],
    queryFn: () => countriesApi.list(),
    enabled: isOpen,
    staleTime: 24 * 60 * 60 * 1000,
  });

  const countryId = form.country_id ? Number(form.country_id) : null;
  const { data: cities = [] } = useQuery({
    queryKey: ["cities", countryId],
    queryFn: () => citiesApi.list(countryId as number),
    enabled: isOpen && !!countryId,
  });

  const selectedCountry = countries.find((c) => c.id === countryId) ?? null;

  const filteredCountries = useMemo(() => {
    const q = countrySearch.trim().toLowerCase();
    if (!q) return countries;
    return countries.filter(
      (c) => c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q),
    );
  }, [countries, countrySearch]);

  useEffect(() => {
    if (isOpen) {
      setCountryOpen(false);
      setCountrySearch("");
      setForm(address ? {
        type: address.type || "shipping",
        label: address.label ?? "",
        contact_name: address.contact_name ?? "",
        phone: address.phone ?? "",
        email: address.email ?? "",
        address_line_1: address.address_line_1 ?? "",
        address_line_2: address.address_line_2 ?? "",
        city: address.city ?? "",
        city_id: address.city_id != null ? String(address.city_id) : "",
        state: address.state ?? "",
        state_code: address.state_code ?? "",
        postal_code: address.postal_code ?? "",
        country_id: address.country_id != null ? String(address.country_id) : "",
        is_primary: address.is_primary,
      } : EMPTY);
    }
  }, [isOpen, address]);

  // Close the country dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (countryRef.current && !countryRef.current.contains(e.target as Node)) {
        setCountryOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload: AddressPayload = {
        type: form.type,
        label: form.label || undefined,
        contact_name: form.contact_name || undefined,
        phone: form.phone || undefined,
        email: form.email || undefined,
        address_line_1: form.address_line_1 || undefined,
        address_line_2: form.address_line_2 || undefined,
        city: form.city || undefined,
        city_id: form.city_id ? Number(form.city_id) : undefined,
        state: form.state || undefined,
        state_code: form.state_code || undefined,
        postal_code: form.postal_code || undefined,
        country_id: form.country_id ? Number(form.country_id) : undefined,
        is_primary: form.is_primary,
      };

      if (address) {
        await addressesApi.update(address.uuid, payload);
        showSuccess("Address updated");
      } else {
        await addressesApi.create(payload, addressableType);
        showSuccess("Address added");
      }
      onSaved();
      onClose();
    } catch (e) {
      if (isApiError(e)) {
        if (e.errors) {
          showError(Object.values(e.errors).flat()[0] || e.message);
        } else {
          showError(e.message);
        }
      } else if (e instanceof Error) {
        showError(e.message);
      } else {
        showError("Failed to save address. Please try again.");
      }
    } finally {
      setSaving(false);
    }
  };

  const field = (labelText: string, key: keyof FormState, type = "text", placeholder = "", required = false) => (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
        {labelText}
        {required && <span className="text-red-500"> *</span>}
        {!required && <span className="ml-1 text-xs font-normal text-gray-400">(optional)</span>}
      </Label>
      <Input
        type={type}
        value={form[key] as string}
        onChange={(e) => set(key, e.target.value as FormState[typeof key])}
        placeholder={placeholder}
        className="h-10"
      />
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={address ? "Edit Address" : "Add Address"}
      description={addressableType === "organization" ? "Organization address" : "Your address"}
      maxWidth="2xl"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        {/* Type */}
        <div className="space-y-1.5">
          <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Address Type <span className="text-red-500">*</span>
          </Label>
          <div className="relative">
            <select
              value={form.type}
              onChange={(e) => set("type", e.target.value)}
              className="h-10 w-full appearance-none rounded-md border border-gray-300 bg-white px-3 pr-9 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
            >
              {ADDRESS_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          </div>
        </div>

        {field("Label", "label", "text", "e.g. Home, Head Office")}
        {field("Contact Name", "contact_name", "text", "John Doe")}
        {field("Phone", "phone", "text", "+92 300 0000000")}
        {field("Email", "email", "email", "you@example.com")}

        <div className="sm:col-span-2">
          {field("Address Line 1", "address_line_1", "text", "Street address, P.O. box")}
        </div>
        <div className="sm:col-span-2">
          {field("Address Line 2", "address_line_2", "text", "Apartment, suite, unit, building, floor")}
        </div>

        {/* Country combobox */}
        <div className="space-y-1.5">
          <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Country <span className="text-red-500">*</span>
          </Label>
          <div ref={countryRef} className="relative">
            <button
              type="button"
              onClick={() => setCountryOpen((v) => !v)}
              className="flex h-10 w-full items-center justify-between rounded-md border border-gray-300 bg-white px-3 text-left text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
            >
              {selectedCountry ? (
                <span className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-gray-400" />
                  {selectedCountry.name}
                </span>
              ) : (
                <span className="text-gray-400">Select country...</span>
              )}
              <ChevronDown className="h-4 w-4 text-gray-400" />
            </button>

            {countryOpen && (
              <div className="absolute left-0 top-full z-20 mt-1 w-full overflow-hidden rounded-md border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-900">
                <div className="border-b border-gray-100 p-2 dark:border-gray-800">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <Input
                      value={countrySearch}
                      onChange={(e) => setCountrySearch(e.target.value)}
                      placeholder="Search countries..."
                      className="h-8 pl-8 text-xs"
                      autoFocus
                    />
                  </div>
                </div>
                <div className="max-h-56 overflow-y-auto">
                  {filteredCountries.length === 0 ? (
                    <p className="px-3 py-4 text-center text-xs text-gray-400">No countries found</p>
                  ) : (
                    filteredCountries.map((country) => {
                      const active = country.id === countryId;
                      return (
                        <button
                          key={country.id}
                          type="button"
                          onClick={() => {
                            set("country_id", String(country.id));
                            set("city_id", "");
                            setCountryOpen(false);
                            setCountrySearch("");
                          }}
                          className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-800 ${
                            active ? "bg-blue-50 dark:bg-blue-950/30" : ""
                          }`}
                        >
                          <span className="flex items-center gap-2">
                            <span className="text-xs font-semibold uppercase text-gray-400">{country.code}</span>
                            {country.name}
                          </span>
                          {active && <Check className="h-4 w-4 text-blue-600" />}
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* City */}
        <div className="space-y-1.5">
          <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            City
            {countryId ? <span className="text-red-500"> *</span> : <span className="ml-1 text-xs font-normal text-gray-400">(optional)</span>}
          </Label>
          {countryId && cities.length > 0 ? (
            <div className="relative">
              <select
                value={form.city_id}
                onChange={(e) => {
                  set("city_id", e.target.value);
                  const city = cities.find((c) => c.id === Number(e.target.value));
                  set("city", city?.name ?? "");
                }}
                className="h-10 w-full appearance-none rounded-md border border-gray-300 bg-white px-3 pr-9 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
              >
                <option value="">Select city...</option>
                {cities.map((city: City) => (
                  <option key={city.id} value={city.id}>{city.name}</option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            </div>
          ) : (
            <Input
              value={form.city}
              onChange={(e) => set("city", e.target.value)}
              placeholder={countryId ? "Type a city..." : "Select a country first"}
              className="h-10"
              disabled={!countryId}
            />
          )}
        </div>

        {field("State / Province", "state", "text", "Punjab")}
        {field("State Code", "state_code", "text", "PB", false)}
        {field("Postal Code", "postal_code", "text", "54000")}
      </div>

      {/* Primary toggle */}
      <label className="mt-5 flex cursor-pointer items-center gap-2.5">
        <input
          type="checkbox"
          checked={form.is_primary}
          onChange={(e) => set("is_primary", e.target.checked)}
          className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
        />
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Set as primary address
        </span>
      </label>

      <div className="mt-6 flex justify-end gap-2">
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {address ? "Update Address" : "Add Address"}
        </Button>
      </div>
    </Modal>
  );
}
