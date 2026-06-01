"use client";

import { formatDate, formatMoney } from "@/lib/utils/format";

type PaymentItem = {
  id: string;
  invoiceNumber: string;
  clientName: string;
  amount: number;
  fee: number;
  netAmount: number;
  currency: string;
  paymentMethod: string;
  paidAt: string;
  notes: string | null;
};

export function PaymentsPageClient({
  initialItems,
}: {
  initialItems: PaymentItem[];
}) {
  return (
    <>
      <h1 className="text-2xl font-semibold text-slate-900">Payments</h1>
      <p className="mt-1 text-sm text-slate-600">Payment records</p>

      <div className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-left text-slate-600">
            <tr>
              <th className="px-4 py-3 font-medium">Invoice</th>
              <th className="px-4 py-3 font-medium">Client</th>
              <th className="px-4 py-3 font-medium text-right">Amount</th>
              <th className="px-4 py-3 font-medium text-right">Net</th>
              <th className="px-4 py-3 font-medium">Method</th>
              <th className="px-4 py-3 font-medium">Paid At</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {initialItems.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-slate-500">
                  No payment records yet. Use Mark Paid on an invoice detail page to record one.
                </td>
              </tr>
            ) : (
              initialItems.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium">{p.invoiceNumber}</td>
                  <td className="px-4 py-3">{p.clientName}</td>
                  <td className="px-4 py-3 text-right">
                    {formatMoney(p.amount, p.currency)}
                  </td>
                  <td className="px-4 py-3 text-right text-green-700">
                    {formatMoney(p.netAmount, p.currency)}
                  </td>
                  <td className="px-4 py-3">{p.paymentMethod}</td>
                  <td className="px-4 py-3 text-slate-600">{formatDate(p.paidAt)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
