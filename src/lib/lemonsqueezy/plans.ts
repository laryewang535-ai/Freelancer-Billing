import type { Plan } from "@prisma/client";

export type BillablePlan = "PRO" | "BUSINESS";

export const PLAN_CATALOG: Record<
  BillablePlan,
  {
    name: string;
    priceLabel: string;
    variantEnv: "LEMONSQUEEZY_VARIANT_PRO" | "LEMONSQUEEZY_VARIANT_BUSINESS";
    features: string[];
  }
> = {
  PRO: {
    name: "Pro",
    priceLabel: "$9/month",
    variantEnv: "LEMONSQUEEZY_VARIANT_PRO",
    features: [
      "Unlimited invoices",
      "AI invoice generation",
      "Automatic reminders",
      "Analytics",
      "All templates",
    ],
  },
  BUSINESS: {
    name: "Business",
    priceLabel: "$19.90/month",
    variantEnv: "LEMONSQUEEZY_VARIANT_BUSINESS",
    features: [
      "Everything in Pro",
      "Team collaboration (coming soon)",
      "API access (coming soon)",
    ],
  },
};

/** 根据 Variant ID 解析计划 */
export function planFromVariantId(variantId: string | number | null | undefined): Plan {
  if (variantId == null) return "FREE";
  const id = String(variantId);
  if (id === process.env.LEMONSQUEEZY_VARIANT_BUSINESS) return "BUSINESS";
  if (id === process.env.LEMONSQUEEZY_VARIANT_PRO) return "PRO";
  return "FREE";
}

/** 获取计划对应的 Variant ID */
export function getVariantIdForPlan(plan: BillablePlan): string | null {
  const envKey = PLAN_CATALOG[plan].variantEnv;
  return process.env[envKey] ?? null;
}
