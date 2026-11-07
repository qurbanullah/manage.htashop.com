import { Hash, Wand2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { gtinType, suggestPartNumber } from '@/utils/product-identifiers'

export interface IdentifiersFormData {
  sellerSku: string
  partNumber: string
  hsCode: string
  unspsc: string
  ntn: string
  barcode: string
  gtin: string
  modelNumber: string
}

interface Props {
  data: IdentifiersFormData
  onChange: (data: Partial<IdentifiersFormData>) => void
  /** Read-only platform SKU (HTASIN), assigned once on save and never changed. */
  systemSku?: string
}

/**
 * Trade and procurement codes. The platform SKU is opaque and immutable; the
 * part number is only a suggestion the seller can replace.
 */
export function IdentifiersStep({ data, onChange, systemSku }: Props) {
  const field = (
    label: string,
    key: keyof IdentifiersFormData,
    placeholder: string,
    options?: { className?: string; hint?: string }
  ) => (
    <div className="space-y-1.5">
      <Label className="font-medium text-gray-700 text-sm dark:text-gray-300">
        {label}
        <span className="ml-1 font-normal text-gray-400">(optional)</span>
      </Label>
      <Input
        value={data[key]}
        onChange={(e) => onChange({ [key]: e.target.value })}
        placeholder={placeholder}
        className={`h-11 ${options?.className ?? ''}`}
      />
      {options?.hint && <p className="text-gray-400 text-xs dark:text-gray-500">{options.hint}</p>}
    </div>
  )

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-900/30">
          <Hash className="h-5 w-5 text-slate-600 dark:text-slate-400" />
        </div>
        <div>
          <h2 className="font-semibold text-gray-900 text-lg dark:text-white">
            Identifiers &amp; Codes
          </h2>
          <p className="text-gray-500 text-sm dark:text-gray-400">
            Procurement and trade references for this product
          </p>
        </div>
      </div>

      <div className="space-y-1.5 rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800/50">
        <Label className="font-medium text-gray-700 text-sm dark:text-gray-300">HTASIN</Label>
        <Input
          value={systemSku ?? ''}
          placeholder="Assigned on save (e.g. H7K2M9QX4T)"
          disabled
          className="h-11 font-mono disabled:cursor-not-allowed disabled:bg-white disabled:text-gray-500 dark:disabled:bg-gray-800 dark:disabled:text-gray-400"
        />
        <p className="text-gray-400 text-xs dark:text-gray-500">
          A 10-character platform identifier, assigned once and never changed — renaming or
          re-categorising the product does not affect it. Not editable.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {field('Seller SKU', 'sellerSku', 'e.g. MY-SKU-001', {
          hint: 'Leave blank to use the HTASIN as your seller SKU.',
        })}

        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <Label className="font-medium text-gray-700 text-sm dark:text-gray-300">
              Part Number <span className="font-normal text-gray-400">(optional)</span>
            </Label>
            <button
              type="button"
              onClick={() => onChange({ partNumber: suggestPartNumber() })}
              className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 font-medium text-blue-600 text-xs hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/20"
            >
              <Wand2 className="h-3 w-3" /> Suggest
            </button>
          </div>
          <Input
            value={data.partNumber}
            onChange={(e) => onChange({ partNumber: e.target.value })}
            placeholder="PN-XXXXXXXX"
            className="h-11"
          />
          <p className="text-gray-400 text-xs dark:text-gray-500">
            We suggest a value; use the manufacturer's part number when you have one.
          </p>
        </div>

        {field('Model Number', 'modelNumber', 'Model X')}
        {field('Barcode', 'barcode', 'EAN / UPC')}

        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <Label className="font-medium text-gray-700 text-sm dark:text-gray-300">
              GTIN <span className="font-normal text-gray-400">(optional)</span>
            </Label>
            {gtinType(data.gtin) && (
              <span className="rounded-full bg-gray-100 px-2 py-0.5 font-medium text-gray-600 text-xs dark:bg-gray-700 dark:text-gray-300">
                {gtinType(data.gtin)}
              </span>
            )}
          </div>
          <Input
            value={data.gtin}
            onChange={(e) => onChange({ gtin: e.target.value.replace(/\D/g, '') })}
            inputMode="numeric"
            maxLength={14}
            placeholder="8, 12, 13 or 14 digits"
            className="h-11 font-mono"
          />
          <p className="text-gray-400 text-xs dark:text-gray-500">
            GS1 global trade item number: GTIN-8 (EAN-8), GTIN-12 (UPC), GTIN-13 (EAN/JAN) or
            GTIN-14 (carton). Unlike a SKU, it identifies the item globally.
          </p>
        </div>
        {field('HS Code', 'hsCode', '8471.30')}
        {field('UNSPSC', 'unspsc', '43211500')}
        {field('NTN', 'ntn', '1234567-8')}
      </div>
    </div>
  )
}
