import type { QuoteResponse } from '@/api/quotes'

type Row = [label: string, value: string]

function commercialRows(response: QuoteResponse): Row[] {
  const rows: Row[] = []

  if (response.incoterm) {
    rows.push([
      'Incoterm',
      response.incoterm_location
        ? `${response.incoterm} — ${response.incoterm_location}`
        : response.incoterm,
    ])
  }
  if (response.payment_terms_label) rows.push(['Payment', response.payment_terms_label])
  if (response.lead_time_days != null) rows.push(['Lead time', `${response.lead_time_days} days`])
  if (response.estimated_ship_date) {
    rows.push(['Dispatch', new Date(response.estimated_ship_date).toLocaleDateString()])
  }
  if (response.warranty_months) rows.push(['Warranty', `${response.warranty_months} months`])

  return rows
}

function logisticsRows(response: QuoteResponse): Row[] {
  const rows: Row[] = []

  if (response.shipping_method_label) rows.push(['Shipping', response.shipping_method_label])
  if (response.country_of_origin) rows.push(['Origin', response.country_of_origin])
  if (response.hs_code) rows.push(['HS code', response.hs_code])

  const weights: string[] = []
  if (response.gross_weight_kg != null) weights.push(`${response.gross_weight_kg} kg gross`)
  if (response.net_weight_kg != null) weights.push(`${response.net_weight_kg} kg net`)
  if (weights.length > 0) rows.push(['Weight', weights.join(' · ')])

  if (response.package_count != null) rows.push(['Packages', String(response.package_count)])
  if (response.package_dimensions) rows.push(['Dimensions', response.package_dimensions])
  if (response.partial_shipment_allowed === false) {
    rows.push(['Partial shipments', 'Not allowed'])
  }

  return rows
}

/**
 * Compact commercial + logistics summary for a sent revision. Rows only render
 * when the field is present, so quotes without logistics stay uncluttered.
 */
export function QuoteLogisticsSummary({ response }: { response: QuoteResponse }) {
  const rows = [...commercialRows(response), ...logisticsRows(response)]

  if (rows.length === 0) return null

  return (
    <div className="mt-4 rounded-lg bg-gray-50 p-3 dark:bg-gray-900/40">
      <p className="mb-2 font-medium text-gray-500 text-xs uppercase tracking-wide dark:text-gray-400">
        Commercial &amp; logistics
      </p>
      <dl className="grid gap-x-6 gap-y-1 text-xs sm:grid-cols-2">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-start justify-between gap-3">
            <dt className="text-gray-500 dark:text-gray-400">{label}</dt>
            <dd className="text-right font-medium text-gray-800 dark:text-gray-200">{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}
