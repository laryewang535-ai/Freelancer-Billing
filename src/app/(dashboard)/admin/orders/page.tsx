import { redirect } from "next/navigation";
import { auth } from "../../../../../auth";
import { isAdminEmail } from "@/lib/auth/admin";
import { listExternalOrders } from "@/lib/services/external-order.service";
import { AdminOrdersClient } from "@/components/admin/admin-orders-client";

export default async function AdminOrdersPage() {
  const session = await auth();
  if (!session?.user?.email || !isAdminEmail(session.user.email)) {
    redirect("/dashboard");
  }

  let orders: Awaited<ReturnType<typeof listExternalOrders>> = [];
  let databaseSetupRequired = false;
  let databaseSetupError: string | null = null;
  try {
    orders = await listExternalOrders();
  } catch (error) {
    // A newly provisioned database has no external-order tables until its
    // first migration completes. Keep the admin shell usable in that state.
    const prismaError = error as { code?: unknown; message?: unknown };
    console.error("[admin orders list]", {
      code: prismaError.code ?? null,
      message: prismaError.message ?? String(error),
    });
    orders = [];
    databaseSetupRequired = true;
    databaseSetupError =
      typeof prismaError.message === "string" ? prismaError.message : String(error);
  }
  const initialOrders = orders.map((order) => ({
    ...order,
    amount: order.amount?.toString() ?? null,
    purchasedAt: order.purchasedAt?.toISOString() ?? null,
    periodStart: order.periodStart?.toISOString() ?? null,
    periodEnd: order.periodEnd?.toISOString() ?? null,
    processedAt: order.processedAt?.toISOString() ?? null,
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
    actions: order.actions.map((action) => ({
      ...action,
      createdAt: action.createdAt.toISOString(),
    })),
  }));

  return (
    <AdminOrdersClient
      initialOrders={initialOrders}
      databaseSetupRequired={databaseSetupRequired}
      databaseSetupError={databaseSetupError}
    />
  );
}
