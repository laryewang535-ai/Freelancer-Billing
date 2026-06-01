import { auth } from "../../../../auth";
import { redirect } from "next/navigation";
import {
  getAnalyticsOverview,
  getRevenueTrend,
  getClientsRanking,
} from "@/lib/services/analytics.service";
import { DashboardClient } from "@/components/dashboard/dashboard-client";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const userId = session.user.id;
  const [overview, revenueTrend, topClients] = await Promise.all([
    getAnalyticsOverview(userId),
    getRevenueTrend(userId, 6),
    getClientsRanking(userId, 5),
  ]);

  return (
    <>
      <h1 className="text-2xl font-semibold text-slate-900">Dashboard</h1>
      <p className="mt-2 text-slate-600">Revenue and invoice overview</p>
      <div className="mt-8">
        <DashboardClient
          overview={{
            ...overview,
            recentInvoices: overview.recentInvoices.map((inv) => ({
              ...inv,
              createdAt: inv.createdAt.toISOString(),
            })),
          }}
          revenueTrend={revenueTrend}
          topClients={topClients}
        />
      </div>
    </>
  );
}
