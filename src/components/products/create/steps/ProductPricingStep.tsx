import { useState, useRef, useEffect } from "react";
import { DollarSign, Hash, Search, ChevronDown } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { currenciesApi } from "@/api/currencies";
import { unitsApi } from "@/api/units";

interface Props {
  data: { price: string; salePrice: string; currency: string; unitId: string };
  onChange: (data: { price: string; salePrice: string; currency: string; unitId: string }) => void;
}

export function PricingStep({ data, onChange }: Props) {
  const [currencyOpen, setCurrencyOpen] = useState(false);
  const [currencySearch, setCurrencySearch] = useState("");
  const [unitOpen, setUnitOpen] = useState(false);
  const [unitSearch, setUnitSearch] = useState("");
  const currencyRef = useRef<HTMLDivElement>(null);
  const unitRef = useRef<HTMLDivElement>(null);

  const { data: currencies = [] } = useQuery({
    queryKey: ["currencies"],
    queryFn: () => currenciesApi.list(),
    staleTime: 30 * 60 * 1000,
  });

  const { data: packagingUnits = [] } = useQuery({
    queryKey: ["units", "packaging"],
    queryFn: () => unitsApi.list("packaging"),
    staleTime: 10 * 60 * 1000,
  });

  const selectedCurrency = currencies.find((c) => c.code === data.currency);
  const selectedUnit = packagingUnits.find((u) => String(u.id) === data.unitId);

  const filteredCurrencies = currencySearch.trim()
    ? currencies.filter(
        (c) =>
          c.name.toLowerCase().includes(currencySearch.toLowerCase()) ||
          c.code.toLowerCase().includes(currencySearch.toLowerCase()),
      )
    : currencies;

  const filteredUnits = unitSearch.trim()
    ? packagingUnits.filter(
        (u) =>
          u.name.toLowerCase().includes(unitSearch.toLowerCase()) ||
          u.symbol.toLowerCase().includes(unitSearch.toLowerCase()) ||
          u.code.toLowerCase().includes(unitSearch.toLowerCase()),
      )
    : packagingUnits;

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (currencyRef.current && !currencyRef.current.contains(e.target as Node)) {
        setCurrencyOpen(false);
        setCurrencySearch("");
      }
      if (unitRef.current && !unitRef.current.contains(e.target as Node)) {
        setUnitOpen(false);
        setUnitSearch("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900/30">
          <DollarSign className="h-5 w-5 text-green-600 dark:text-green-400" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Pricing</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">Set your product price</p>
        </div>
      </div>

      {/* Currency */}
      <div ref={currencyRef} className="relative space-y-1.5">
        <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Currency <span className="ml-1 text-red-500">*</span>
        </Label>
        <button
          type="button"
          onClick={() => setCurrencyOpen(!currencyOpen)}
          className="flex h-11 w-full items-center justify-between rounded-lg border border-gray-300 bg-white px-3 text-left text-sm transition-colors hover:border-gray-400 dark:border-gray-600 dark:bg-gray-800 dark:hover:border-gray-500"
        >
          {selectedCurrency ? (
            <span>
              <span className="font-medium text-gray-700 dark:text-gray-200">{selectedCurrency.symbol}</span>
              <span className="ml-2 text-gray-500 dark:text-gray-400">{selectedCurrency.code} — {selectedCurrency.name}</span>
            </span>
          ) : (
            <span className="text-gray-400">Select currency...</span>
          )}
          <ChevronDown className="h-4 w-4 shrink-0 text-gray-400" />
        </button>

        {currencyOpen && (
          <div className="absolute z-20 mt-1 max-h-64 w-full overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-600 dark:bg-gray-800">
            <div className="border-b border-gray-100 p-2 dark:border-gray-700">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
                <Input value={currencySearch} onChange={(e) => setCurrencySearch(e.target.value)} placeholder="Search currencies..." className="h-8 pl-8 text-xs" autoFocus />
              </div>
            </div>
            <div className="max-h-48 overflow-y-auto">
              {filteredCurrencies.length === 0 ? (
                <div className="px-3 py-6 text-center text-sm text-gray-400">No currencies found</div>
              ) : (
                filteredCurrencies.map((c) => (
                  <button
                    key={c.code}
                    type="button"
                    onClick={() => { onChange({ ...data, currency: c.code }); setCurrencyOpen(false); setCurrencySearch(""); }}
                    className={`flex w-full items-center gap-3 px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700/50 ${data.currency === c.code ? "bg-blue-50 dark:bg-blue-900/20" : ""}`}
                  >
                    <span className="w-8 text-left font-medium text-gray-700 dark:text-gray-200">{c.symbol}</span>
                    <span className="w-14 text-xs font-medium text-gray-500">{c.code}</span>
                    <span className="text-gray-600 dark:text-gray-400">{c.name}</span>
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* Base price */}
      <div className="space-y-1.5">
        <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Base price <span className="ml-1 text-red-500">*</span>
        </Label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-gray-500">
            {selectedCurrency?.symbol || "$"}
          </span>
          <Input type="number" min="0" step="0.01" value={data.price} onChange={(e) => onChange({ ...data, price: e.target.value })} placeholder="0.00" className="h-11 pl-8" />
        </div>
      </div>

      {/* Sale price */}
      <div className="space-y-1.5">
        <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Sale price <span className="font-normal text-gray-400">(optional)</span>
        </Label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-gray-500">
            {selectedCurrency?.symbol || "$"}
          </span>
          <Input
            type="number"
            min="0"
            step="0.01"
            value={data.salePrice}
            onChange={(e) => onChange({ ...data, salePrice: e.target.value })}
            placeholder="0.00"
            className="h-11 pl-8"
          />
        </div>
        {data.salePrice && Number(data.salePrice) > 0 && Number(data.salePrice) >= Number(data.price) && (
          <p className="text-xs text-amber-600 dark:text-amber-400">Sale price should be less than base price</p>
        )}
        {data.salePrice && Number(data.salePrice) > 0 && Number(data.salePrice) < Number(data.price) && (
          <p className="text-xs text-green-600 dark:text-green-400">
            {Math.round((1 - Number(data.salePrice) / Number(data.price)) * 100)}% off
          </p>
        )}
      </div>

      {/* Packaging Unit */}
      <div ref={unitRef} className="relative space-y-1.5">
        <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Unit (Packaging) <span className="ml-1 font-normal text-gray-400">(optional)</span>
        </Label>
        <button
          type="button"
          onClick={() => setUnitOpen(!unitOpen)}
          className="flex h-11 w-full items-center justify-between rounded-lg border border-gray-300 bg-white px-3 text-left text-sm transition-colors hover:border-gray-400 dark:border-gray-600 dark:bg-gray-800 dark:hover:border-gray-500"
        >
          {selectedUnit ? (
            <span>
              <span className="font-medium text-gray-700 dark:text-gray-200">{selectedUnit.name}</span>
              <span className="ml-2 text-xs text-gray-400">({selectedUnit.symbol})</span>
            </span>
          ) : (
            <span className="text-gray-400">Select unit (e.g. Piece, Box, Dozen)...</span>
          )}
          <ChevronDown className="h-4 w-4 shrink-0 text-gray-400" />
        </button>

        {unitOpen && (
          <div className="absolute z-20 mt-1 max-h-64 w-full overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-600 dark:bg-gray-800">
            <div className="border-b border-gray-100 p-2 dark:border-gray-700">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
                <Input value={unitSearch} onChange={(e) => setUnitSearch(e.target.value)} placeholder="Search units..." className="h-8 pl-8 text-xs" autoFocus />
              </div>
            </div>
            <div className="max-h-48 overflow-y-auto">
              {filteredUnits.length === 0 ? (
                <div className="px-3 py-6 text-center text-sm text-gray-400">No units found</div>
              ) : (
                filteredUnits.map((u) => (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => { onChange({ ...data, unitId: String(u.id) }); setUnitOpen(false); setUnitSearch(""); }}
                    className={`flex w-full items-center gap-3 px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700/50 ${String(u.id) === data.unitId ? "bg-blue-50 dark:bg-blue-900/20" : ""}`}
                  >
                    <Hash className="h-4 w-4 shrink-0 text-gray-400" />
                    <span className="font-medium text-gray-700 dark:text-gray-200">{u.name}</span>
                    <span className="text-xs text-gray-400">{u.symbol}</span>
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
