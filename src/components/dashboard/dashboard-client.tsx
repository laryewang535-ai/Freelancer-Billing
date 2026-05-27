"use client";

import Link from "next/link";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { InvoiceStatusBadge } from "@/components/invoices/invoice-status-badge";
import { formatMoney, formatDate } from "@/lib/utils/format";
import type { InvoiceStatus } from "@prisma/client";

type DashboardClientProps = {
  overview: {
    revenueThisMonth: number;
    unpaidTotal: number;
    invoiceCount: number;
    overdueCount: number;
    recentInvoices: Array<{
      id: string;
      invoiceNumber: string;
      clientName: string;
      totalAmount: number;
      currency: string;
      status: InvoiceStatus;
      createdAt: string;
    }>;
  };
  revenueTrend: Array<{ month: string; revenue: number }>;
  topClients: Array<{
    companyName: string;
    revenue: number;
    invoiceCount: number;
  }>;
};

export function DashboardClient({
  overview,
  revenueTrend,
  topClients,
}: DashboardClientProps) {
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "本月收入", value: formatMoney(overview.revenueThisMonth) },
          { label: "待收款", value: formatMoney(overview.unpaidTotal) },
          { label: "Invoice 数", value: String(overview.invoiceCount) },
          { label: "逾期数", value: String(overview.overdueCount) },
        ].map((item) => (
          <div
            key={item.label}
            className="app-card p-5 transition hover:shadow-md hover:shadow-slate-200/60"
          >
            <p className="text-sm text-slate-500">{item.label}</p>
            <p className="mt-2 text-2xl font-semibold">{item.value}</p>
          </div>
        ))}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <div className="app-card p-6">
          <h2 className="font-semibold text-slate-900">收入趋势</h2>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={revenueTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip formatter={(v) => formatMoney(Number(v))} />
                <Bar dataKey="revenue" fill="#2563EB" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="app-card p-6">
          <h2 className="font-semibold text-slate-900">Top Clients</h2>
          <ul className="mt-4 space-y-3">
            {topClients.length === 0 ? (
              <li className="text-sm text-slate-500">暂无数据</li>
            ) : (
              topClients.slice(0, 5).map((c) => (
                <li key={c.companyName} className="flex justify-between text-sm">
                  <span className="font-medium">{c.companyName}</span>
                  <span className="text-slate-600">
                    {formatMoney(c.revenue)} · {c.invoiceCount} inv
                  </span>
                </li>
              ))
            )}
          </ul>
        </div>
      </div>

      <div className="app-card mt-8 overflow-hidden">
        <h2 className="border-b border-slate-100 px-6 py-4 font-semibold text-slate-900">
          最近 Invoice
        </h2>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="text-left text-slate-500">
              <tr>
                <th className="px-6 py-3 font-medium">Invoice No</th>
                <th className="px-6 py-3 font-medium">Client</th>
                <th className="px-6 py-3 font-medium text-right">Amount</th>
                <th className="px-6 py-3 font-medium">Status</th>
                <th className="px-6 py-3 font-medium">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {overview.recentInvoices.map((inv) => (
                <tr key={inv.id} className="hover:bg-slate-50">
                  <td className="px-6 py-3">
                    <Link
                      href={`/invoices/${inv.id}`}
                      className="font-medium text-primary hover:underline"
                    >
                      {inv.invoiceNumber}
                    </Link>
                  </td>
                  <td className="px-6 py-3">{inv.clientName}</td>
                  <td className="px-6 py-3 text-right">
                    {formatMoney(inv.totalAmount, inv.currency)}
                  </td>
                  <td className="px-6 py-3">
                    <InvoiceStatusBadge status={inv.status} />
                  </td>
                  <td className="px-6 py-3 text-slate-600">
                    {formatDate(inv.createdAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
