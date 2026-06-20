import crypto from "node:crypto";
import type { Plan, SubscriptionStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getActiveManualEntitlement, getEffectivePlan } from "@/lib/services/manual-entitlement.service";
import {
  getAppUrl,
  isLemonSqueezyConfigured,
  lemonSqueezyRequest,
  type CheckoutListResponse,
  type CheckoutResponse,
  type SubscriptionListResponse,
  type SubscriptionResponse,
} from "@/lib/lemonsqueezy/client";
import {
  getVariantIdForPlan,
  planFromVariantId,
  type BillablePlan,
} from "@/lib/lemonsqueezy/plans";

/** 当前订阅信息 */
export async function getBillingStatus(userId: string) {
  const subscription = await prisma.subscription.findUnique({
    where: { userId },
  });
  const manualEntitlement = await getActiveManualEntitlement(userId);

  return {
    plan: await getEffectivePlan(userId),
    status: manualEntitlement?.status ?? subscription?.status ?? "ACTIVE",
    currentPeriodEnd: (manualEntitlement?.currentPeriodEnd ?? subscription?.currentPeriodEnd)?.toISOString() ?? null,
    cancelAtPeriodEnd: manualEntitlement?.cancelAtPeriodEnd ?? subscription?.cancelAtPeriodEnd ?? false,
    billingConfigured: isLemonSqueezyConfigured(),
  };
}

/** 创建 Lemon Squeezy Checkout 并返回跳转 URL */
export async function createCheckoutSession(
  userId: string,
  targetPlan: BillablePlan,
  userEmail?: string | null,
  userName?: string | null
) {
  if (!isLemonSqueezyConfigured()) {
    throw new Error("LEMONSQUEEZY_NOT_CONFIGURED");
  }

  const variantId = getVariantIdForPlan(targetPlan);
  const storeId = process.env.LEMONSQUEEZY_STORE_ID;
  if (!variantId || !storeId) {
    throw new Error("LEMONSQUEEZY_VARIANT_NOT_CONFIGURED");
  }

  const appUrl = getAppUrl();

  const result = await lemonSqueezyRequest<CheckoutResponse>("/checkouts", {
    method: "POST",
    jsonBody: {
      data: {
        type: "checkouts",
        attributes: {
          checkout_options: {
            locale: "en",
          },
          checkout_data: {
            email: userEmail ?? undefined,
            name: userName ?? undefined,
            custom: { user_id: userId, target_plan: targetPlan },
          },
          product_options: {
            redirect_url: `${appUrl}/settings/billing?success=1`,
            receipt_button_text: "Back to app",
            receipt_link_url: `${appUrl}/dashboard`,
          },
        },
        relationships: {
          store: {
            data: { type: "stores", id: storeId },
          },
          variant: {
            data: { type: "variants", id: variantId },
          },
        },
      },
    },
  });

  const url = result.data.attributes.url;
  if (!url) throw new Error("CHECKOUT_URL_FAILED");
  return { url, checkoutId: result.data.id };
}

/** 打开 Lemon Squeezy 客户订阅管理页 */
export async function createPortalSession(userId: string) {
  if (!isLemonSqueezyConfigured()) {
    throw new Error("LEMONSQUEEZY_NOT_CONFIGURED");
  }

  const local = await prisma.subscription.findUnique({ where: { userId } });
  if (!local?.lemonSqueezySubscriptionId) {
    throw new Error("NO_LEMONSQUEEZY_SUBSCRIPTION");
  }

  const result = await lemonSqueezyRequest<SubscriptionResponse>(
    `/subscriptions/${local.lemonSqueezySubscriptionId}`
  );

  const portalUrl = result.data.attributes.urls.customer_portal;
  if (!portalUrl) throw new Error("PORTAL_URL_UNAVAILABLE");
  return { url: portalUrl };
}

function mapLsStatus(status: string, cancelled: boolean): SubscriptionStatus {
  if (cancelled) return "CANCELED";
  const map: Record<string, SubscriptionStatus> = {
    active: "ACTIVE",
    on_trial: "TRIALING",
    paused: "PAUSED",
    past_due: "PAST_DUE",
    unpaid: "UNPAID",
    cancelled: "CANCELED",
    expired: "CANCELED",
  };
  return map[status] ?? "ACTIVE";
}

/** 根据 checkout 创建时间匹配对应的 LS 订阅（支付时邮箱可能被修改） */
async function matchSubscriptionAfterCheckout(
  checkout: CheckoutListResponse["data"][number],
  storeId: string
): Promise<string | null> {
  const checkoutTime = new Date(checkout.attributes.created_at).getTime();
  const variantId = checkout.attributes.variant_id;

  const subs = await lemonSqueezyRequest<SubscriptionListResponse>(
    `/subscriptions?filter[store_id]=${storeId}&sort=-createdAt&page[size]=30`
  );

  const match = subs.data.find(
    (s) =>
      ["active", "on_trial"].includes(s.attributes.status) &&
      s.attributes.variant_id === variantId &&
      new Date(s.attributes.created_at).getTime() >= checkoutTime - 60_000
  );
  return match?.id ?? null;
}

/** 查找用户对应的 Lemon Squeezy 订阅 ID */
async function findSubscriptionIdForUser(
  userId: string,
  userEmail?: string | null,
  checkoutId?: string | null
): Promise<string | null> {
  const storeId = process.env.LEMONSQUEEZY_STORE_ID;
  if (!storeId) return null;

  // 支付返回页携带 checkoutId 时优先匹配
  if (checkoutId) {
    const checkout = await lemonSqueezyRequest<CheckoutResponse>(
      `/checkouts/${checkoutId}`
    );
    const customUserId = checkout.data.attributes.checkout_data?.custom?.user_id;
    if (customUserId === userId) {
      const subId = await matchSubscriptionAfterCheckout(checkout.data, storeId);
      if (subId) return subId;
    }
  }

  // 通过 checkout custom user_id 匹配（邮箱在支付页被改掉时仍能关联）
  const checkouts = await lemonSqueezyRequest<CheckoutListResponse>(
    `/checkouts?filter[store_id]=${storeId}&page[size]=50&sort=-createdAt`
  );
  const userCheckout = checkouts.data.find(
    (c) => c.attributes.checkout_data?.custom?.user_id === userId
  );
  if (userCheckout) {
    const subId = await matchSubscriptionAfterCheckout(userCheckout, storeId);
    if (subId) return subId;
  }

  // 按登录邮箱查找最新有效订阅
  if (userEmail) {
    const list = await lemonSqueezyRequest<SubscriptionListResponse>(
      `/subscriptions?filter[store_id]=${storeId}&filter[user_email]=${encodeURIComponent(userEmail)}&sort=-createdAt`
    );
    const active = list.data.find((s) =>
      ["active", "on_trial"].includes(s.attributes.status)
    );
    if (active) return active.id;
  }

  return null;
}

/** 从 Lemon Squeezy 订阅对象同步到数据库 */
export async function syncFromLemonSqueezySubscription(
  subscriptionId: string,
  userIdHint?: string | null
) {
  const result = await lemonSqueezyRequest<SubscriptionResponse>(
    `/subscriptions/${subscriptionId}`
  );

  const attrs = result.data.attributes;
  const variantId = String(attrs.variant_id);
  const plan = planFromVariantId(variantId);

  const isActive = ["active", "on_trial"].includes(attrs.status);
  const effectivePlan: Plan = isActive ? plan : "FREE";

  let userId = userIdHint ?? null;

  if (!userId) {
    const bySub = await prisma.subscription.findFirst({
      where: { lemonSqueezySubscriptionId: subscriptionId },
      select: { userId: true },
    });
    userId = bySub?.userId ?? null;
  }

  if (!userId) return;

  const periodEnd = attrs.renews_at
    ? new Date(attrs.renews_at)
    : attrs.ends_at
      ? new Date(attrs.ends_at)
      : null;

  await prisma.subscription.upsert({
    where: { userId },
    update: {
      plan: effectivePlan,
      status: mapLsStatus(attrs.status, attrs.cancelled),
      lemonSqueezySubscriptionId: subscriptionId,
      lemonSqueezyCustomerId: String(attrs.customer_id),
      lemonSqueezyVariantId: variantId,
      currentPeriodEnd: periodEnd,
      cancelAtPeriodEnd: attrs.cancelled && isActive,
      canceledAt:
        !isActive && attrs.ends_at ? new Date(attrs.ends_at) : null,
      // LS 同步成功后清除历史 Stripe 测试数据
      stripeCustomerId: null,
      stripeSubscriptionId: null,
      stripePriceId: null,
    },
    create: {
      userId,
      plan: effectivePlan,
      status: mapLsStatus(attrs.status, attrs.cancelled),
      lemonSqueezySubscriptionId: subscriptionId,
      lemonSqueezyCustomerId: String(attrs.customer_id),
      lemonSqueezyVariantId: variantId,
      currentPeriodEnd: periodEnd,
      cancelAtPeriodEnd: attrs.cancelled && isActive,
    },
  });
}

/** 判断是否为 Lemon Squeezy 404 错误（订阅 ID 不属于当前 API Key 所在店）
 * 出现场景：用户换了 LS 账号 / 重建 store / sub 已被删
 * 处理策略：清掉本地 stale id，走兜底重新匹配
 */
function isLemonSqueezyNotFound(error: unknown): boolean {
  return (
    error instanceof Error &&
    /Lemon Squeezy API 404/i.test(error.message)
  );
}

async function clearStaleLemonSqueezyLink(userId: string) {
  await prisma.subscription.update({
    where: { userId },
    data: {
      lemonSqueezySubscriptionId: null,
      lemonSqueezyCustomerId: null,
      lemonSqueezyVariantId: null,
    },
  });
}

/** 支付成功页主动同步 */
export async function syncSubscriptionForUser(
  userId: string,
  checkoutId?: string | null
) {
  if (!isLemonSqueezyConfigured()) {
    throw new Error("LEMONSQUEEZY_NOT_CONFIGURED");
  }

  const local = await prisma.subscription.findUnique({ where: { userId } });

  if (local?.lemonSqueezySubscriptionId) {
    try {
      await syncFromLemonSqueezySubscription(
        local.lemonSqueezySubscriptionId,
        userId
      );
      return getBillingStatus(userId);
    } catch (error) {
      if (!isLemonSqueezyNotFound(error)) throw error;
      console.warn(
        "[billing sync] stale lemonSqueezySubscriptionId detected, clearing and falling back:",
        local.lemonSqueezySubscriptionId
      );
      await clearStaleLemonSqueezyLink(userId);
      // 继续走下面的兜底匹配流程
    }
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true },
  });

  const subscriptionId = await findSubscriptionIdForUser(
    userId,
    user?.email,
    checkoutId
  );
  if (subscriptionId) {
    await syncFromLemonSqueezySubscription(subscriptionId, userId);
  }

  return getBillingStatus(userId);
}

/** 验证 Webhook 签名 */
export function verifyLemonSqueezyWebhook(rawBody: string, signature: string | null): boolean {
  const secret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET;
  if (!secret || !signature) return false;

  const digest = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  try {
    return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(signature));
  } catch {
    return digest === signature;
  }
}

type LemonSqueezyWebhookPayload = {
  meta: {
    event_name: string;
    custom_data?: { user_id?: string; target_plan?: string };
  };
  data: {
    type: string;
    id: string;
    attributes?: {
      customer_id?: number;
      variant_id?: number;
      status?: string;
      cancelled?: boolean;
      renews_at?: string | null;
      ends_at?: string | null;
    };
  };
};

/** 处理 Lemon Squeezy Webhook */
export async function handleLemonSqueezyWebhook(payload: LemonSqueezyWebhookPayload) {
  const event = payload.meta.event_name;
  const userId = payload.meta.custom_data?.user_id;

  const subscriptionEvents = [
    "subscription_created",
    "subscription_updated",
    "subscription_resumed",
    "subscription_payment_success",
  ];

  const cancelEvents = [
    "subscription_cancelled",
    "subscription_expired",
  ];

  if (subscriptionEvents.includes(event) && payload.data.type === "subscriptions") {
    await syncFromLemonSqueezySubscription(payload.data.id, userId);

    // subscription_created 时写入 customer_id，便于 sync 兜底
    if (userId && payload.data.attributes?.customer_id) {
      await prisma.subscription.upsert({
        where: { userId },
        update: {
          lemonSqueezyCustomerId: String(payload.data.attributes.customer_id),
        },
        create: {
          userId,
          lemonSqueezyCustomerId: String(payload.data.attributes.customer_id),
        },
      });
    }
    return;
  }

  if (cancelEvents.includes(event) && payload.data.type === "subscriptions") {
    await syncFromLemonSqueezySubscription(payload.data.id, userId);
  }
}

/** 降级为 Free */
export async function downgradeUserToFree(userId: string) {
  await prisma.subscription.updateMany({
    where: { userId },
    data: {
      plan: "FREE",
      status: "CANCELED",
      lemonSqueezySubscriptionId: null,
      lemonSqueezyVariantId: null,
      cancelAtPeriodEnd: false,
      currentPeriodEnd: null,
      currentPeriodStart: null,
    },
  });
}
