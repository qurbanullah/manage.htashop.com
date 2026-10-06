import { Banknote, FileText, MapPin } from 'lucide-react'
import type { Order } from '@/api/orders'

interface Props {
  order: Order
}

function addressLines(address: Order['shipping_address']) {
  if (!address) return []
  return [
    address.contact_name,
    [address.address_line_1, address.address_line_2].filter(Boolean).join(', '),
    [address.city, address.state, address.postal_code].filter(Boolean).join(', '),
    address.country,
  ].filter(Boolean) as string[]
}

export function OverviewTab({ order }: Props) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Customer */}
      <div className="rounded-xl border border-gray-200 p-5 dark:border-gray-700">
        <h3 className="font-semibold text-gray-900 text-sm dark:text-white">Customer</h3>
        <div className="mt-3 space-y-1 text-gray-600 text-sm dark:text-gray-300">
          <p className="font-medium text-gray-900 dark:text-white">{order.customer_name || '—'}</p>
          {order.customer_email && <p>{order.customer_email}</p>}
          {order.customer_phone && <p>{order.customer_phone}</p>}
        </div>
      </div>

      {/* Totals */}
      <div className="rounded-xl border border-gray-200 p-5 dark:border-gray-700">
        <h3 className="font-semibold text-gray-900 text-sm dark:text-white">Totals</h3>
        <div className="mt-3 space-y-2 text-sm">
          <div className="flex justify-between text-gray-600 dark:text-gray-300">
            <span>Subtotal</span>
            <span>
              {order.currency} {Number(order.subtotal).toLocaleString()}
            </span>
          </div>
          {order.shipping_fee > 0 && (
            <div className="flex justify-between text-gray-600 dark:text-gray-300">
              <span>Shipping</span>
              <span>
                {order.currency} {Number(order.shipping_fee).toLocaleString()}
              </span>
            </div>
          )}
          {order.tax > 0 && (
            <div className="flex justify-between text-gray-600 dark:text-gray-300">
              <span>Tax</span>
              <span>
                {order.currency} {Number(order.tax).toLocaleString()}
              </span>
            </div>
          )}
          {order.discount > 0 && (
            <div className="flex justify-between text-gray-600 dark:text-gray-300">
              <span>Discount</span>
              <span>
                -{order.currency} {Number(order.discount).toLocaleString()}
              </span>
            </div>
          )}
          <div className="flex justify-between border-gray-100 border-t pt-2 font-bold text-base text-gray-900 dark:border-gray-700 dark:text-white">
            <span>Total</span>
            <span>
              {order.currency} {Number(order.total_amount).toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* Shipping */}
      <div className="rounded-xl border border-gray-200 p-5 dark:border-gray-700">
        <h3 className="flex items-center gap-2 font-semibold text-gray-900 text-sm dark:text-white">
          <MapPin className="h-4 w-4 text-gray-400" />
          Shipping address
        </h3>
        <div className="mt-3 space-y-0.5 text-gray-600 text-sm dark:text-gray-300">
          {addressLines(order.shipping_address).map((line) => (
            <p key={line}>{line}</p>
          ))}
        </div>
      </div>

      {/* Billing */}
      <div className="rounded-xl border border-gray-200 p-5 dark:border-gray-700">
        <h3 className="flex items-center gap-2 font-semibold text-gray-900 text-sm dark:text-white">
          <Banknote className="h-4 w-4 text-gray-400" />
          Billing address
        </h3>
        <div className="mt-3 space-y-0.5 text-gray-600 text-sm dark:text-gray-300">
          {addressLines(order.billing_address).map((line) => (
            <p key={line}>{line}</p>
          ))}
        </div>
      </div>

      {/* Notes */}
      {order.notes && (
        <div className="rounded-xl border border-gray-200 p-5 lg:col-span-2 dark:border-gray-700">
          <h3 className="flex items-center gap-2 font-semibold text-gray-900 text-sm dark:text-white">
            <FileText className="h-4 w-4 text-gray-400" />
            Order notes
          </h3>
          <p className="mt-2 text-gray-600 text-sm dark:text-gray-300">{order.notes}</p>
        </div>
      )}
    </div>
  )
}
