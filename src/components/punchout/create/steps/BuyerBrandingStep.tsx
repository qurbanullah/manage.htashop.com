import { Palette } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { BuyerForm } from '@/lib/punchout-buyer-form'
import { BuyerField, BuyerStepHeader } from './BuyerField'

interface Props {
  data: BuyerForm
  onChange: (data: Partial<BuyerForm>) => void
}

const HEX_PATTERN = /^#[0-9a-fA-F]{6}$/

export function BuyerBrandingStep({ data, onChange }: Props) {
  const previewColor = HEX_PATTERN.test(data.primaryColor.trim())
    ? data.primaryColor.trim()
    : '#0f172a'

  return (
    <div className="space-y-5">
      <BuyerStepHeader
        icon={Palette}
        title="Branding"
        description="Optional visual touches shown inside this buyer’s storefront"
        tone="violet"
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label className="font-medium text-gray-700 text-sm dark:text-gray-300">
            Primary color <span className="ml-1 font-normal text-gray-400">(optional)</span>
          </Label>
          <div className="flex gap-2">
            <input
              type="color"
              value={previewColor}
              onChange={(event) => onChange({ primaryColor: event.target.value })}
              aria-label="Pick primary color"
              className="h-11 w-14 shrink-0 cursor-pointer rounded-md border border-gray-300 bg-white p-1 dark:border-gray-700 dark:bg-gray-950"
            />
            <Input
              value={data.primaryColor}
              onChange={(event) => onChange({ primaryColor: event.target.value })}
              placeholder="#0f172a"
              className="h-11 font-mono"
            />
          </div>
          <p className="text-gray-400 text-xs dark:text-gray-500">
            Hex color used for headers and primary buttons.
          </p>
        </div>

        <BuyerField
          label="Logo URL"
          value={data.logoUrl}
          onChange={(value) => onChange({ logoUrl: value })}
          type="url"
          placeholder="https://cdn.htashop.com/..."
          optional
          hint="Shown on the buyer’s storefront header."
        />
      </div>

      <div className="space-y-2">
        <h3 className="font-semibold text-gray-900 text-sm dark:text-white">Preview</h3>
        <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700">
          <div
            className="flex items-center justify-between px-4 py-3"
            style={{ backgroundColor: previewColor }}
          >
            <div className="flex items-center gap-3">
              {data.logoUrl.trim() ? (
                <img
                  src={data.logoUrl.trim()}
                  alt="Buyer logo preview"
                  className="h-8 max-w-40 object-contain"
                />
              ) : (
                <span className="font-semibold text-sm text-white">HTASHOP</span>
              )}
              <span className="font-medium text-sm text-white/90">
                {data.name.trim() || 'Buyer storefront'}
              </span>
            </div>
            <span className="rounded-md bg-white/20 px-2 py-1 font-medium text-white text-xs">
              Punchout
            </span>
          </div>
          <div className="flex items-center justify-between bg-white px-4 py-3 dark:bg-gray-900">
            <span className="text-gray-500 text-xs dark:text-gray-400">
              Catalogue · {data.defaultCurrency || 'USD'} · {data.defaultLocale || 'en'}
            </span>
            <span
              className="rounded-md px-3 py-1 font-medium text-white text-xs"
              style={{ backgroundColor: previewColor }}
            >
              Add to cart
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
