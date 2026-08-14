import { useRef, useEffect, useState } from "react";
import { SlidersHorizontal, Plus, X, Search, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { definitionsApi, type Definition } from "@/api/definitions";
import { unitsApi, type Unit } from "@/api/units";

interface ConfigEntry {
  definition_id: number | null;
  code: string;
  key: string;
  value: string;
  unitId: string;
  unitName: string;
}

interface Props {
  data: { configuration: ConfigEntry[] };
  onChange: (data: { configuration: ConfigEntry[] }) => void;
}

export function VariantConfigStep({ data, onChange }: Props) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [unitDropdownOpen, setUnitDropdownOpen] = useState<string | null>(null);
  const pickerRef = useRef<HTMLDivElement>(null);
  const unitRef = useRef<HTMLDivElement>(null);

  const { data: definitions = [], isLoading } = useQuery({
    queryKey: ["definitions", "variant", "attribute"],
    queryFn: () => definitionsApi.list("variant", "attribute"),
    staleTime: 10 * 60 * 1000,
  });

  const { data: allUnits = [] } = useQuery({
    queryKey: ["units"],
    queryFn: () => unitsApi.list(),
    staleTime: 10 * 60 * 1000,
  });

  // Close picker on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setPickerOpen(false); setSearch("");
      }
      if (unitRef.current && !unitRef.current.contains(e.target as Node) && unitDropdownOpen) {
        setUnitDropdownOpen(null);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [unitDropdownOpen]);

  const configuredCodes = new Set(data.configuration.map((c) => c.code));
  const available = search.trim()
    ? definitions.filter((d) => !configuredCodes.has(d.code) && (d.name.toLowerCase().includes(search.toLowerCase()) || d.group_name?.toLowerCase().includes(search.toLowerCase())))
    : definitions.filter((d) => !configuredCodes.has(d.code));

  const defMap = new Map(definitions.map((d) => [d.code, d]));

  // Units filtered by measurement_id
  const getUnitsForDef = (def: Definition): Unit[] => {
    if (!def.measurement_id) return [];
    return allUnits.filter((u) => u.measurement?.id === def.measurement_id);
  };

  const addAttribute = (def: Definition) => {
    onChange({
      configuration: [
        ...data.configuration,
        { definition_id: def.id, code: def.code, key: def.name, value: "", unitId: "", unitName: "" },
      ],
    });
    setPickerOpen(false);
    setSearch("");
  };

  const updateConfig = (code: string, patch: Partial<ConfigEntry>) => {
    onChange({
      configuration: data.configuration.map((c) => c.code === code ? { ...c, ...patch } : c),
    });
  };

  const removeAttribute = (code: string) => {
    onChange({ configuration: data.configuration.filter((c) => c.code !== code) });
  };

  if (isLoading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-gray-400" /></div>;
  }

  return (
    <div className="w-full space-y-5">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-100 dark:bg-violet-900/30">
          <SlidersHorizontal className="h-5 w-5 text-violet-600 dark:text-violet-400" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Configuration</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">Add attributes that define this variant</p>
        </div>
      </div>

      {data.configuration.length > 0 && (
        <div className="space-y-3">
          {data.configuration.map((config) => {
            const def = defMap.get(config.code);
            if (!def) return null;
            const units = getUnitsForDef(def);
            const hasUnitSelect = def.value_type === "number" && units.length > 0;

            return (
              <div key={config.code} className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
                <div className="mb-2 flex items-center justify-between">
                  <div>
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-200">{def.name}</span>
                    {def.is_required && <span className="ml-1 text-red-500">*</span>}
                    <span className="ml-2 text-xs text-gray-400">{def.group_name}</span>
                  </div>
                  <button onClick={() => removeAttribute(config.code)} className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-500">
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {/* Swatch (color) */}
                {def.display_type === "swatch" && def.options.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {def.options.map((opt) => {
                      const active = config.value === opt.name;
                      const hex = (opt.metadata?.hex as string) || "";
                      return (
                        <button key={opt.id} type="button" onClick={() => updateConfig(config.code, { value: opt.name })}
                          className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                            active ? "border-violet-500 bg-violet-50 text-violet-700 dark:border-violet-400 dark:bg-violet-900/20 dark:text-violet-300"
                            : "border-gray-200 text-gray-600 hover:border-gray-300 dark:border-gray-700 dark:text-gray-300"
                          }`}
                        >
                          {def.swatch_type === "color" && <span className="h-4 w-4 rounded-full border border-gray-300" style={{ backgroundColor: hex }} />}
                          {opt.name}
                        </button>
                      );
                    })}
                  </div>
                ) : /* Button pills */
                def.display_type === "button" && def.options.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {def.options.map((opt) => (
                      <button key={opt.id} type="button" onClick={() => updateConfig(config.code, { value: opt.name })}
                        className={`rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
                          config.value === opt.name ? "border-violet-500 bg-violet-50 text-violet-700 dark:border-violet-400 dark:bg-violet-900/20 dark:text-violet-300"
                          : "border-gray-200 text-gray-600 hover:border-gray-300 dark:border-gray-700 dark:text-gray-300"
                        }`}
                      >{opt.name}</button>
                    ))}
                  </div>
                ) : /* Dropdown */
                def.display_type === "dropdown" && def.options.length > 0 ? (
                  <select value={config.value} onChange={(e) => updateConfig(config.code, { value: e.target.value })}
                    className="h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm dark:border-gray-600 dark:bg-gray-800">
                    <option value="">Select {def.name}...</option>
                    {def.options.map((opt) => <option key={opt.id} value={opt.name}>{opt.name}</option>)}
                  </select>
                ) : /* Input — with optional unit selector */
                hasUnitSelect ? (
                  <div className="flex gap-2">
                    <Input
                      value={config.value}
                      onChange={(e) => updateConfig(config.code, { value: e.target.value })}
                      placeholder={`Enter ${def.name.toLowerCase()}`}
                      type="number"
                      className="h-11 flex-1"
                    />
                    <select
                      value={config.unitId}
                      onChange={(e) => {
                        const unit = units.find((u) => String(u.id) === e.target.value);
                        updateConfig(config.code, { unitId: e.target.value, unitName: unit ? `${unit.name} (${unit.symbol})` : "" });
                      }}
                      className="h-11 rounded-lg border border-gray-300 bg-white px-3 text-sm dark:border-gray-600 dark:bg-gray-800"
                    >
                      <option value="">Unit</option>
                      {units.map((u) => (
                        <option key={u.id} value={u.id}>{u.name} ({u.symbol})</option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <Input
                    value={config.value}
                    onChange={(e) => updateConfig(config.code, { value: e.target.value })}
                    placeholder={`Enter ${def.name.toLowerCase()}`}
                    type={def.value_type === "number" ? "number" : "text"}
                    className="h-11"
                  />
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Add attribute picker */}
      <div ref={pickerRef} className="relative">
        <button type="button" onClick={() => setPickerOpen(!pickerOpen)} disabled={available.length === 0}
          className={`flex h-11 w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed text-sm font-medium transition-colors ${
            available.length === 0 ? "border-gray-100 text-gray-300 dark:border-gray-700 dark:text-gray-600"
            : "border-gray-300 text-gray-500 hover:border-violet-400 hover:text-violet-600 dark:border-gray-600 dark:text-gray-400 dark:hover:border-violet-400"
          }`}
        >
          <Plus className="h-4 w-4" />
          {available.length === 0 ? "All attributes added" : "Add attribute"}
        </button>

        {pickerOpen && available.length > 0 && (
          <div className="absolute left-0 top-full z-20 mt-1 w-full overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-600 dark:bg-gray-800">
            <div className="border-b border-gray-100 p-2 dark:border-gray-700">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
                <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search attributes..." className="h-8 pl-8 text-xs" autoFocus />
              </div>
            </div>
            <div className="max-h-48 overflow-y-auto">
              {available.map((def) => (
                <button key={def.id} type="button" onClick={() => addAttribute(def)}
                  className="flex w-full items-center justify-between px-3 py-2.5 text-sm hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <span className="text-gray-700 dark:text-gray-300">{def.name}{def.is_required && <span className="ml-1 text-red-400">*</span>}</span>
                  <span className="text-xs text-gray-400">{def.group_name}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {data.configuration.length === 0 && !pickerOpen && (
        <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-200 py-10 text-gray-400 dark:border-gray-700">
          <SlidersHorizontal className="mb-2 h-8 w-8" />
          <span className="text-sm">No attributes configured</span>
          <span className="mt-1 text-xs">Click "Add attribute" to define what varies</span>
        </div>
      )}
    </div>
  );
}
