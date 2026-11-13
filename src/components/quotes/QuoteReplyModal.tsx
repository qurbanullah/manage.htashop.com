import { useMutation } from '@tanstack/react-query'
import {
  ArrowLeft,
  ArrowRight,
  Boxes,
  Check,
  CheckCircle2,
  FileText,
  Loader2,
  Package,
  Plus,
  Send,
  Trash2,
  Truck,
} from 'lucide-react'
import { type ReactNode, useCallback, useEffect, useMemo, useState } from 'react'
import {
  INCOTERM_OPTIONS,
  type Incoterm,
  PAYMENT_TERM_OPTIONS,
  type PaymentTerms,
  type QuoteDetail,
  type QuoteResponse,
  type QuoteResponsePayload,
  quotesApi,
  SHIPPING_METHOD_OPTIONS,
  type ShippingMethod,
} from '@/api/quotes'
import { formatMoney } from '@/components/quotes/format'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Modal } from '@/components/ui/modal'
import { useToast } from '@/components/ui/Toaster'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'

interface LineDraft {
  id: string
  productId: number | null
  variantId: number | null
  name: string
  sku: string
  partNumber: string
  description: string
  quantity: string
  unitPrice: string
  discountAmount: string
  taxRate: string
  leadTimeDays: string
}

interface FormState {
  subject: string
  message: string
  currency: string
  validityDays: string
  paymentTerms: PaymentTerms | ''
  warrantyMonths: string
  lines: LineDraft[]
  incoterm: Incoterm | ''
  incotermLocation: string
  shippingMethod: ShippingMethod | ''
  countryOfOrigin: string
  hsCode: string
  leadTimeDays: string
  estimatedShipDate: string
  portOfLoading: string
  portOfDischarge: string
  partialShipmentAllowed: boolean
  shippingNotes: string
  packageCount: string
  grossWeightKg: string
  netWeightKg: string
  packageDimensions: string
  packagingNotes: string
  shippingAmount: string
  discountAmount: string
  terms: string
}

type Update = (patch: Partial<FormState>) => void

interface ReplyModalProps {
  quote: QuoteDetail
  isOpen: boolean
  onClose: () => void
  onSaved: () => void
  /** Editing a saved draft revision instead of composing a new one. */
  draft?: QuoteResponse | null
}

const CURRENCIES = ['PKR', 'USD', 'EUR', 'AED', 'GBP']

const STEPS = [
  { label: 'Offer', hint: 'Message & commercial terms', icon: FileText },
  { label: 'Items', hint: 'Products & pricing', icon: Package },
  { label: 'Logistics', hint: 'Incoterms & shipping', icon: Truck },
  { label: 'Packing', hint: 'Weights & costs', icon: Boxes },
  { label: 'Review', hint: 'Terms & send', icon: CheckCircle2 },
] as const

const LAST_STEP = STEPS.length - 1

let lineCounter = 0
function nextLineId(): string {
  lineCounter += 1
  return `line-${lineCounter}`
}

function emptyLine(): LineDraft {
  return {
    id: nextLineId(),
    productId: null,
    variantId: null,
    name: '',
    sku: '',
    partNumber: '',
    description: '',
    quantity: '1',
    unitPrice: '0',
    discountAmount: '0',
    taxRate: '0',
    leadTimeDays: '',
  }
}

function prefillLine(quote: QuoteDetail): LineDraft {
  const requirements = quote.requirements ?? {}

  return {
    ...emptyLine(),
    productId: requirements.product_id ?? quote.quotable?.id ?? null,
    name: requirements.product_name ?? quote.product_name ?? 'Custom quotation',
    sku: requirements.sku ?? quote.sku ?? '',
    partNumber: requirements.part_number ?? quote.part_number ?? '',
    quantity: String(requirements.quantity ?? quote.quantity ?? 1),
  }
}

function lineFromResponse(item: NonNullable<QuoteResponse['items']>[number]): LineDraft {
  return {
    id: nextLineId(),
    productId: null,
    variantId: null,
    name: item.name,
    sku: item.sku ?? '',
    partNumber: item.part_number ?? '',
    description: item.description ?? '',
    quantity: String(item.quantity ?? 1),
    unitPrice: String(item.unit_price ?? 0),
    discountAmount: String(item.discount_amount ?? 0),
    taxRate: String(item.tax_rate ?? 0),
    leadTimeDays: item.lead_time_days != null ? String(item.lead_time_days) : '',
  }
}

function numberValue(value: string): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function lineTotal(line: LineDraft): number {
  const taxable = Math.max(
    0,
    numberValue(line.quantity) * numberValue(line.unitPrice) - numberValue(line.discountAmount)
  )
  return taxable + (taxable * numberValue(line.taxRate)) / 100
}

function textOrNull(value: string): string | null {
  const trimmed = value.trim()
  return trimmed === '' ? null : trimmed
}

function numberOrNull(value: string): number | null {
  return value.trim() === '' ? null : numberValue(value)
}

function initialState(quote: QuoteDetail, draft: QuoteResponse | null): FormState {
  const base = baseForm(quote)

  return draft ? formFromDraft(base, draft) : base
}

function baseForm(quote: QuoteDetail): FormState {
  return {
    subject: `Quotation ${quote.quote_number ?? quote.customer_name}`,
    message: `Dear ${quote.customer_name},\n\nThank you for your inquiry. Please find our offer below.\n\nBest regards,`,
    currency: 'PKR',
    validityDays: '30',
    paymentTerms: '',
    warrantyMonths: '',
    lines: [prefillLine(quote)],
    incoterm: '',
    incotermLocation: '',
    shippingMethod: '',
    countryOfOrigin: '',
    hsCode: '',
    leadTimeDays: '',
    estimatedShipDate: '',
    portOfLoading: '',
    portOfDischarge: '',
    partialShipmentAllowed: true,
    shippingNotes: '',
    ...packagingDefaults(quote),
    shippingAmount: '0',
    discountAmount: '0',
    terms: 'Prices are exclusive of applicable taxes unless stated otherwise.',
  }
}

type PackagingFields = Pick<
  FormState,
  'packageCount' | 'grossWeightKg' | 'netWeightKg' | 'packageDimensions' | 'packagingNotes'
>

/**
 * Packaging defaults from the quoted product's shipping record. The quoted
 * quantity is divided by units-per-case to suggest a package count.
 */
function packagingDefaults(quote: QuoteDetail): PackagingFields {
  const prefill = quote.packaging_prefill

  if (!prefill) {
    return {
      packageCount: '',
      grossWeightKg: '',
      netWeightKg: '',
      packageDimensions: '',
      packagingNotes: '',
    }
  }

  const quantity = numberValue(String(quote.requirements?.quantity ?? quote.quantity ?? ''))
  const unitsPerCase = prefill.units_per_case > 0 ? prefill.units_per_case : 0
  const packageCount =
    unitsPerCase > 0 && quantity > 0 ? String(Math.ceil(quantity / unitsPerCase)) : ''

  const notes = [
    prefill.handling_notes,
    prefill.is_fragile ? 'Fragile' : null,
    prefill.is_hazmat ? 'Hazardous goods' : null,
  ]
    .filter(Boolean)
    .join('. ')

  return {
    packageCount,
    grossWeightKg: stringOf(prefill.gross_weight_kg),
    netWeightKg: stringOf(prefill.net_weight_kg),
    packageDimensions: prefill.dimensions ?? '',
    packagingNotes: notes,
  }
}

function stringOf(value: number | null | undefined): string {
  return value != null ? String(value) : ''
}

function formFromDraft(base: FormState, draft: QuoteResponse): FormState {
  return {
    ...base,
    ...draftCommercial(base, draft),
    lines: draft.items?.length ? draft.items.map((item) => lineFromResponse(item)) : base.lines,
    ...draftLogistics(draft),
    ...draftPacking(base, draft),
  }
}

function draftCommercial(base: FormState, draft: QuoteResponse): Partial<FormState> {
  return {
    subject: draft.subject,
    message: draft.message,
    currency: draft.currency || 'PKR',
    validityDays: String(draft.validity_days || 30),
    paymentTerms: draft.payment_terms ?? '',
    warrantyMonths: stringOf(draft.warranty_months),
    terms: draft.terms ?? base.terms,
  }
}

function draftLogistics(draft: QuoteResponse): Partial<FormState> {
  return {
    incoterm: draft.incoterm ?? '',
    incotermLocation: draft.incoterm_location ?? '',
    shippingMethod: draft.shipping_method ?? '',
    countryOfOrigin: draft.country_of_origin ?? '',
    hsCode: draft.hs_code ?? '',
    leadTimeDays: stringOf(draft.lead_time_days),
    estimatedShipDate: draft.estimated_ship_date ?? '',
    portOfLoading: draft.port_of_loading ?? '',
    portOfDischarge: draft.port_of_discharge ?? '',
    partialShipmentAllowed: draft.partial_shipment_allowed ?? true,
    shippingNotes: draft.shipping_notes ?? '',
  }
}

function draftPacking(base: FormState, draft: QuoteResponse): Partial<FormState> {
  return {
    packageCount: draft.package_count != null ? String(draft.package_count) : base.packageCount,
    grossWeightKg:
      draft.gross_weight_kg != null ? String(draft.gross_weight_kg) : base.grossWeightKg,
    netWeightKg: draft.net_weight_kg != null ? String(draft.net_weight_kg) : base.netWeightKg,
    packageDimensions: draft.package_dimensions ?? base.packageDimensions,
    packagingNotes: draft.packaging_notes ?? base.packagingNotes,
    shippingAmount: String(draft.shipping_amount ?? 0),
    discountAmount: String(draft.discount_amount ?? 0),
  }
}

function buildPayload(form: FormState, send: boolean): QuoteResponsePayload {
  return {
    subject: form.subject.trim(),
    message: form.message.trim(),
    terms: textOrNull(form.terms),
    currency: form.currency,
    validity_days: Math.max(1, Math.round(numberValue(form.validityDays))),
    shipping_amount: numberValue(form.shippingAmount),
    discount_amount: numberValue(form.discountAmount),
    send,
    incoterm: form.incoterm || null,
    incoterm_location: textOrNull(form.incotermLocation),
    payment_terms: form.paymentTerms || null,
    warranty_months: numberOrNull(form.warrantyMonths),
    shipping_method: form.shippingMethod || null,
    country_of_origin: textOrNull(form.countryOfOrigin),
    hs_code: textOrNull(form.hsCode),
    lead_time_days: numberOrNull(form.leadTimeDays),
    estimated_ship_date: textOrNull(form.estimatedShipDate),
    port_of_loading: textOrNull(form.portOfLoading),
    port_of_discharge: textOrNull(form.portOfDischarge),
    partial_shipment_allowed: form.partialShipmentAllowed,
    shipping_notes: textOrNull(form.shippingNotes),
    package_count: numberOrNull(form.packageCount),
    gross_weight_kg: numberOrNull(form.grossWeightKg),
    net_weight_kg: numberOrNull(form.netWeightKg),
    package_dimensions: textOrNull(form.packageDimensions),
    packaging_notes: textOrNull(form.packagingNotes),
    items: form.lines.map((line) => ({
      product_id: line.productId,
      variant_id: line.variantId,
      name: line.name.trim(),
      sku: textOrNull(line.sku),
      part_number: textOrNull(line.partNumber),
      description: textOrNull(line.description),
      quantity: numberValue(line.quantity),
      unit_price: numberValue(line.unitPrice),
      discount_amount: numberValue(line.discountAmount),
      tax_rate: numberValue(line.taxRate),
      lead_time_days:
        line.leadTimeDays.trim() === '' ? null : Math.round(numberValue(line.leadTimeDays)),
    })),
  }
}

/**
 * Returns an error message for the step, or null when it is valid.
 * Steps 0 and 1 are always required; the rest only before sending.
 */
function stepError(index: number, form: FormState): string | null {
  switch (index) {
    case 0:
      return offerError(form)
    case 1:
      return itemsError(form)
    case 2:
      return logisticsError(form)
    case 3:
      return costsError(form)
    default:
      return null
  }
}

function offerError(form: FormState): string | null {
  if (!form.subject.trim()) return 'Add a subject before continuing.'
  if (!form.message.trim()) return 'Write a short message for the customer.'
  return null
}

function itemsError(form: FormState): string | null {
  if (form.lines.length === 0) return 'Add at least one line item.'

  for (const line of form.lines) {
    if (!line.name.trim()) return 'Every line item needs a name.'
    if (numberValue(line.quantity) <= 0) {
      return 'Every line item needs a quantity greater than zero.'
    }
  }

  return null
}

function logisticsError(form: FormState): string | null {
  if (form.incoterm && !form.incotermLocation.trim()) {
    return 'Incoterms need a named place (for example, “Karachi Port”).'
  }

  if (
    form.grossWeightKg &&
    form.netWeightKg &&
    numberValue(form.netWeightKg) > numberValue(form.grossWeightKg)
  ) {
    return 'Net weight cannot be greater than gross weight.'
  }

  return null
}

function costsError(form: FormState): string | null {
  if (numberValue(form.shippingAmount) < 0) return 'Shipping cannot be negative.'
  if (numberValue(form.discountAmount) < 0) return 'Discount cannot be negative.'
  return null
}

export function QuoteReplyModal({ quote, isOpen, onClose, onSaved, draft }: ReplyModalProps) {
  const { success: showSuccess, error: showError } = useToast()

  const [step, setStep] = useState(0)
  const [form, setForm] = useState<FormState>(() => initialState(quote, draft ?? null))

  // Reset whenever the modal opens so a previous quote never leaks in.
  useEffect(() => {
    if (!isOpen) return
    setStep(0)
    setForm(initialState(quote, draft ?? null))
  }, [isOpen, draft, quote])

  const update = useCallback<Update>((patch) => {
    setForm((current) => ({ ...current, ...patch }))
  }, [])

  const mutation = useMutation<
    QuoteResponse,
    Error,
    { payload: QuoteResponsePayload; send: boolean }
  >({
    mutationFn: async ({ payload, send }) => {
      if (draft) {
        const updated = await quotesApi.updateDraft(quote.uuid, draft.uuid, payload)
        return send ? quotesApi.sendDraft(quote.uuid, updated.uuid) : updated
      }

      return quotesApi.reply(quote.uuid, payload)
    },
    onSuccess: (response) => {
      showSuccess(
        response.status === 'draft' ? 'Draft saved' : 'Quote response sent',
        response.status === 'draft'
          ? 'You can keep editing it until you send.'
          : `Revision ${response.revision} is on its way to the customer.`
      )
      onSaved()
      onClose()
    },
    onError: (error: Error) => showError('Could not save the quote', error.message),
  })

  const totals = useMemo(() => {
    const subtotal = form.lines.reduce(
      (sum, line) => sum + numberValue(line.quantity) * numberValue(line.unitPrice),
      0
    )
    const lineDiscounts = form.lines.reduce(
      (sum, line) => sum + numberValue(line.discountAmount),
      0
    )
    const total = form.lines.reduce((sum, line) => sum + lineTotal(line), 0)
    const tax = total - Math.max(0, subtotal - lineDiscounts)
    const discount = numberValue(form.discountAmount) + lineDiscounts
    const shipping = numberValue(form.shippingAmount)
    return {
      subtotal,
      discount,
      tax,
      shipping,
      grandTotal: subtotal - discount + tax + shipping,
    }
  }, [form.lines, form.discountAmount, form.shippingAmount])

  const busy = mutation.isPending

  const goTo = (target: number) => {
    if (target > step) {
      const message = stepError(step, form)
      if (message) {
        showError('Check this step', message)
        return
      }
    }
    setStep(Math.max(0, Math.min(LAST_STEP, target)))
  }

  const handleSaveDraft = () => {
    const firstError = stepError(0, form) ?? stepError(1, form)
    if (firstError) {
      showError('Check the quote', firstError)
      return
    }
    mutation.mutate({ payload: buildPayload(form, false), send: false })
  }

  const handleSend = () => {
    for (let index = 0; index <= LAST_STEP; index += 1) {
      const message = stepError(index, form)
      if (message) {
        setStep(index)
        showError(`Check step ${index + 1}`, message)
        return
      }
    }
    mutation.mutate({ payload: buildPayload(form, true), send: true })
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={draft ? 'Edit draft quote' : 'Compose quote response'}
      description={`${quote.quote_number ?? 'Quote'} · ${quote.customer_name} · ${quote.organization}`}
      fullScreen
      noPadding
      closeOnBackdropClick={!busy}
    >
      <div className="flex h-full min-h-0 w-full">
        <StepRail
          step={step}
          form={form}
          onSelect={goTo}
          total={totals.grandTotal}
          currency={form.currency}
        />

        <div className="flex min-w-0 flex-1 flex-col">
          {/* Mobile step dots */}
          <div className="flex items-center justify-center gap-2 border-gray-100 border-b px-4 py-3 sm:hidden dark:border-gray-700">
            {STEPS.map((entry, index) => (
              <div
                key={entry.label}
                className={cn(
                  'h-2 w-2 rounded-full',
                  index <= step ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'
                )}
              />
            ))}
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:px-8">
            <p className="mb-4 font-medium text-gray-400 text-xs uppercase tracking-wide sm:hidden">
              Step {step + 1} of {STEPS.length} — {STEPS[step]?.label}
            </p>

            {step === 0 && <OfferStep form={form} update={update} />}
            {step === 1 && <ItemsStep form={form} update={update} />}
            {step === 2 && <LogisticsStep form={form} update={update} />}
            {step === 3 && <PackingStep form={form} update={update} totals={totals} />}
            {step === 4 && <ReviewStep form={form} update={update} totals={totals} quote={quote} />}
          </div>

          <div className="flex flex-col gap-3 border-gray-100 border-t bg-white px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 dark:border-gray-700 dark:bg-gray-800">
            <div className="text-gray-600 text-sm dark:text-gray-300">
              Revision total{' '}
              <span className="font-semibold text-gray-900 dark:text-white">
                {formatMoney(totals.grandTotal, form.currency)}
              </span>
              <span className="ml-2 text-gray-400 text-xs">
                Step {step + 1} of {STEPS.length}
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="ghost" onClick={onClose} disabled={busy}>
                Cancel
              </Button>
              {step > 0 && (
                <Button variant="outline" onClick={() => goTo(step - 1)} disabled={busy}>
                  <ArrowLeft className="mr-2 h-4 w-4" /> Back
                </Button>
              )}
              <Button variant="outline" onClick={handleSaveDraft} disabled={busy}>
                {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Save draft
              </Button>
              {step < LAST_STEP ? (
                <Button onClick={() => goTo(step + 1)} disabled={busy}>
                  Next <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              ) : (
                <Button onClick={handleSend} disabled={busy}>
                  {busy ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="mr-2 h-4 w-4" />
                  )}
                  Send quote
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </Modal>
  )
}

function completedStep(index: number, form: FormState): boolean {
  return stepError(index, form) === null
}

function StepRail({
  step,
  form,
  onSelect,
  total,
  currency,
}: {
  step: number
  form: FormState
  onSelect: (index: number) => void
  total: number
  currency: string
}) {
  return (
    <aside className="hidden w-72 shrink-0 overflow-y-auto border-gray-100 border-r bg-gray-50 p-6 sm:block dark:border-gray-700 dark:bg-gray-800/50">
      <h3 className="mb-6 font-semibold text-gray-900 text-sm dark:text-white">Quote reply</h3>
      <div className="space-y-1">
        {STEPS.map((entry, index) => {
          const Icon = entry.icon
          const active = index === step
          const done = index < step && completedStep(index, form)
          const accessible =
            index <= step ||
            Array.from({ length: index }, (_, earlier) => completedStep(earlier, form)).every(
              Boolean
            )

          return (
            <button
              key={entry.label}
              type="button"
              onClick={() => onSelect(index)}
              disabled={!accessible}
              className={cn(
                'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors',
                active
                  ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300'
                  : accessible
                    ? 'text-gray-600 hover:bg-white dark:text-gray-300 dark:hover:bg-gray-700/50'
                    : 'cursor-not-allowed text-gray-400 dark:text-gray-500'
              )}
            >
              <span
                className={cn(
                  'flex h-7 w-7 shrink-0 items-center justify-center rounded-full',
                  done
                    ? 'bg-emerald-500 text-white'
                    : active
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
                )}
              >
                {done ? <Check className="h-3.5 w-3.5" /> : <Icon className="h-3.5 w-3.5" />}
              </span>
              <span className="min-w-0">
                <span className="block font-medium text-sm">{entry.label}</span>
                <span className="block truncate text-xs opacity-70">{entry.hint}</span>
              </span>
            </button>
          )
        })}
      </div>

      <div className="mt-8 rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-800">
        <p className="text-gray-500 text-xs dark:text-gray-400">Revision total</p>
        <p className="mt-0.5 font-semibold text-gray-900 text-sm dark:text-white">
          {formatMoney(total, currency)}
        </p>
      </div>
    </aside>
  )
}

function OfferStep({ form, update }: { form: FormState; update: Update }) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="lg:col-span-2">
        <Label htmlFor="quote-subject">Subject</Label>
        <Input
          id="quote-subject"
          value={form.subject}
          onChange={(event) => update({ subject: event.target.value })}
          placeholder="Quotation for your inquiry"
        />
      </div>

      <div className="lg:col-span-2">
        <Label htmlFor="quote-message">Message to the customer</Label>
        <Textarea
          id="quote-message"
          rows={6}
          value={form.message}
          onChange={(event) => update({ message: event.target.value })}
        />
        <p className="mt-1 text-gray-500 text-xs dark:text-gray-400">
          The email is a short cover note. The full quotation is attached as a PDF.
        </p>
      </div>

      <div>
        <Label htmlFor="quote-currency">Currency</Label>
        <select
          id="quote-currency"
          value={form.currency}
          onChange={(event) => update({ currency: event.target.value })}
          className="h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-gray-900 text-sm dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
        >
          {CURRENCIES.map((code) => (
            <option key={code} value={code}>
              {code}
            </option>
          ))}
        </select>
      </div>

      <div>
        <Label htmlFor="quote-validity">Valid for (days)</Label>
        <Input
          id="quote-validity"
          type="number"
          min={1}
          max={365}
          value={form.validityDays}
          onChange={(event) => update({ validityDays: event.target.value })}
        />
      </div>

      <div>
        <Label htmlFor="quote-payment-terms">Payment terms</Label>
        <select
          id="quote-payment-terms"
          value={form.paymentTerms}
          onChange={(event) => update({ paymentTerms: event.target.value as PaymentTerms | '' })}
          className="h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-gray-900 text-sm dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
        >
          <option value="">Not specified</option>
          {PAYMENT_TERM_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <Label htmlFor="quote-warranty">Warranty (months)</Label>
        <Input
          id="quote-warranty"
          type="number"
          min={0}
          max={120}
          value={form.warrantyMonths}
          onChange={(event) => update({ warrantyMonths: event.target.value })}
          placeholder="Optional"
        />
      </div>
    </div>
  )
}

function ItemsStep({ form, update }: { form: FormState; update: Update }) {
  const setLines = (lines: LineDraft[]) => update({ lines })
  const updateLine = (id: string, patch: Partial<LineDraft>) => {
    setLines(form.lines.map((line) => (line.id === id ? { ...line, ...patch } : line)))
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="flex items-center gap-2 font-semibold text-gray-900 text-sm dark:text-white">
            <Package className="h-4 w-4" /> Line items
          </h3>
          <p className="mt-0.5 text-gray-500 text-xs dark:text-gray-400">
            Prefilled from the requested product. Adjust quantity and pricing as needed.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setLines([...form.lines, emptyLine()])}>
          <Plus className="mr-1 h-3.5 w-3.5" /> Add line
        </Button>
      </div>

      <div className="space-y-3">
        {form.lines.map((line, index) => (
          <div key={line.id} className="rounded-xl border border-gray-200 p-4 dark:border-gray-700">
            <div className="grid gap-3 lg:grid-cols-12">
              <div className="lg:col-span-4">
                <Label htmlFor={`line-name-${line.id}`}>Item</Label>
                <Input
                  id={`line-name-${line.id}`}
                  value={line.name}
                  onChange={(event) => updateLine(line.id, { name: event.target.value })}
                  placeholder="Product or service"
                />
              </div>
              <div className="lg:col-span-3">
                <Label htmlFor={`line-sku-${line.id}`}>SKU / Part no.</Label>
                <Input
                  id={`line-sku-${line.id}`}
                  value={line.sku}
                  onChange={(event) => updateLine(line.id, { sku: event.target.value })}
                  placeholder="Optional"
                />
              </div>
              <div className="lg:col-span-1">
                <Label htmlFor={`line-qty-${line.id}`}>Qty</Label>
                <Input
                  id={`line-qty-${line.id}`}
                  type="number"
                  min={0}
                  step="any"
                  value={line.quantity}
                  onChange={(event) => updateLine(line.id, { quantity: event.target.value })}
                />
              </div>
              <div className="lg:col-span-2">
                <Label htmlFor={`line-price-${line.id}`}>Unit price</Label>
                <Input
                  id={`line-price-${line.id}`}
                  type="number"
                  min={0}
                  step="any"
                  value={line.unitPrice}
                  onChange={(event) => updateLine(line.id, { unitPrice: event.target.value })}
                />
              </div>
              <div className="lg:col-span-1">
                <Label htmlFor={`line-discount-${line.id}`}>Disc.</Label>
                <Input
                  id={`line-discount-${line.id}`}
                  type="number"
                  min={0}
                  step="any"
                  value={line.discountAmount}
                  onChange={(event) => updateLine(line.id, { discountAmount: event.target.value })}
                />
              </div>
              <div className="lg:col-span-1">
                <Label htmlFor={`line-tax-${line.id}`}>Tax %</Label>
                <Input
                  id={`line-tax-${line.id}`}
                  type="number"
                  min={0}
                  max={100}
                  step="any"
                  value={line.taxRate}
                  onChange={(event) => updateLine(line.id, { taxRate: event.target.value })}
                />
              </div>
            </div>

            <div className="mt-3 flex items-center justify-between">
              <span className="font-semibold text-gray-900 text-sm dark:text-white">
                Line total {formatMoney(lineTotal(line), form.currency)}
              </span>
              <Button
                variant="ghost"
                size="sm"
                aria-label={`Remove line ${index + 1}`}
                onClick={() =>
                  setLines(
                    form.lines.length === 1
                      ? form.lines
                      : form.lines.filter((l) => l.id !== line.id)
                  )
                }
                disabled={form.lines.length === 1}
              >
                <Trash2 className="h-4 w-4 text-red-500" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function LogisticsStep({ form, update }: { form: FormState; update: Update }) {
  const seaOnly =
    INCOTERM_OPTIONS.find((option) => option.value === form.incoterm)?.seaOnly ?? false

  return (
    <div className="space-y-4">
      <div>
        <h3 className="flex items-center gap-2 font-semibold text-gray-900 text-sm dark:text-white">
          <Truck className="h-4 w-4" /> Delivery &amp; customs
        </h3>
        <p className="mt-0.5 text-gray-500 text-xs dark:text-gray-400">
          Incoterms 2020. A named place is required by the standard, e.g. “CIF Karachi Port”.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div>
          <Label htmlFor="quote-incoterm">Incoterm</Label>
          <select
            id="quote-incoterm"
            value={form.incoterm}
            onChange={(event) => update({ incoterm: event.target.value as Incoterm | '' })}
            className="h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-gray-900 text-sm dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
          >
            <option value="">Not specified</option>
            {INCOTERM_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <Label htmlFor="quote-incoterm-location">Named place</Label>
          <Input
            id="quote-incoterm-location"
            value={form.incotermLocation}
            onChange={(event) => update({ incotermLocation: event.target.value })}
            placeholder="e.g. Karachi Port"
          />
        </div>

        <div>
          <Label htmlFor="quote-shipping-method">Shipping method</Label>
          <select
            id="quote-shipping-method"
            value={form.shippingMethod}
            onChange={(event) =>
              update({ shippingMethod: event.target.value as ShippingMethod | '' })
            }
            className="h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-gray-900 text-sm dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
          >
            <option value="">Not specified</option>
            {SHIPPING_METHOD_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <Label htmlFor="quote-origin">Country of origin</Label>
          <Input
            id="quote-origin"
            value={form.countryOfOrigin}
            onChange={(event) => update({ countryOfOrigin: event.target.value })}
            placeholder="e.g. China"
          />
        </div>

        <div>
          <Label htmlFor="quote-hs-code">HS code</Label>
          <Input
            id="quote-hs-code"
            value={form.hsCode}
            onChange={(event) => update({ hsCode: event.target.value })}
            placeholder="Customs tariff code"
          />
        </div>

        <div>
          <Label htmlFor="quote-lead-time">Lead time (days)</Label>
          <Input
            id="quote-lead-time"
            type="number"
            min={0}
            value={form.leadTimeDays}
            onChange={(event) => update({ leadTimeDays: event.target.value })}
            placeholder="Production / dispatch time"
          />
        </div>

        <div>
          <Label htmlFor="quote-ship-date">Estimated dispatch</Label>
          <Input
            id="quote-ship-date"
            type="date"
            value={form.estimatedShipDate}
            onChange={(event) => update({ estimatedShipDate: event.target.value })}
          />
        </div>

        <div className="flex items-end">
          <label className="flex items-center gap-2 text-gray-700 text-sm dark:text-gray-300">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-gray-300 text-blue-600"
              checked={form.partialShipmentAllowed}
              onChange={(event) => update({ partialShipmentAllowed: event.target.checked })}
            />
            Partial shipments allowed
          </label>
        </div>

        {seaOnly && (
          <>
            <div>
              <Label htmlFor="quote-pol">Port of loading</Label>
              <Input
                id="quote-pol"
                value={form.portOfLoading}
                onChange={(event) => update({ portOfLoading: event.target.value })}
                placeholder="e.g. Shenzhen"
              />
            </div>
            <div>
              <Label htmlFor="quote-pod">Port of discharge</Label>
              <Input
                id="quote-pod"
                value={form.portOfDischarge}
                onChange={(event) => update({ portOfDischarge: event.target.value })}
                placeholder="e.g. Karachi"
              />
            </div>
          </>
        )}

        <div className="lg:col-span-2">
          <Label htmlFor="quote-shipping-notes">Shipping notes</Label>
          <Textarea
            id="quote-shipping-notes"
            rows={3}
            value={form.shippingNotes}
            onChange={(event) => update({ shippingNotes: event.target.value })}
            placeholder="Handling instructions, delivery window, documentation…"
          />
        </div>
      </div>
    </div>
  )
}

function PackingStep({
  form,
  update,
  totals,
}: {
  form: FormState
  update: Update
  totals: { subtotal: number; discount: number; tax: number; shipping: number; grandTotal: number }
}) {
  return (
    <div className="grid gap-6 lg:grid-cols-5">
      <div className="space-y-4 lg:col-span-3">
        <div>
          <h3 className="font-semibold text-gray-900 text-sm dark:text-white">Packing details</h3>
          <p className="mt-0.5 text-gray-500 text-xs dark:text-gray-400">
            Shown on the quotation and used by the warehouse when the order is placed.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor="quote-packages">Packages</Label>
            <Input
              id="quote-packages"
              type="number"
              min={0}
              value={form.packageCount}
              onChange={(event) => update({ packageCount: event.target.value })}
              placeholder="e.g. 4"
            />
          </div>
          <div>
            <Label htmlFor="quote-dimensions">Dimensions (L × W × H cm)</Label>
            <Input
              id="quote-dimensions"
              value={form.packageDimensions}
              onChange={(event) => update({ packageDimensions: event.target.value })}
              placeholder="e.g. 40 × 30 × 20"
            />
          </div>
          <div>
            <Label htmlFor="quote-gross-weight">Gross weight (kg)</Label>
            <Input
              id="quote-gross-weight"
              type="number"
              min={0}
              step="any"
              value={form.grossWeightKg}
              onChange={(event) => update({ grossWeightKg: event.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="quote-net-weight">Net weight (kg)</Label>
            <Input
              id="quote-net-weight"
              type="number"
              min={0}
              step="any"
              value={form.netWeightKg}
              onChange={(event) => update({ netWeightKg: event.target.value })}
            />
          </div>
        </div>

        <div>
          <Label htmlFor="quote-packaging-notes">Packaging notes</Label>
          <Textarea
            id="quote-packaging-notes"
            rows={3}
            value={form.packagingNotes}
            onChange={(event) => update({ packagingNotes: event.target.value })}
            placeholder="Anti-static bags, foam inserts, palletised…"
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor="quote-order-discount">Order discount</Label>
            <Input
              id="quote-order-discount"
              type="number"
              min={0}
              step="any"
              value={form.discountAmount}
              onChange={(event) => update({ discountAmount: event.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="quote-shipping-amount">Shipping / freight</Label>
            <Input
              id="quote-shipping-amount"
              type="number"
              min={0}
              step="any"
              value={form.shippingAmount}
              onChange={(event) => update({ shippingAmount: event.target.value })}
            />
          </div>
        </div>
      </div>

      <div className="h-fit space-y-2 rounded-xl bg-gray-50 p-5 lg:col-span-2 dark:bg-gray-900/40">
        <h3 className="mb-1 font-semibold text-gray-900 text-sm dark:text-white">Running totals</h3>
        <SummaryRow label="Subtotal" value={formatMoney(totals.subtotal, form.currency)} />
        <SummaryRow label="Discounts" value={`− ${formatMoney(totals.discount, form.currency)}`} />
        <SummaryRow label="Tax" value={formatMoney(totals.tax, form.currency)} />
        <SummaryRow label="Shipping" value={formatMoney(totals.shipping, form.currency)} />
        <div className="flex items-center justify-between border-gray-200 border-t pt-2 dark:border-gray-700">
          <span className="font-semibold text-gray-900 text-sm dark:text-white">Total</span>
          <span className="font-bold text-gray-900 text-lg dark:text-white">
            {formatMoney(totals.grandTotal, form.currency)}
          </span>
        </div>
        <p className="text-gray-500 text-xs dark:text-gray-400">
          Totals are recalculated on the server when the revision is saved.
        </p>
      </div>
    </div>
  )
}

function ReviewStep({
  form,
  update,
  totals,
  quote,
}: {
  form: FormState
  update: Update
  totals: { subtotal: number; discount: number; tax: number; shipping: number; grandTotal: number }
  quote: QuoteDetail
}) {
  const values = reviewValues(form)

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <SummaryCard title="Offer">
          <Field label="Customer" value={quote.customer_name} />
          <Field label="Subject" value={form.subject || '—'} />
          <Field label="Currency" value={form.currency} />
          <Field label="Validity" value={values.validity} />
          <Field label="Payment" value={values.payment} />
          <Field label="Warranty" value={values.warranty} />
        </SummaryCard>

        <SummaryCard title="Items & totals">
          <Field label="Line items" value={String(form.lines.length)} />
          <Field label="Subtotal" value={formatMoney(totals.subtotal, form.currency)} />
          <Field label="Discounts" value={formatMoney(totals.discount, form.currency)} />
          <Field label="Tax" value={formatMoney(totals.tax, form.currency)} />
          <Field label="Shipping" value={formatMoney(totals.shipping, form.currency)} />
          <Field label="Total" value={formatMoney(totals.grandTotal, form.currency)} strong />
        </SummaryCard>

        <SummaryCard title="Logistics">
          <Field label="Incoterm" value={values.incoterm} />
          <Field label="Named place" value={form.incotermLocation || '—'} />
          <Field label="Shipping" value={values.shipping} />
          <Field label="Origin" value={form.countryOfOrigin || '—'} />
          <Field label="HS code" value={form.hsCode || '—'} />
          <Field label="Lead time" value={values.leadTime} />
        </SummaryCard>

        <SummaryCard title="Packing">
          <Field label="Packages" value={form.packageCount || '—'} />
          <Field label="Gross / net" value={values.weight} />
          <Field label="Dimensions" value={form.packageDimensions || '—'} />
          <Field label="Partial shipments" value={values.partial} />
        </SummaryCard>
      </div>

      <div>
        <Label htmlFor="quote-terms">Terms &amp; conditions</Label>
        <Textarea
          id="quote-terms"
          rows={4}
          value={form.terms}
          onChange={(event) => update({ terms: event.target.value })}
          placeholder="Warranty, returns, force majeure, payment conditions…"
        />
      </div>

      <div className="flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4 text-blue-800 text-sm dark:border-blue-900 dark:bg-blue-900/20 dark:text-blue-200">
        <FileText className="mt-0.5 h-4 w-4 shrink-0" />
        <p>
          The customer receives a short cover email and the full quotation as an attached PDF. A
          timeline entry records that revision {quote.responses.length + 1} was sent.
        </p>
      </div>
    </div>
  )
}

function reviewValues(form: FormState) {
  const incoterm = INCOTERM_OPTIONS.find((option) => option.value === form.incoterm)
  const payment = PAYMENT_TERM_OPTIONS.find((option) => option.value === form.paymentTerms)
  const shipping = SHIPPING_METHOD_OPTIONS.find((option) => option.value === form.shippingMethod)

  return {
    validity: `${form.validityDays || '—'} days`,
    payment: payment?.label ?? 'Not specified',
    warranty: form.warrantyMonths ? `${form.warrantyMonths} months` : 'Not specified',
    incoterm: incoterm?.label ?? 'Not specified',
    shipping: shipping?.label ?? 'Not specified',
    leadTime: form.leadTimeDays ? `${form.leadTimeDays} days` : '—',
    weight:
      form.grossWeightKg || form.netWeightKg
        ? `${form.grossWeightKg || '—'} / ${form.netWeightKg || '—'} kg`
        : '—',
    partial: form.partialShipmentAllowed ? 'Allowed' : 'Not allowed',
  }
}

function SummaryCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900/40">
      <h3 className="mb-2 font-semibold text-gray-900 text-sm dark:text-white">{title}</h3>
      <div className="space-y-1.5">{children}</div>
    </section>
  )
}

function Field({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-3 text-sm">
      <span className="text-gray-500 dark:text-gray-400">{label}</span>
      <span
        className={cn(
          'max-w-[60%] text-right text-gray-900 dark:text-white',
          strong ? 'font-bold' : 'font-medium'
        )}
      >
        {value}
      </span>
    </div>
  )
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-gray-600 dark:text-gray-300">{label}</span>
      <span className="font-medium text-gray-900 dark:text-white">{value}</span>
    </div>
  )
}
