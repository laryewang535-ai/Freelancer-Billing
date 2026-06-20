import type {
  ExternalOrderActionType,
  ExternalOrderProvider,
  ExternalOrderStatus,
  Plan,
  Prisma,
} from "@prisma/client";
import { prisma } from "@/lib/db";

type CreateExternalOrderInput = {
  userEmail: string;
  provider: ExternalOrderProvider;
  externalOrderId: string;
  purchaserEmail?: string | null;
  productName?: string | null;
  plan: Exclude<Plan, "FREE">;
  periodMonths: number;
  amount?: number | null;
  currency?: string | null;
  purchasedAt?: Date | null;
  notes?: string | null;
};

type ProcessExternalOrderInput = {
  orderId: string;
  action: ExternalOrderActionType;
  performedBy: string;
  note?: string | null;
};

function addMonths(date: Date, months: number) {
  const result = new Date(date);
  const day = result.getUTCDate();
  result.setUTCDate(1);
  result.setUTCMonth(result.getUTCMonth() + months);
  const lastDay = new Date(
    Date.UTC(result.getUTCFullYear(), result.getUTCMonth() + 1, 0)
  ).getUTCDate();
  result.setUTCDate(Math.min(day, lastDay));
  return result;
}

function actionStatus(action: ExternalOrderActionType): ExternalOrderStatus {
  const status: Record<ExternalOrderActionType, ExternalOrderStatus> = {
    ACTIVATED: "ACTIVATED",
    RENEWED: "RENEWED",
    CANCEL_AT_PERIOD_END: "CANCEL_AT_PERIOD_END",
    REFUNDED: "REFUNDED",
    REVOKED: "REVOKED",
  };
  return status[action];
}

export async function listExternalOrders() {
  return prisma.externalOrder.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      user: { select: { email: true, name: true } },
      actions: { orderBy: { createdAt: "desc" } },
    },
  });
}

export async function createExternalOrder(input: CreateExternalOrderInput) {
  const user = await prisma.user.findUnique({
    where: { email: input.userEmail.toLowerCase() },
    select: { id: true },
  });
  if (!user) throw new Error("USER_NOT_FOUND");

  return prisma.externalOrder.create({
    data: {
      userId: user.id,
      provider: input.provider,
      externalOrderId: input.externalOrderId.trim(),
      purchaserEmail: input.purchaserEmail?.trim().toLowerCase() || null,
      productName: input.productName?.trim() || null,
      plan: input.plan,
      periodMonths: input.periodMonths,
      amount: input.amount ?? null,
      currency: input.currency?.trim().toUpperCase() || null,
      purchasedAt: input.purchasedAt ?? null,
      notes: input.notes?.trim() || null,
    },
    include: { user: { select: { email: true, name: true } }, actions: true },
  });
}

export async function processExternalOrder(input: ProcessExternalOrderInput) {
  return prisma.$transaction(async (tx) => {
    const order = await tx.externalOrder.findUnique({
      where: { id: input.orderId },
    });
    if (!order) throw new Error("ORDER_NOT_FOUND");

    const now = new Date();
    const entitlement = await tx.manualEntitlement.findUnique({
      where: { userId: order.userId },
    });

    let orderData: Prisma.ExternalOrderUpdateInput = {
      status: actionStatus(input.action),
      processedAt: now,
      processedBy: input.performedBy,
    };

    if (input.action === "ACTIVATED" || input.action === "RENEWED") {
      const start =
        input.action === "RENEWED" &&
        entitlement?.currentPeriodEnd &&
        entitlement.currentPeriodEnd > now
          ? entitlement.currentPeriodEnd
          : order.purchasedAt ?? now;
      const end = addMonths(start, order.periodMonths);

      await tx.manualEntitlement.upsert({
        where: { userId: order.userId },
        update: {
          sourceOrderId: order.id,
          plan: order.plan,
          status: "ACTIVE",
          currentPeriodStart: start,
          currentPeriodEnd: end,
          cancelAtPeriodEnd: false,
          canceledAt: null,
        },
        create: {
          userId: order.userId,
          sourceOrderId: order.id,
          plan: order.plan,
          status: "ACTIVE",
          currentPeriodStart: start,
          currentPeriodEnd: end,
        },
      });
      orderData = { ...orderData, periodStart: start, periodEnd: end };
    }

    if (input.action === "CANCEL_AT_PERIOD_END" && entitlement?.sourceOrderId === order.id) {
      await tx.manualEntitlement.update({
        where: { userId: order.userId },
        data: { cancelAtPeriodEnd: true, canceledAt: now },
      });
    }

    if (
      (input.action === "REFUNDED" || input.action === "REVOKED") &&
      entitlement?.sourceOrderId === order.id
    ) {
      await tx.manualEntitlement.update({
        where: { userId: order.userId },
        data: {
          plan: "FREE",
          status: "CANCELED",
          currentPeriodEnd: now,
          cancelAtPeriodEnd: false,
          canceledAt: now,
        },
      });
    }

    const updatedOrder = await tx.externalOrder.update({
      where: { id: order.id },
      data: orderData,
    });
    await tx.externalOrderAction.create({
      data: {
        externalOrderId: order.id,
        type: input.action,
        note: input.note?.trim() || null,
        performedBy: input.performedBy,
      },
    });

    return updatedOrder;
  });
}
