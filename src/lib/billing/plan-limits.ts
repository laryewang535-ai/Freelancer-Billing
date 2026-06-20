import type { Plan } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getEffectivePlan } from "@/lib/services/manual-entitlement.service";

/** 各计划限额 */
export const PLAN_LIMITS = {
  FREE: {
    invoicesPerMonth: 10,
    templates: 1,
  },
  PRO: {
    invoicesPerMonth: Infinity,
    templates: 4,
  },
  BUSINESS: {
    invoicesPerMonth: Infinity,
    templates: 4,
  },
} as const;

/** 获取用户当前计划 */
export async function getUserPlan(userId: string): Promise<Plan> {
  return getEffectivePlan(userId);
}

/** 统计当月已创建 Invoice 数量 */
export async function countInvoicesThisMonth(userId: string): Promise<number> {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  return prisma.invoice.count({
    where: {
      userId,
      deletedAt: null,
      createdAt: { gte: monthStart },
    },
  });
}

/** 校验是否可创建新 Invoice */
export async function assertCanCreateInvoice(userId: string): Promise<void> {
  const plan = await getUserPlan(userId);
  const limit = PLAN_LIMITS[plan].invoicesPerMonth;

  if (limit === Infinity) return;

  const count = await countInvoicesThisMonth(userId);
  if (count >= limit) {
    throw new Error("INVOICE_LIMIT_REACHED");
  }
}
