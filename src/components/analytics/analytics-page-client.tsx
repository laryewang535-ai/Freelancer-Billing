"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { formatMoney } from "@/lib/utils/format";
import { getCountryName } from "@/lib/constants/countries";

const COLORS = ["#2563EB", "#16A34A", "#F59E0B", "#DC2626", "#8B5CF6", "#64748B"];

type AnalyticsPageClientProps = {
  overview: {
    revenueThisMonth: number;
    unpaidTotal: number;
    invoiceCount: number;
    overdueCount: number;
  };
  revenueTrend: Array<{ month: string; revenue: number }>;
  clientsRanking: Array<{ companyName: string; revenue: number; invoiceCount: number }>;
  countryDistribution: Array<{ country: string; count: number }>;
};

export function AnalyticsPageClient({
  overview,
  revenueTrend,
  clientsRanking,
  countryDistribution,
}: AnalyticsPageClientProps) {
  const countryChart = countryDistribution.map((c) => ({
    name: getCountryName(c.country),
    value: c.count,
  }));

  return (
    <>
      <h1 className="text-2xl font-semibold text-slate-900">Analytics</h1>
      <p className="mt-1 text-sm text-slate-600">Revenue and client analytics</p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Revenue this month", value: formatMoney(overview.revenueThisMonth) },
          { label: "Outstanding", value: formatMoney(overview.unpaidTotal) },
          { label: "Total invoices", value: String(overview.invoiceCount) },
          { label: "Overdue", value: String(overview.overdueCount) },
        ].map((item) => (
          <div
            key={item.label}
            className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <p className="text-sm text-slate-500">{item.label}</p>
            <p className="mt-2 text-xl font-semibold">{item.value}</p>
          </div>
        ))}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="font-semibold">Revenue trend (6 months)</h2>
          <div className="mt-4 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={revenueTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v) => formatMoney(Number(v))} />
                <Bar dataKey="revenue" fill="#2563EB" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="font-semibold">Client country distribution</h2>
          <div className="mt-4 h-72">
            {countryChart.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={countryChart}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    label
                  >
                    {countryChart.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="py-20 text-center text-sm text-slate-500">No client data yet</p>
            )}
          </div>
        </div>
      </div>

      <div className="mt-8 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="font-semibold">Top clients by revenue</h2>
        <table className="mt-4 min-w-full text-sm">
          <thead className="text-left text-slate-500">
            <tr>
              <th className="py-2 font-medium">#</th>
              <th className="py-2 font-medium">Company</th>
              <th className="py-2 font-medium text-right">Revenue</th>
              <th className="py-2 font-medium text-right">Invoices</th>
            </tr>
          </thead>
          <tbody>
            {clientsRanking.map((c, i) => (
              <tr key={c.companyName} className="border-t border-slate-50">
                <td className="py-2">{i + 1}</td>
                <td className="py-2 font-medium">{c.companyName}</td>
                <td className="py-2 text-right">{formatMoney(c.revenue)}</td>
                <td className="py-2 text-right">{c.invoiceCount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
