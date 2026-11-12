import { Loader2, UploadCloud } from 'lucide-react'
import { useState } from 'react'
import type { ProductImportKind, UploadProductImportPayload } from '@/api/productImports'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { FileUpload } from '@/components/ui/file-upload'
import { Label } from '@/components/ui/label'

export interface WarehouseOption {
  id: number
  name: string
  code: string | null
}

const KIND_OPTIONS: Array<{ value: ProductImportKind; label: string; hint: string }> = [
  {
    value: 'products',
    label: 'Products',
    hint: 'Create new products or update existing ones by seller SKU.',
  },
  {
    value: 'variants',
    label: 'Variants',
    hint: 'Add variants to products that already exist (parent external ID).',
  },
  {
    value: 'images',
    label: 'Images',
    hint: 'Attach images to products that already exist.',
  },
]

interface ProductImportUploadFormProps {
  warehouses: WarehouseOption[]
  isUploading: boolean
  onSubmit: (payload: UploadProductImportPayload) => void
}

const selectClass =
  'h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm dark:border-gray-600 dark:bg-gray-800'

const checkboxClass =
  'mt-0.5 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800'

export function ProductImportUploadForm({
  warehouses,
  isUploading,
  onSubmit,
}: ProductImportUploadFormProps) {
  const [file, setFile] = useState<File | null>(null)
  const [kind, setKind] = useState<ProductImportKind>('products')
  const [warehouse, setWarehouse] = useState('')
  const [createMissing, setCreateMissing] = useState(false)
  const [dryRun, setDryRun] = useState(false)

  const submit = () => {
    if (!file) return

    onSubmit({
      file,
      kind,
      warehouse: warehouse || undefined,
      create_missing: createMissing,
      dry_run: dryRun,
    })
  }

  const kindHint = KIND_OPTIONS.find((option) => option.value === kind)?.hint

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle>Upload a product file</CardTitle>
            <CardDescription className="mt-1">
              The file is validated row by row first; nothing reaches the catalogue until you commit
              the import.
            </CardDescription>
          </div>
          <UploadCloud className="hidden h-8 w-8 shrink-0 text-blue-500 sm:block" />
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        <FileUpload
          file={file}
          onChange={setFile}
          accept=".csv,.xlsx,.ods"
          maxSizeMB={20}
          label="Product file"
          helpText="CSV is recommended for large catalogues. Up to 50,000 rows."
          allowedText="Allowed: CSV, XLSX, ODS — Max 20 MB"
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label
              htmlFor="import-kind"
              className="font-medium text-gray-700 text-xs dark:text-gray-300"
            >
              File contains
            </Label>
            <select
              id="import-kind"
              value={kind}
              onChange={(event) => setKind(event.target.value as ProductImportKind)}
              className={selectClass}
            >
              {KIND_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <p className="text-gray-500 text-xs dark:text-gray-400">{kindHint}</p>
          </div>

          <div className="space-y-1.5">
            <Label
              htmlFor="import-warehouse"
              className="font-medium text-gray-700 text-xs dark:text-gray-300"
            >
              Stock warehouse <span className="font-normal text-gray-400">(optional)</span>
            </Label>
            <select
              id="import-warehouse"
              value={warehouse}
              onChange={(event) => setWarehouse(event.target.value)}
              className={selectClass}
            >
              <option value="">First active warehouse</option>
              {warehouses.map((option) => (
                <option key={option.id} value={option.code ?? String(option.id)}>
                  {option.name}
                </option>
              ))}
            </select>
            <p className="text-gray-500 text-xs dark:text-gray-400">
              Used for rows that carry a stock quantity but no warehouse code.
            </p>
          </div>
        </div>

        <div className="space-y-3">
          {kind === 'products' && (
            <label htmlFor="import-create-missing" className="flex cursor-pointer gap-2">
              <input
                id="import-create-missing"
                type="checkbox"
                checked={createMissing}
                onChange={(event) => setCreateMissing(event.target.checked)}
                className={checkboxClass}
              />
              <span>
                <span className="block font-medium text-gray-800 text-sm dark:text-gray-200">
                  Create missing categories and brands
                </span>
                <span className="block text-gray-500 text-xs dark:text-gray-400">
                  Off by default: unknown names reject the row instead of creating a near-duplicate.
                </span>
              </span>
            </label>
          )}

          <label htmlFor="import-dry-run" className="flex cursor-pointer gap-2">
            <input
              id="import-dry-run"
              type="checkbox"
              checked={dryRun}
              onChange={(event) => setDryRun(event.target.checked)}
              className={checkboxClass}
            />
            <span>
              <span className="block font-medium text-gray-800 text-sm dark:text-gray-200">
                Validate only
              </span>
              <span className="block text-gray-500 text-xs dark:text-gray-400">
                Stop after the report; commit the same import later.
              </span>
            </span>
          </label>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-gray-100 border-t pt-4 dark:border-gray-800">
          <p className="text-gray-500 text-xs dark:text-gray-400">
            Re-uploading the same file updates products by seller SKU (external ID).
          </p>
          <Button type="button" onClick={submit} disabled={!file || isUploading}>
            {isUploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Validating…
              </>
            ) : (
              'Validate file'
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
