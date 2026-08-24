import { Banknote, ArrowDownCircle, ArrowUpCircle } from "lucide-react";
import type { Order } from "@/api/orders";

interface Props {
  order: Order;
}

function PaymentBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    paid: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
    pending: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
    authorized: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
    failed: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
    refunded: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
  };
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${styles[status] ?? "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300"}`}>
      {status}
    </span>
  );
}

export function PaymentsTab({ order }: Props) {
  const payments = order.payment ?? [];

  if (payments.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-gray-200 p-8 text-center text-sm text-gray-400 dark:border-gray-700">
        No payment records for this order.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {payments.map((payment) => (
        <div key={payment.uuid} className="rounded-xl border border-gray-200 p-5 dark:border-gray-700">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300">
                <Banknote className="h-5 w-5" />
              </span>
              <div>
                <p className="text-sm font-semibold text-gray-900 dark:text-white">{payment.payment_method_label}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {payment.currency} {Number(payment.amount).toLocaleString()}
                  {payment.transaction_reference ? ` · Ref: ${payment.transaction_reference}` : ""}
                </p>
              </div>
            </div>
            <PaymentBadge status={payment.status} />
          </div>

          {(payment.transactions?.length ?? 0) > 0 && (
            <div className="mt-4 border-t border-gray-100 pt-3 dark:border-gray-800">
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">Transaction ledger</h4>
              <div className="space-y-1.5">
                {payment.transactions?.map((transaction) => (
                  <div key={transaction.uuid} className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2 text-sm dark:bg-gray-800/60">
                    <div className="flex items-center gap-2">
                      {transaction.amount >= 0 ? (
                        <ArrowDownCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <ArrowUpCircle className="h-4 w-4 text-red-500" />
                      )}
                      <span className="font-medium capitalize text-gray-700 dark:text-gray-300">{transaction.type}</span>
                      {transaction.gateway_transaction_id && (
                        <span className="text-xs text-gray-400">{transaction.gateway_transaction_id}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      {transaction.fee_amount != null && (
                        <span className="text-xs text-gray-400">fee {transaction.currency} {Number(transaction.fee_amount).toLocaleString()}</span>
                      )}
                      <span className="font-semibold text-gray-900 dark:text-white">
                        {transaction.currency} {Number(transaction.amount).toLocaleString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
