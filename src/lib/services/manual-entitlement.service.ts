import type { Plan } from "@prisma/client";
import { prisma } from "@/lib/db";

/** 返回有效的人工权益；过期权益在读取时自动标记为已结束。 */
export async function getActiveManualEntitlement(userId: string) {
  const entitlement = await prisma.manualEntitlement.findUnique({
    where: { userId },
  });

  if (!entitlement || entitlement.plan === "FREE" || entitlement.status !== "ACTIVE") {
    return null;
  }

  if (entitlement.currentPeriodEnd && entitlement.currentPeriodEnd <= new Date()) {
    await prisma.manualEntitlement.update({
      where: { userId },
      data: {
        plan: "FREE",
        status: "CANCELED",
        cancelAtPeriodEnd: false,
        canceledAt: new Date(),
      },
    });
    return null;
  }

  return entitlement;
}

/** 人工权益优先于订阅提供商；人工权益过期后自然回退。 */
export async function getEffectivePlan(userId: string): Promise<Plan> {
  const manual = await getActiveManualEntitlement(userId);
  if (manual) return manual.plan;

  const subscription = await prisma.subscription.findUnique({
    where: { userId },
    select: { plan: true },
  });
  return subscription?.plan ?? "FREE";
}
