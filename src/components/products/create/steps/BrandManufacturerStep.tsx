import { useEffect, useRef, useState } from "react";
import { Factory, Search, ChevronDown } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { manufacturersApi } from "@/api/manufacturers";
import { brandsApi } from "@/api/brands";

interface Props {
  data: { manufacturerId: string; brandId: string };
  onChange: (data: { manufacturerId: string; brandId: string }) => void;
}

interface ComboProps {
  label: string;
  placeholder: string;
  items: Array<{ id: number; name: string }>;
  value: string;
  disabled?: boolean;
  onChange: (id: string) => void;
}

function Combo({ label, placeholder, items, value, disabled, onChange }: ComboProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const selected = items.find((i) => String(i.id) === value);
  const filtered = search.trim()
    ? items.filter((i) => i.name.toLowerCase().includes(search.toLowerCase()))
    : items;

  return (
    <div ref={ref} className="relative space-y-1.5">
      <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</Label>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(!open)}
        className="flex h-11 w-full items-center justify-between rounded-lg border border-gray-300 bg-white px-3 text-left text-sm disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800"
      >
        {selected ? (
          <span className="text-gray-700 dark:text-gray-200">{selected.name}</span>
        ) : (
          <span className="text-gray-400">{placeholder}</span>
        )}
        <ChevronDown className="h-4 w-4 shrink-0 text-gray-400" />
      </button>

      {open && (
        <div className="absolute left-0 top-full z-20 mt-1 max-h-64 w-full overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-600 dark:bg-gray-800">
          <div className="border-b border-gray-100 p-2 dark:border-gray-700">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search..."
                className="h-8 pl-8 text-xs"
                autoFocus
              />
            </div>
          </div>
          <div className="max-h-48 overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="px-3 py-4 text-center text-xs text-gray-400">No results</div>
            ) : (
              filtered.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    onChange(String(item.id));
                    setOpen(false);
                    setSearch("");
                  }}
                  className={`flex w-full items-center px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700/50 ${
                    String(item.id) === value ? "bg-blue-50 dark:bg-blue-900/20" : ""
                  }`}
                >
                  <span className="text-gray-700 dark:text-gray-200">{item.name}</span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function BrandManufacturerStep({ data, onChange }: Props) {
  const { data: manufacturers = [] } = useQuery({
    queryKey: ["manufacturers"],
    queryFn: () => manufacturersApi.list(),
    staleTime: 10 * 60 * 1000,
  });

  const manufacturerId = data.manufacturerId ? Number(data.manufacturerId) : undefined;

  const { data: brands = [] } = useQuery({
    queryKey: ["brands", manufacturerId],
    queryFn: () => brandsApi.list(manufacturerId),
    enabled: !!manufacturerId,
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sky-100 dark:bg-sky-900/30">
          <Factory className="h-5 w-5 text-sky-600 dark:text-sky-400" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Brand &amp; Manufacturer</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Who makes this product and under which brand
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Combo
          label="Manufacturer / OEM"
          placeholder="Select manufacturer..."
          items={manufacturers}
          value={data.manufacturerId}
          onChange={(id) => onChange({ manufacturerId: id, brandId: "" })}
        />
        <Combo
          label="Brand"
          placeholder="Select brand..."
          items={brands}
          value={data.brandId}
          disabled={!manufacturerId}
          onChange={(id) => onChange({ ...data, brandId: id })}
        />
      </div>
    </div>
  );
}
